// Notification dispatcher: the single door every off-screen alert goes
// through (owner directive, 2026-11-24):
//
//  - Email sends through Resend (RESEND_API_KEY, EMAIL_FROM: see notify.ts).
//  - SMS sends through Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
//    TWILIO_FROM_NUMBER). When that env is absent the dispatcher does NOT
//    send and reports status "sms_pending_provider": the other channels
//    still go out. Nothing is ever reported as sent that was not accepted
//    by a real provider.
//  - Web Push sends when VAPID keys are configured; otherwise it is
//    recorded as skipped (env-gated), never faked.
//  - Appointment reminders route through dispatchEmail / dispatchSms too
//    (see reminders.ts) and keep their audit rows in public.reminders.
//  - New-message alerts go through notifyNewMessage(), which writes one
//    audit row per channel attempt into public.notifications_log.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, sendSms } from "./notify";
import { pushConfigured, sendPushToSubscription, type StoredSubscription } from "./push";

export interface DispatchResult {
  delivered: boolean;
  status: string; // sent | skipped | failed | sms_pending_provider
  detail: string;
}

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

export async function dispatchEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<DispatchResult> {
  const r = await sendEmail(opts);
  return {
    delivered: r.delivered,
    status: r.delivered ? "sent" : r.detail.includes("responded") ? "failed" : "skipped",
    detail: r.detail,
  };
}

export async function dispatchSms(opts: {
  to: string;
  body: string;
}): Promise<DispatchResult> {
  if (!smsConfigured()) {
    return {
      delivered: false,
      status: "sms_pending_provider",
      detail:
        "SMS provider not configured yet (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER missing). No SMS sent.",
    };
  }
  const r = await sendSms(opts);
  return {
    delivered: r.delivered,
    status: r.delivered ? "sent" : r.detail.includes("responded") ? "failed" : "skipped",
    detail: r.detail,
  };
}

// ---------------------------------------------------------------------------
// New-message alerts
// ---------------------------------------------------------------------------

export interface MessageParties {
  business: {
    id: string;
    name: string;
    slug: string;
    email: string | null;
    phone: string | null;
    owner_id: string;
  };
  customer: { id: string; full_name: string; email: string | null; phone: string | null };
  sender: "customer" | "business";
  body: string;
}

async function logAttempt(
  admin: SupabaseClient,
  row: {
    business_id: string;
    customer_id: string;
    recipient_user_id: string;
    channel: "email" | "sms" | "push";
    recipient: string | null;
    status: string;
    detail: string;
  }
) {
  await admin.from("notifications_log").insert({ kind: "new_message", ...row });
}

/**
 * Alert the other side of a thread about a new message.
 *
 * Burst rule: alerts fire only on the FIRST unread message of a burst
 * (when the recipient's unread count for this thread is exactly 1 after
 * the insert). Further messages while earlier ones are still unread are
 * recorded once as "burst_suppressed": one alert per burst, no spam.
 */
export async function notifyNewMessage(admin: SupabaseClient, p: MessageParties) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://appointease.io";
  const recipientIsOwner = p.sender === "customer";
  const recipientUserId = recipientIsOwner ? p.business.owner_id : p.customer.id;

  const { count } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("business_id", p.business.id)
    .eq("customer_id", p.customer.id)
    .eq("sender", p.sender)
    .is("read_at", null);
  const unread = count ?? 1;

  if (unread > 1) {
    await logAttempt(admin, {
      business_id: p.business.id,
      customer_id: p.customer.id,
      recipient_user_id: recipientUserId,
      channel: "email",
      recipient: null,
      status: "burst_suppressed",
      detail: `${unread} unread messages in this thread. One alert per burst.`,
    });
    return { alerted: false, unread };
  }

  const senderName = recipientIsOwner ? p.customer.full_name || "A customer" : p.business.name;
  const link = recipientIsOwner
    ? `${site}/owner/dashboard/inbox/${p.customer.id}`
    : `${site}/${p.business.slug}/message`;
  const snippet = p.body.length > 140 ? p.body.slice(0, 140) + "…" : p.body;

  // --- Email -------------------------------------------------------------
  let emailTo: string | null = recipientIsOwner ? p.business.email : p.customer.email;
  if (recipientIsOwner && !emailTo) {
    const { data } = await admin.auth.admin.getUserById(p.business.owner_id);
    emailTo = data?.user?.email ?? null;
  }
  if (!emailTo) {
    await logAttempt(admin, {
      business_id: p.business.id,
      customer_id: p.customer.id,
      recipient_user_id: recipientUserId,
      channel: "email",
      recipient: null,
      status: "skipped",
      detail: "Recipient has no email address on file.",
    });
  } else {
    const r = await dispatchEmail({
      to: emailTo,
      subject: `New message from ${senderName} on AppointEase`,
      text:
        `You have ${unread} unread message${unread === 1 ? "" : "s"} on AppointEase.\n\n` +
        `${senderName}: "${snippet}"\n\n` +
        `Reply here: ${link}\n`,
    });
    await logAttempt(admin, {
      business_id: p.business.id,
      customer_id: p.customer.id,
      recipient_user_id: recipientUserId,
      channel: "email",
      recipient: emailTo,
      status: r.status,
      detail: r.detail,
    });
  }

  // --- SMS (env-gated; plugs in fully when Twilio env lands) -------------
  const phoneTo = recipientIsOwner ? p.business.phone : p.customer.phone;
  if (!phoneTo) {
    await logAttempt(admin, {
      business_id: p.business.id,
      customer_id: p.customer.id,
      recipient_user_id: recipientUserId,
      channel: "sms",
      recipient: null,
      status: "skipped",
      detail: "Recipient has no phone number on file.",
    });
  } else {
    const r = await dispatchSms({
      to: phoneTo,
      body: `AppointEase: new message from ${senderName}: "${snippet}" Reply: ${link}`,
    });
    await logAttempt(admin, {
      business_id: p.business.id,
      customer_id: p.customer.id,
      recipient_user_id: recipientUserId,
      channel: "sms",
      recipient: phoneTo,
      status: r.status,
      detail: r.detail,
    });
  }

  // --- Web Push (env-gated on VAPID keys) --------------------------------
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", recipientUserId);

  if (!subs || subs.length === 0) {
    await logAttempt(admin, {
      business_id: p.business.id,
      customer_id: p.customer.id,
      recipient_user_id: recipientUserId,
      channel: "push",
      recipient: null,
      status: "skipped",
      detail: "Recipient has no push subscription on any device.",
    });
  } else if (!pushConfigured()) {
    await logAttempt(admin, {
      business_id: p.business.id,
      customer_id: p.customer.id,
      recipient_user_id: recipientUserId,
      channel: "push",
      recipient: null,
      status: "skipped",
      detail:
        "Web Push env gated: NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not configured. No push sent.",
    });
  } else {
    let anySent = false;
    let lastDetail = "";
    for (const sub of subs as StoredSubscription[]) {
      const r = await sendPushToSubscription(sub, {
        title: `New message from ${senderName}`,
        body: snippet,
        url: link,
      });
      anySent = anySent || r.delivered;
      lastDetail = r.detail;
      if (r.gone) {
        await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
    await logAttempt(admin, {
      business_id: p.business.id,
      customer_id: p.customer.id,
      recipient_user_id: recipientUserId,
      channel: "push",
      recipient: `${subs.length} subscription(s)`,
      status: anySent ? "sent" : "failed",
      detail: lastDetail,
    });
  }

  return { alerted: true, unread };
}
