import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getMembership, getOwnerBusiness } from "@/lib/owner";
import { scheduleReminders } from "@/lib/reminders";
import { generateConfirmationCode } from "@/lib/confirmation";
import { logCustomerEvent } from "@/lib/events";

// POST /api/owner/book — the owner (or a team login) books an appointment
// for a customer from the dashboard (PDF §4: click an empty calendar
// slot / "New appointment"). Body:
//   { businessId, serviceId, staffId, startsAt,
//     customerId }                       — existing customer of the business
//   or { ..., guest: { name, phone, email } }  — brand-new customer
// Slot safety is the same as the public flow: the database exclusion
// constraint makes double-booking impossible (23P01 → 409). The booking
// lands on the customer's timeline as `booked` by a team member.
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Booking isn't available yet." }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { businessId, serviceId, staffId, startsAt, customerId, guest } = body as {
    businessId?: string;
    serviceId?: string;
    staffId?: string | null;
    startsAt?: string;
    customerId?: string;
    guest?: { name?: string; phone?: string; email?: string };
  };
  if (!businessId || !serviceId || !startsAt) {
    return NextResponse.json({ error: "Missing booking details." }, { status: 400 });
  }

  const session = await createServerSupabase();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  // Access: the owner, or an active team member of THIS business.
  const owned = await getOwnerBusiness(session, user.id);
  let allowed = owned?.id === businessId;
  let actorStaffId: string | null = null;
  if (!allowed) {
    const member = await getMembership(session, user.id);
    if (member && member.business_id === businessId) {
      allowed = true;
      actorStaffId = member.staff_id;
    }
  }
  if (!allowed) return NextResponse.json({ error: "Not your business." }, { status: 403 });

  const admin = createAdminSupabase();
  const { data: service } = await admin
    .from("services")
    .select("id, name, duration_minutes")
    .eq("id", serviceId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const start = new Date(startsAt);
  if (isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Pick a future time" }, { status: 400 });
  }
  const end = new Date(start.getTime() + service.duration_minutes * 60000);

  // Staff scope: a staff login can only book onto their own calendar.
  const effectiveStaffId = actorStaffId ?? (staffId || null);
  if (actorStaffId && staffId && staffId !== actorStaffId) {
    return NextResponse.json({ error: "Staff logins book only on their own calendar." }, { status: 403 });
  }

  // Resolve the customer.
  let resolvedCustomerId: string | null = null;
  if (customerId) {
    const { data: rel } = await admin
      .from("business_customers")
      .select("customer_id")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .maybeSingle();
    if (!rel) return NextResponse.json({ error: "That customer doesn't belong to this business." }, { status: 404 });
    resolvedCustomerId = customerId;
  } else if (guest?.email) {
    const email = guest.email.trim().toLowerCase();
    const name = (guest.name ?? "").trim();
    const { data: existing } = await admin
      .from("customers")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();
    if (existing) {
      resolvedCustomerId = existing.id as string;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: crypto.randomUUID() + crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { full_name: name, phone: guest.phone ?? null },
      });
      if (createErr || !created.user) {
        return NextResponse.json({ error: "Could not create that customer — please try again." }, { status: 500 });
      }
      resolvedCustomerId = created.user.id;
      await logCustomerEvent(admin, {
        businessId,
        customerId: resolvedCustomerId,
        type: "registered",
        actorType: "team_member",
        actorId: user.id,
        details: { via: "owner dashboard booking" },
      });
    }
    await admin.from("customers").upsert(
      { id: resolvedCustomerId, full_name: name, email, phone: guest.phone ?? null },
      { onConflict: "id" }
    );
    await admin
      .from("business_customers")
      .upsert(
        { business_id: businessId, customer_id: resolvedCustomerId },
        { onConflict: "business_id,customer_id", ignoreDuplicates: true }
      );
  }
  if (!resolvedCustomerId) {
    return NextResponse.json({ error: "Pick a customer or add a new one." }, { status: 400 });
  }

  let apptId: string | null = null;
  let apptErr: { code?: string } | null = null;
  for (let attempt = 0; attempt < 5 && !apptId; attempt++) {
    const { data, error } = await admin
      .from("appointments")
      .insert({
        business_id: businessId,
        customer_id: resolvedCustomerId,
        service_id: service.id,
        staff_id: effectiveStaffId,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        confirmation_code: generateConfirmationCode(),
      })
      .select("id")
      .single();
    if (data) {
      apptId = data.id as string;
      apptErr = null;
    } else {
      apptErr = error as { code?: string } | null;
      if (apptErr?.code !== "23505") break;
    }
  }
  if (apptErr || !apptId) {
    if (apptErr && apptErr.code === "23P01") {
      return NextResponse.json({ error: "That time was just taken — please pick another." }, { status: 409 });
    }
    return NextResponse.json({ error: "Booking failed — please try again." }, { status: 500 });
  }

  await scheduleReminders(admin, apptId, start);
  await logCustomerEvent(admin, {
    businessId,
    customerId: resolvedCustomerId,
    appointmentId: apptId,
    type: "booked",
    actorType: "team_member",
    actorId: user.id,
    details: {
      booked_by: user.id,
      via: "owner dashboard",
      service_name: service.name,
      starts_at: start.toISOString(),
      staff_id: effectiveStaffId,
    },
  });

  return NextResponse.json({ ok: true, appointmentId: apptId });
}
