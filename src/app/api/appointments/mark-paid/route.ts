import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/owner";
import { createAdminSupabase } from "@/lib/supabase";

// Mark paid (revised Dashboard Changes PDF, 2026-11-26): the front
// desk marks that the customer paid AT THE OFFICE. This is offline
// bookkeeping only — no money moves through AppointEase. The mark is
// a 'marked_paid' row on the customer's timeline (migration 0015
// widens the event-type check; until it lands this route answers a
// plain not-yet note and saves nothing). Any signed-in team member of
// the business may mark (owner, manager, staff — the front desk),
// which is why the write goes through the service role after the
// membership check in requireBusiness: the 0010 insert policy on
// customer_events is owner-only.
export async function POST(req: Request) {
  const { supabase, user, business } = await requireBusiness();

  let body: { appointmentId?: unknown; amountCents?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const appointmentId =
    typeof body.appointmentId === "string" ? body.appointmentId : "";
  const amountCents =
    typeof body.amountCents === "number" && Number.isFinite(body.amountCents)
      ? Math.round(body.amountCents)
      : NaN;
  if (!appointmentId || !(amountCents > 0)) {
    return NextResponse.json(
      { error: "Enter the amount they paid at the office." },
      { status: 400 }
    );
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, customer_id, status")
    .eq("id", appointmentId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!appt) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }
  if ((appt as { status: string }).status === "cancelled") {
    return NextResponse.json(
      { error: "This appointment was cancelled — there's nothing to mark paid." },
      { status: 400 }
    );
  }

  const markedBy =
    ((user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      "") ||
    (user.email ? user.email.split("@")[0] : "") ||
    "the team";

  const admin = createAdminSupabase();
  const { error } = await admin.from("customer_events").insert({
    business_id: business.id,
    customer_id: (appt as { customer_id: string }).customer_id,
    appointment_id: appointmentId,
    type: "marked_paid",
    actor_type: "team_member",
    actor_id: user.id,
    details: { amount_cents: amountCents, marked_by_name: markedBy },
  });
  if (error) {
    return NextResponse.json(
      {
        error:
          "Marking paid turns on with the next update — nothing was saved. Try again shortly.",
      },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true });
}
