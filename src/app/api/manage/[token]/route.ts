import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { cancelReminders, rescheduleReminders } from "@/lib/reminders";
import { logCustomerEvent } from "@/lib/events";

// Secure manage link from reminder messages: /manage/<token>
// GET                                  — appointment details for the page
// POST { action: "cancel", reason? }   — frees the slot, stops reminders
// POST { action: "reschedule", startsAt } — moves the appointment,
//      re-times its reminders. The token itself is the credential.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Demo mode — nothing to manage yet." }, { status: 400 });
  }
  const { token } = await params;
  const admin = createAdminSupabase();
  const { data: appt } = await admin
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, staff_id, service_id, confirmation_code, businesses:business_id ( name, slug, address, timezone ), services:service_id ( name, duration_minutes ), customers:customer_id ( full_name )"
    )
    .eq("manage_token", token)
    .single();
  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  return NextResponse.json({ appointment: appt });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Demo mode — nothing to change yet." }, { status: 400 });
  }
  const { token } = await params;
  const body = await req.json().catch(() => null);
  const admin = createAdminSupabase();

  const { data: appt } = await admin
    .from("appointments")
    .select("id, starts_at, ends_at, status, business_id, customer_id, service_id, services:service_id ( duration_minutes )")
    .eq("manage_token", token)
    .single();
  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  if (appt.status !== "confirmed") {
    return NextResponse.json({ error: "This appointment is no longer active." }, { status: 409 });
  }

  if (body?.action === "cancel") {
    const reason = body.reason ? String(body.reason).slice(0, 200) : null;
    // cancelled_by arrives with migration 0010; until it is applied, fall
    // back to the pre-0010 column set so cancelling never breaks.
    let { error } = await admin
      .from("appointments")
      .update({
        status: "cancelled",
        cancellation_reason: reason,
        cancelled_by: "customer",
      })
      .eq("id", appt.id);
    if (error) {
      ({ error } = await admin
        .from("appointments")
        .update({ status: "cancelled", cancellation_reason: reason })
        .eq("id", appt.id));
    }
    if (error) return NextResponse.json({ error: "Cancel failed" }, { status: 500 });
    await cancelReminders(admin, appt.id);
    await logCustomerEvent(admin, {
      businessId: appt.business_id,
      customerId: appt.customer_id,
      appointmentId: appt.id,
      type: "cancelled",
      actorType: "customer",
      actorId: appt.customer_id,
      details: { reason, was_starts_at: appt.starts_at },
    });
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  if (body?.action === "reschedule") {
    const start = new Date(body.startsAt);
    if (isNaN(start.getTime()) || start.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Pick a future time" }, { status: 400 });
    }
    const duration =
      (appt as unknown as { services: { duration_minutes: number } }).services.duration_minutes;
    const end = new Date(start.getTime() + duration * 60000);
    const { error } = await admin
      .from("appointments")
      .update({ starts_at: start.toISOString(), ends_at: end.toISOString() })
      .eq("id", appt.id);
    if (error) {
      if ((error as { code?: string }).code === "23P01") {
        return NextResponse.json(
          { error: "That time was just taken — please pick another." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Reschedule failed" }, { status: 500 });
    }
    await rescheduleReminders(admin, appt.id, start);
    await logCustomerEvent(admin, {
      businessId: appt.business_id,
      customerId: appt.customer_id,
      appointmentId: appt.id,
      type: "rescheduled",
      actorType: "customer",
      actorId: appt.customer_id,
      details: { from: appt.starts_at, to: start.toISOString() },
    });
    return NextResponse.json({ ok: true, startsAt: start.toISOString() });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
