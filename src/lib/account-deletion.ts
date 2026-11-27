import { createAdminSupabase } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { cancelReminders } from "@/lib/reminders";
import { sendNativePush } from "@/lib/native-push";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";

// Account deletion with a 48 hour grace period (Frantz, 2026-11-27;
// migration 0022). Asking to delete no longer deletes on the spot:
// it records a pending request due 48 hours later. The account
// keeps working normally in the meantime, the person can undo the
// request from the same screens that made it, and the cron
// processor (/api/cron/deletions) carries due requests out.
//
// performAccountDeletion below is the exact deletion the delete
// route used to run immediately, moved here word for word in
// behavior so the processor runs the same steps in the same order:
// owned businesses' Stripe subscriptions cancelled first (and the
// whole thing stops if Stripe refuses), then the person's future
// appointments cancelled properly, then their messages and form
// submissions deleted, then the auth user deleted (the schema
// cascades carry the rest).
//
// Every read and write of account_deletion_requests is feature
// detected: until migration 0022 lands, the helpers report the
// table as not ready and callers answer gracefully, deleting
// nothing (same pattern as migrations 0010 to 0017).

type Admin = ReturnType<typeof createAdminSupabase>;

export const DELETION_GRACE_MS = 48 * 3600 * 1000;

export interface DeletionRequest {
  id: string;
  user_id: string;
  email: string | null;
  requested_at: string;
  due_at: string;
  status: "pending" | "cancelled" | "done";
  processed_at: string | null;
}

interface PgError {
  code?: string;
  message?: string;
}

function tableMissing(error: PgError | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01") return true;
  const msg = error.message ?? "";
  return msg.includes("account_deletion_requests") && /does not exist|schema cache/i.test(msg);
}

/** The caller's pending deletion request, or null. tableReady is
 *  false until migration 0022 lands; callers treat that as "no
 *  request" for reads and as "not available yet" for writes. */
export async function getPendingDeletionRequest(
  admin: Admin,
  userId: string
): Promise<{ request: DeletionRequest | null; tableReady: boolean }> {
  const { data, error } = await admin
    .from("account_deletion_requests")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1);
  if (error) {
    if (tableMissing(error)) return { request: null, tableReady: false };
    console.error("account deletion: pending lookup failed:", error);
    return { request: null, tableReady: true };
  }
  return { request: (data?.[0] as DeletionRequest) ?? null, tableReady: true };
}

/** Record a deletion request due in 48 hours. A person who already
 *  has a pending request gets that same request back; asking twice
 *  never creates a second one and never moves the date. */
export async function createDeletionRequest(
  admin: Admin,
  user: { id: string; email?: string | null }
): Promise<{ request: DeletionRequest | null; tableReady: boolean }> {
  const existing = await getPendingDeletionRequest(admin, user.id);
  if (!existing.tableReady) return { request: null, tableReady: false };
  if (existing.request) return { request: existing.request, tableReady: true };
  const now = new Date();
  const { data, error } = await admin
    .from("account_deletion_requests")
    .insert({
      user_id: user.id,
      email: user.email ?? null,
      requested_at: now.toISOString(),
      due_at: new Date(now.getTime() + DELETION_GRACE_MS).toISOString(),
      status: "pending",
    })
    .select("*")
    .single();
  if (error) {
    if (tableMissing(error)) return { request: null, tableReady: false };
    // The one-pending index can refuse a racing second insert; in
    // that case the winner's row is the answer.
    const again = await getPendingDeletionRequest(admin, user.id);
    if (again.request) return { request: again.request, tableReady: true };
    console.error("account deletion: request insert failed:", error);
    return { request: null, tableReady: true };
  }
  return { request: data as DeletionRequest, tableReady: true };
}

/** Undo the caller's pending request. Returns true when a pending
 *  request was there and is now cancelled. */
export async function cancelDeletionRequest(
  admin: Admin,
  userId: string
): Promise<{ cancelled: boolean; tableReady: boolean }> {
  const { request, tableReady } = await getPendingDeletionRequest(admin, userId);
  if (!tableReady) return { cancelled: false, tableReady: false };
  if (!request) return { cancelled: false, tableReady: true };
  const { error } = await admin
    .from("account_deletion_requests")
    .update({ status: "cancelled" })
    .eq("id", request.id)
    .eq("status", "pending");
  if (error) {
    console.error("account deletion: cancel failed:", error);
    return { cancelled: false, tableReady: true };
  }
  return { cancelled: true, tableReady: true };
}

