// Reminder engine.
//
// Rules (owner spec, 2026-11-24):
//  - Every confirmed appointment gets a CONFIRMATION at booking time,
//    then a reminder 24 HOURS before and again 2 HOURS before: 
//    each by BOTH email and SMS, when those times are still ahead.
//  - Every reminder names the business, the appointment time, the location,
//    and a secure manage link (reschedule / cancel).
//  - Reschedule: pending reminders are cancelled and re-created for the
//    new time. Cancel: pending reminders are cancelled, nothing more sends.
//
// This module schedules rows in public.reminders and processes due rows.
// Processing is triggered by GET /api/cron/reminders (see
// src/app/api/cron/reminders/route.ts): point any scheduler at it:
// Vercel Cron (vercel.json), Supabase pg_cron + pg_net, or an external
// pinger. A Supabase Edge Function version of the same processor lives in
// supabase/functions/reminders/ for projects that prefer it there.

import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchEmail, dispatchSms } from "./dispatch";
import { formatDateInZone, formatTimeInZone } from "./slots";

const HOUR = 3600000;

interface AppointmentRow {
  id: string;
  starts_at: string;
  status: string;
  manage_token: string;
  confirmation_code: string | null;
  businesses: {
    name: string;
    address: string | null;
    timezone: string;
    slug: string;
  } | null;
  customers: { full_name: string; email: string | null; phone: string | null } | null;
  services: { name: string } | null;
}

/**
 * Create the full reminder set for an appointment. Safe to call repeatedly:
 * the unique (appointment_id, kind, channel) constraint + upsert means no
 * duplicates. Past-due reminder times (e.g. booking made 1h before the
 * appointment) are simply not created: "when those times are still ahead".
 */
export async function scheduleReminders(
  admin: SupabaseClient,
  appointmentId: string,
  startsAt: Date
) {
  const now = Date.now();
  const rows: {
    appointment_id: string;
    kind: string;
    channel: string;
    scheduled_at: string;
  }[] = [];

  const push = (kind: string, at: number) => {
    for (const channel of ["email", "sms"] as const) {
      rows.push({
        appointment_id: appointmentId,
        kind,
        channel,
        scheduled_at: new Date(at).toISOString(),
      });
    }
  };

  push("confirmation", now);
  const at24 = startsAt.getTime() - 24 * HOUR;
  if (at24 > now) push("before_24h", at24);
  const at2 = startsAt.getTime() - 2 * HOUR;
  if (at2 > now) push("before_2h", at2);

  if (rows.length > 0) {
    await admin
      .from("reminders")
      .upsert(rows, { onConflict: "appointment_id,kind,channel", ignoreDuplicates: true });
  }
}

/** Stop every still-pending reminder for an appointment. */
export async function cancelReminders(admin: SupabaseClient, appointmentId: string) {
  await admin
    .from("reminders")
    .update({ status: "cancelled" })
    .eq("appointment_id", appointmentId)
    .eq("status", "pending");
}

/** Reschedule = cancel the old pending set, build the new one. */
export async function rescheduleReminders(
  admin: SupabaseClient,
  appointmentId: string,
  newStartsAt: Date
) {
  await cancelReminders(admin, appointmentId);
  await scheduleReminders(admin, appointmentId, newStartsAt);
}

function reminderCopy(kind: string, a: AppointmentRow): { subject: string; body: string } {
  const biz = a.businesses;
  const tz = biz?.timezone ?? "America/New_York";
  const when = `${formatDateInZone(new Date(a.starts_at), tz)} at ${formatTimeInZone(new Date(a.starts_at), tz)}`;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://appointease.io";
  const manageUrl = `${site}/manage/${a.manage_token}`;
  const service = a.services?.name ?? "appointment";
  const firstName = (a.customers?.full_name ?? "").split(" ")[0] || "there";
  const refLine = a.confirmation_code ? `\nConfirmation #: ${a.confirmation_code}` : "";

  if (kind === "confirmation") {
    return {
      subject: `You're booked: ${service} at ${biz?.name} for ${when}`,
      body:
        `Hi ${firstName},\n\n` +
        `Your appointment is confirmed.\n\n` +
        `${service} at ${biz?.name}\n${when}\n${biz?.address ?? ""}${refLine}\n\n` +
        `Need to change it? Reschedule or cancel here: ${manageUrl}\n\n` +
        `We look forward to seeing you.\n${biz?.name} (via AppointEase)`,
    };
  }
  const lead = kind === "before_24h" ? "tomorrow" : "in about 2 hours";
  return {
    subject: `Reminder: ${service} at ${biz?.name} ${lead}`,
    body:
      `Hi ${firstName},\n\n` +
      `Just a friendly reminder: you have an appointment ${lead}.\n\n` +
      `${service} at ${biz?.name}\n${when}\n${biz?.address ?? ""}${refLine}\n\n` +
      `Please arrive a few minutes early. If something has come up, you can ` +
      `reschedule or cancel here: ${manageUrl}\n\n` +
      `We look forward to seeing you.\n${biz?.name} (via AppointEase)`,
  };
}

/**
 * Send every due pending reminder. Returns a summary; each row is marked
 * sent / skipped / failed honestly based on the provider result.
 */
export async function processDueReminders(admin: SupabaseClient) {
  const { data: due, error } = await admin
    .from("reminders")
    .select(
      `id, kind, channel,
       appointments:appointment_id (
         id, starts_at, status, manage_token, confirmation_code,
         businesses:business_id ( name, address, timezone, slug ),
         customers:customer_id ( full_name, email, phone ),
         services:service_id ( name )
       )`
    )
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(100);

  if (error) throw error;

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of due ?? []) {
    const appt = (row as unknown as { appointments: AppointmentRow }).appointments;
    let status: "sent" | "skipped" | "failed" = "skipped";
    let detail = "";

    if (!appt || appt.status !== "confirmed") {
      status = "skipped";
      detail = "Appointment no longer confirmed.";
    } else {
      const { subject, body } = reminderCopy(row.kind, appt);
      if (row.channel === "email") {
        const to = appt.customers?.email;
        if (!to) {
          detail = "Customer has no email on file.";
        } else {
          const r = await dispatchEmail({ to, subject, text: body });
          status = r.status === "failed" ? "failed" : r.delivered ? "sent" : "skipped";
          detail = r.detail;
        }
      } else {
        const to = appt.customers?.phone;
        if (!to) {
          detail = "Customer has no phone on file.";
        } else {
          // SMS gets the short form of the same copy.
          const r = await dispatchSms({ to, body: `${subject}. ${body.split("\n\n")[2] ?? ""} Manage: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://appointease.io"}/manage/${appt.manage_token}` });
          if (r.status === "sms_pending_provider") {
            status = "skipped";
            detail = `sms_pending_provider: ${r.detail}`;
          } else {
            status = r.status === "failed" ? "failed" : r.delivered ? "sent" : "skipped";
            detail = r.detail;
          }
        }
      }
    }

    if (status === "sent") sent++;
    else if (status === "failed") failed++;
    else skipped++;

    await admin
      .from("reminders")
      .update({ status, detail, sent_at: status === "sent" ? new Date().toISOString() : null })
      .eq("id", row.id);
  }

  return { processed: (due ?? []).length, sent, skipped, failed };
}
