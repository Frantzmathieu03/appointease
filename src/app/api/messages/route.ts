import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { notifyNewMessage } from "@/lib/dispatch";
import { sendNativePush } from "@/lib/native-push";
import { ensureCustomerProfile } from "@/lib/profile";
import { logCustomerEvent } from "@/lib/events";

// POST /api/messages  { businessId, customerId?, body }
// Sends one chat message in a (business, customer) thread.
// - A signed-in customer messages as themselves (customerId is ignored —
//   it is always their own id).
// - A business owner replies from the dashboard (customerId names the
//   thread; ownership is verified against the business row).
// After the insert, the notification dispatcher alerts the other side
// (email / SMS / push, once per unread burst) and logs every attempt.
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Demo mode — messaging turns on when the live database is connected." },
      { status: 400 }
    );
  }
  const body = await req.json().catch(() => null);
  const businessId: string = body?.businessId ?? "";
  const text: string = (body?.body ?? "").trim();
  if (!businessId || !text) {
    return NextResponse.json({ error: "businessId and body are required" }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  const session = await createServerSupabase();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: business } = await admin
    .from("businesses")
    .select("id, name, slug, email, phone, owner_id")
    .eq("id", businessId)
    .single();
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const isOwner = business.owner_id === user.id;
  const customerId: string = isOwner ? body?.customerId ?? "" : user.id;
  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }

  if (!isOwner) {
    // A customer can only message as themselves, and only about a real
    // relationship: create the tenant link if this is their first contact.
    await ensureCustomerProfile(session, user);
  }

  const { data: customer } = await admin
    .from("customers")
    .select("id, full_name, email, phone")
    .eq("id", customerId)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  await admin
    .from("business_customers")
    .upsert(
      { business_id: businessId, customer_id: customerId },
      { onConflict: "business_id,customer_id", ignoreDuplicates: true }
    );

  const sender = isOwner ? "business" : "customer";
  const { data: message, error } = await admin
    .from("messages")
    .insert({ business_id: businessId, customer_id: customerId, sender, body: text })
    .select("*")
    .single();
  if (error || !message) {
    return NextResponse.json({ error: "Message failed to send." }, { status: 500 });
  }

  // Timeline: count-level only — message bodies are never copied into
  // the event log (migration 0010).
  await logCustomerEvent(admin, {
    businessId,
    customerId,
    type: "message",
    actorType: isOwner ? "team_member" : "customer",
    actorId: user.id,
    details: { count: 1, sender },
  });

  // Alert the other side — failures here never fail the message itself;
  // every attempt is recorded in notifications_log by the dispatcher.
  try {
    await notifyNewMessage(admin, {
      business,
      customer,
      sender: sender as "customer" | "business",
      body: text,
    });
  } catch (err) {
    console.error("notifyNewMessage failed:", err);
  }

  // Native app push (app build phase 1): customer messages also reach
  // the owner/team phones. Business replies are not pushed — customers
  // use their booking link, not the app. Env-gated; the helper applies
  // the toggles, the staff rule, and law-office title-only previews.
  if (sender === "customer") {
    try {
      const snippet = text.length > 140 ? text.slice(0, 140) + "…" : text;
      await sendNativePush(admin, {
        businessId,
        kind: "new_message",
        title: `New message from ${customer.full_name || "a customer"}`,
        body: snippet,
        data: {
          type: "new_message",
          customerId,
          url: `/owner/dashboard/inbox/${customerId}`,
        },
        customerId,
      });
    } catch (err) {
      console.error("sendNativePush (new_message) failed:", err);
    }
  }

  return NextResponse.json({ ok: true, message });
}
