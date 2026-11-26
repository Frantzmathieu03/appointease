import { NextRequest, NextResponse } from "next/server";
import { getBusinessPageDataWithPreview } from "@/lib/data";
import { createAdminSupabase, createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { scheduleReminders } from "@/lib/reminders";
import { getBillingState } from "@/lib/plans";
import { generateConfirmationCode } from "@/lib/confirmation";
import { isDemoShop } from "@/lib/demo";
import { logCustomerEvent } from "@/lib/events";
import { sendNativePush } from "@/lib/native-push";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";

// POST /api/book
// Body: { slug, serviceId, staffId, startsAt, name, phone, email, notes? }
// - Signed-in customers book as themselves. The business page is
//   ACCOUNT-FIRST (Frantz, 2026-11-25): the book page sends signed-out
//   customers through a short account step first, so this is the
//   normal path — and booking joins the customer to THIS business
//   (business_customers below). Accounts are per business: the
//   membership, dashboard, messages and history never mix across
//   businesses.
// - Fallback only (a session that expired mid-flow): an account is
//   created at checkout with a random password they never see. They
//   manage the booking through the link in their confirmation
//   text/email, and can set a real password later from the
//   confirmation screen.
// - The database exclusion constraint makes double-booking impossible; a
//   lost race comes back as 409 and the client asks for a new time.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { slug, serviceId, staffId, startsAt, name, phone, email, notes } = body;

  // Insider rule (Frantz, 2026-11-25): published businesses take
  // bookings from anyone, as before; an UNPUBLISHED business can be
  // booked only by insiders — the owner, active team members, and
  // joined customers — so a new business can be tested end to end
  // before it goes public. Everyone else gets the same 404 as a
  // missing business. The billing gate and all other checks below
  // still apply to insiders.
  const page = await getBusinessPageDataWithPreview(slug);
  if (!page) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  const service = page.services.find((s) => s.id === serviceId);
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  // Billing gate (defense in depth — the pages hide booking too): a paused
  // business takes no new bookings. Existing appointments are unaffected.
  if (!getBillingState(page.business).bookingLive) {
    return NextResponse.json(
      { error: "Online booking is temporarily unavailable for this business." },
      { status: 403 }
    );
  }

  // Who offers this service (staff_services): when the service has
  // rows, only those team members can be booked for it. No rows =
  // everyone offers it. (The slots route enforces the same rule; this
  // is the backstop for direct calls.)
  if (staffId) {
    const offering = page.staffServices.filter((r) => r.service_id === serviceId);
    if (offering.length > 0 && !offering.some((r) => r.staff_id === staffId)) {
      return NextResponse.json(
        { error: "That team member doesn't offer this service — please pick another person or choose First available." },
        { status: 400 }
      );
    }
  }

  const start = new Date(startsAt);
  if (isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Pick a future time" }, { status: 400 });
  }
  const end = new Date(start.getTime() + service.duration_minutes * 60000);

  // DEMO SHOPS: the public example businesses are simulations — never
  // write an appointment, never schedule a reminder, no matter how the
  // request arrives. The client flow doesn't even call this route; this
  // is defense in depth. Same honest simulated shape as demo mode below.
  if (isDemoShop(slug)) {
    return NextResponse.json({
      ok: true,
      demoMode: true,
      appointment: {
        serviceName: service.name,
        startsAt: start.toISOString(),
        businessName: page.business.name,
        confirmationCode: generateConfirmationCode(),
      },
    });
  }

  // DEMO MODE: no database yet — simulate the confirmation honestly.
  if (page.demoMode || !isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demoMode: true,
      appointment: {
        serviceName: service.name,
        startsAt: start.toISOString(),
        businessName: page.business.name,
        confirmationCode: generateConfirmationCode(),
      },
    });
  }

  const admin = createAdminSupabase();

  // Who is booking?
  let customerId: string | null = null;
  const sessionClient = await createServerSupabase();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (user) customerId = user.id;

  if (!customerId) {
    if (!email) {
      return NextResponse.json(
        { error: "Add your email to finish booking." },
        { status: 400 }
      );
    }
    // Guest booking: create the account with a random, unguessable password
    // the customer never sees. They manage this booking through the secure
    // link in their confirmation text/email, and can claim the account by
    // setting a real password (reset-email flow) whenever they like.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID() + crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: name, phone },
    });
    if (createErr || !created.user) {
      return NextResponse.json(
        { error: "That email already has an account — sign in to finish booking, or use a different email." },
        { status: 409 }
      );
    }
    customerId = created.user.id;
    // Timeline: a brand-new account was created at this checkout.
    await logCustomerEvent(admin, {
      businessId: page.business.id,
      customerId,
      type: "registered",
      actorType: "customer",
      actorId: customerId,
      details: { via: "guest booking checkout" },
    });
  }

  // Customer profile basics (name/contact). The account's home is the
  // per-business membership created just below — nothing about this
  // booking is visible at any other business.
  await admin.from("customers").upsert(
    { id: customerId, full_name: name ?? "", email: email ?? null, phone: phone ?? null },
    { onConflict: "id" }
  );
  // This business's relationship with the customer (tenant-scoped).
  await admin
    .from("business_customers")
    .upsert(
      { business_id: page.business.id, customer_id: customerId },
      { onConflict: "business_id,customer_id", ignoreDuplicates: true }
    );
  // Booking with a specific person makes that person the customer's
  // person at this business — only when nobody is assigned yet (the
  // owner can reassign anytime; a later booking never silently moves
  // a customer). Customer Side Plan, Frantz 2026-11-26. The column
  // arrives with migration 0010; a failure here never fails a booking.
  if (staffId) {
    try {
      await admin
        .from("business_customers")
        .update({ assigned_staff_id: staffId })
        .eq("business_id", page.business.id)
        .eq("customer_id", customerId)
        .is("assigned_staff_id", null);
    } catch {
      // Assignment is additive — the booking itself already landed.
    }
  }

  // Insert with a fresh confirmation code per attempt: the unique
  // constraint on confirmation_code makes collisions come back as 23505,
  // and we simply draw a new code (the slot exclusion constraint is a
  // different code — 23P01 — and is NOT retried).
  interface BookedAppt {
    id: string;
    manage_token: string;
    confirmation_code: string;
  }
  let appt: BookedAppt | null = null;
  let apptErr: { code?: string } | null = null;
  for (let attempt = 0; attempt < 5 && !appt; attempt++) {
    const { data, error } = await admin
      .from("appointments")
      .insert({
        business_id: page.business.id,
        customer_id: customerId,
        service_id: service.id,
        staff_id: staffId || null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        notes: notes ?? null,
        confirmation_code: generateConfirmationCode(),
      })
      .select("id, manage_token, confirmation_code")
      .single();
    if (data) {
      appt = data as BookedAppt;
      apptErr = null;
    } else {
      apptErr = error as { code?: string } | null;
      if (apptErr?.code !== "23505") break;
    }
  }

  if (apptErr || !appt) {
    // 23P01 = exclusion violation → the slot was just taken.
    if (apptErr && (apptErr as { code?: string }).code === "23P01") {
      return NextResponse.json(
        { error: "That time was just taken — please pick another." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Booking failed — please try again." }, { status: 500 });
  }

  await scheduleReminders(admin, appt.id, start);

  // Intake form (migration 0012): if this service has a form attached,
  // the confirmation screen offers the customer a "Complete your
  // intake form" step. Defensive — no form_id column before 0012.
  let intakeFormName: string | null = null;
  if (service.form_id) {
    try {
      const { data: form } = await admin
        .from("forms")
        .select("name")
        .eq("id", service.form_id)
        .single();
      if (form) intakeFormName = form.name as string;
    } catch {
      intakeFormName = null;
    }
  }

  // Timeline: the booking itself (migration 0010). Guest bookings are
  // still "by customer" — the account was created for them at checkout.
  await logCustomerEvent(admin, {
    businessId: page.business.id,
    customerId,
    appointmentId: appt.id,
    type: "booked",
    actorType: "customer",
    actorId: customerId,
    details: {
      service_name: service.name,
      starts_at: start.toISOString(),
      staff_id: staffId || null,
      confirmation_code: appt.confirmation_code,
    },
  });

  // Native app push (app build phase 1): the owner/team learn about
  // the booking on their phones the moment it lands. Env-gated on
  // FCM / APNs credentials — until those exist this no-ops silently.
  // A push failure never fails a booking.
  try {
    const tz = page.business.timezone ?? "America/New_York";
    const when = `${formatDateInZone(start, tz)} · ${formatTimeInZone(start, tz)}`;
    await sendNativePush(admin, {
      businessId: page.business.id,
      kind: "new_booking",
      title: "New booking",
      body: `${name || "A customer"} booked ${service.name} · ${when}`,
      data: {
        type: "new_booking",
        appointmentId: appt.id,
        customerId,
        url: `/owner/dashboard/appointments/${appt.id}`,
      },
      customerId,
    });
  } catch (err) {
    console.error("sendNativePush (new_booking) failed:", err);
  }

  return NextResponse.json({
    ok: true,
    demoMode: false,
    appointment: {
      id: appt.id,
      manageToken: appt.manage_token,
      confirmationCode: appt.confirmation_code,
      serviceName: service.name,
      startsAt: start.toISOString(),
      businessName: page.business.name,
      intakeFormName,
    },
    accountCreated: !user,
  });
}
