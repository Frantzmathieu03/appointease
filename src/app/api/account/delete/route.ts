import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSupabase,
  createServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { cancelReminders } from "@/lib/reminders";
import { sendNativePush } from "@/lib/native-push";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";

// POST /api/account/delete: in app account deletion (Apple App
// Store guideline 5.1.1(v): an app that lets people create an
// account must let them delete it inside the app, with no support
// email in the loop). The session is the only credential: the route
// deletes the SIGNED IN user's own account and nothing else, and
// the body must carry { confirm: true } so a stray request can
// never do it by accident. The two confirm steps live in the UI
// (DeleteAccountButton); this route is the final one.
//
// Order of work, chosen so nothing is left charging or waiting:
//   1. Any business this user owns: its Stripe subscription is
//      cancelled first, while the business still exists. If Stripe
//      refuses, the deletion stops and says so, rather than leaving
//      a live subscription behind on a deleted account.
//   2. The user's own future appointments, at every business they
//      are a customer of, are cancelled the same way the manage
//      link cancels: the slot frees, the pending reminders stop,
//      and the business gets the same cancellation push it would
//      get from a normal cancel, so nobody is stood up.
//   3. The user's messages and form submissions are deleted.
//   4. The auth user is deleted. The schema carries the rest:
//      the customers row, owned businesses and everything under
//      them, team memberships, device tokens, notification prefs,
//      and push subscriptions all hang off the auth user or the
//      business with ON DELETE CASCADE (audited in
//      APP_STORE_PREP.md and proven by the verification harness).
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Demo mode. Accounts turn on with the live database." },
      { status: 400 }
    );
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || body.confirm !== true) {
    return NextResponse.json(
      { error: "Deletion was not confirmed." },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = createAdminSupabase();

  // 1. Owned businesses: cancel any live Stripe subscription first.
  const { data: owned } = await admin
    .from("businesses")
    .select("id, stripe_subscription_id, subscription_status")
    .eq("owner_id", user.id);
  const stripe = getStripe();
  for (const biz of owned ?? []) {
    const subId = biz.stripe_subscription_id as string | null;
    const status = biz.subscription_status as string | null;
    const live =
      !!subId &&
      (status === null ||
        ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(status));
    if (!live) continue;
    if (!stripe) {
      // Billing is not configured in this environment, so there is
      // no live Stripe side to cancel against. Production carries
      // the key; never trap the person in an undeletable account
      // over an environment gap.
      console.error(
        `account delete: business ${biz.id} carries subscription ${subId} but Stripe is not configured here; proceeding`
      );
      continue;
    }
    try {
      await stripe.subscriptions.cancel(subId as string);
    } catch (err) {
      console.error("account delete: subscription cancel failed:", err);
      return NextResponse.json(
        {
          error:
            "We could not cancel your subscription, so nothing was deleted. Please try again in a moment.",
        },
        { status: 502 }
      );
    }
  }

  // 2. The user's future appointments as a customer: cancel each
  //    one properly (slot frees, reminders stop, business hears).
  const { data: future } = await admin
    .from("appointments")
    .select("id, business_id, service_id, starts_at")
    .eq("customer_id", user.id)
    .eq("status", "confirmed")
    .gt("starts_at", new Date().toISOString());
  for (const appt of future ?? []) {
    // cancelled_by arrives with migration 0010; the fallback keeps
    // the cancel working on the pre-0010 column set, the same
    // pattern the manage route uses.
    let { error } = await admin
      .from("appointments")
      .update({
        status: "cancelled",
        cancellation_reason: "Account deleted",
        cancelled_by: "customer",
      })
      .eq("id", appt.id);
    if (error) {
      ({ error } = await admin
        .from("appointments")
        .update({ status: "cancelled", cancellation_reason: "Account deleted" })
        .eq("id", appt.id));
    }
    if (error) {
      console.error("account delete: appointment cancel failed:", error);
      return NextResponse.json(
        { error: "We could not cancel everything, so nothing was deleted. Please try again in a moment." },
        { status: 500 }
      );
    }
    await cancelReminders(admin, appt.id);
    // The same cancellation push a normal cancel sends (native app
    // phase 1): env gated, a silent no-op until push credentials
    // exist, and never allowed to fail the deletion.
    try {
      const [{ data: biz }, { data: cust }, { data: svc }] = await Promise.all([
        admin.from("businesses").select("timezone").eq("id", appt.business_id).single(),
        admin.from("customers").select("full_name").eq("id", user.id).single(),
        admin.from("services").select("name").eq("id", appt.service_id).single(),
      ]);
      const tz = (biz?.timezone as string | undefined) ?? "America/New_York";
      const when = `${formatDateInZone(new Date(appt.starts_at), tz)} · ${formatTimeInZone(new Date(appt.starts_at), tz)}`;
      await sendNativePush(admin, {
        businessId: appt.business_id,
        kind: "cancelled",
        title: "Appointment cancelled",
        body: `${cust?.full_name || "A customer"} cancelled ${svc?.name ?? "their appointment"} · ${when}`,
        data: {
          type: "cancelled",
          appointmentId: appt.id,
          customerId: user.id,
          url: "/owner/dashboard/calendar",
        },
        customerId: user.id,
      });
    } catch (err) {
      console.error("account delete: cancellation push failed:", err);
    }
  }

  // 3. The user's messages and form submissions go with the account.
  await admin.from("messages").delete().eq("customer_id", user.id);
  await admin.from("form_submissions").delete().eq("customer_id", user.id);

  // 4. Delete the auth user. Cascades carry the rest (see header).
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("account delete: deleteUser failed:", deleteError);
    return NextResponse.json(
      { error: "Deleting the account failed. Please try again in a moment." },
      { status: 500 }
    );
  }

  // Clear the now dead session cookies on the way out (best effort:
  // the account is gone either way, and the UI signs out locally too).
  try {
    await supabase.auth.signOut();
  } catch {
    // Nothing left to sign out of.
  }

  return NextResponse.json({ ok: true });
}
