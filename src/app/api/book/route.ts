import { NextRequest, NextResponse } from "next/server";
import { getBusinessPageData } from "@/lib/data";
import { createAdminSupabase, createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { scheduleReminders } from "@/lib/reminders";
import { getBillingState } from "@/lib/plans";
import { generateConfirmationCode } from "@/lib/confirmation";
import { isDemoShop } from "@/lib/demo";

// POST /api/book
// Body: { slug, serviceId, staffId, startsAt, name, phone, email, password?, notes? }
// - Signed-in customers book as themselves.
// - New customers: an account is created at checkout (email + password, with
//   the phone number they gave) — one account across all of AppointEase.
// - The database exclusion constraint makes double-booking impossible; a
//   lost race comes back as 409 and the client asks for a new time.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { slug, serviceId, staffId, startsAt, name, phone, email, password, notes } = body;

  const page = await getBusinessPageData(slug);
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
    if (!email || !password) {
      return NextResponse.json(
        { error: "Create your account (email + password) to finish booking." },
        { status: 401 }
      );
    }
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, phone },
    });
    if (createErr || !created.user) {
      return NextResponse.json(
        { error: "That email already has an account — sign in to finish booking." },
        { status: 409 }
      );
    }
    customerId = created.user.id;
  }

  // Global customer profile (one per person, across all businesses).
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
    },
    accountCreated: !user,
  });
}