/** Carry out the deletion itself, exactly the steps and order the
 *  delete route ran before the grace period existed. When the ask
 *  came from a request row, that row is marked done just before the
 *  auth user is deleted (the row then cascades away with the user,
 *  so no personal data stays behind); if the final delete fails,
 *  the row goes back to pending so the processor tries again. */
export async function performAccountDeletion(
  admin: Admin,
  userId: string,
  requestId?: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  // 1. Owned businesses: cancel any live Stripe subscription first.
  const { data: owned } = await admin
    .from("businesses")
    .select("id, stripe_subscription_id, subscription_status")
    .eq("owner_id", userId);
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
        `account deletion: business ${biz.id} carries subscription ${subId} but Stripe is not configured here; proceeding`
      );
      continue;
    }
    try {
      await stripe.subscriptions.cancel(subId as string);
    } catch (err) {
      console.error("account deletion: subscription cancel failed:", err);
      return {
        ok: false,
        error:
          "We could not cancel your subscription, so nothing was deleted. Please try again in a moment.",
        status: 502,
      };
    }
  }

  // 2. The user's future appointments as a customer: cancel each
  //    one properly (slot frees, reminders stop, business hears).
  const { data: future } = await admin
    .from("appointments")
    .select("id, business_id, service_id, starts_at")
    .eq("customer_id", userId)
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
      console.error("account deletion: appointment cancel failed:", error);
      return {
        ok: false,
        error: "We could not cancel everything, so nothing was deleted. Please try again in a moment.",
        status: 500,
      };
    }
    await cancelReminders(admin, appt.id);
    // The same cancellation push a normal cancel sends: env gated,
    // a silent no-op until push credentials exist, and never
    // allowed to fail the deletion.
    try {
      const [{ data: biz }, { data: cust }, { data: svc }] = await Promise.all([
        admin.from("businesses").select("timezone").eq("id", appt.business_id).single(),
        admin.from("customers").select("full_name").eq("id", userId).single(),
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
          customerId: userId,
          url: "/owner/dashboard/calendar",
        },
        customerId: userId,
      });
    } catch (err) {
      console.error("account deletion: cancellation push failed:", err);
    }
  }

  // 3. The user's messages and form submissions go with the account.
  await admin.from("messages").delete().eq("customer_id", userId);
  await admin.from("form_submissions").delete().eq("customer_id", userId);

  // 4. Mark the request done, then delete the auth user. Cascades
  //    carry the rest, including the request row itself.
  if (requestId) {
    await admin
      .from("account_deletion_requests")
      .update({ status: "done", processed_at: new Date().toISOString() })
      .eq("id", requestId);
  }
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("account deletion: deleteUser failed:", deleteError);
    if (requestId) {
      await admin
        .from("account_deletion_requests")
        .update({ status: "pending", processed_at: null })
        .eq("id", requestId);
    }
    return {
      ok: false,
      error: "Deleting the account failed. Please try again in a moment.",
      status: 500,
    };
  }
  return { ok: true };
}

/** The cron processor's sweep: every pending request whose 48
 *  hours are up gets carried out. A request whose deletion stops
 *  (Stripe refused, a step failed) stays pending and is counted as
 *  failed, so the next sweep tries it again. */
export async function processDueDeletionRequests(
  admin: Admin
): Promise<{ processed: number; failed: number; tableReady: boolean }> {
  const { data, error } = await admin
    .from("account_deletion_requests")
    .select("*")
    .eq("status", "pending")
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true })
    .limit(50);
  if (error) {
    if (tableMissing(error)) return { processed: 0, failed: 0, tableReady: false };
    throw error;
  }
  let processed = 0;
  let failed = 0;
  for (const row of (data ?? []) as DeletionRequest[]) {
    const result = await performAccountDeletion(admin, row.user_id, row.id);
    if (result.ok) processed += 1;
    else failed += 1;
  }
  return { processed, failed, tableReady: true };
}
