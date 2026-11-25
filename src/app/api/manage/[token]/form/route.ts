import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { logCustomerEvent } from "@/lib/events";
import type { FormAnswers, FormQuestion } from "@/lib/types";

// Intake form behind the secure manage link: /manage/<token>/form
// GET  — the appointment's attached form, its questions, and any
//        submission already on file.
// POST — multipart: `answers` (JSON of text answers) + one
//        `file_<questionId>` field per uploaded file. The token is
//        the credential, exactly like reschedule/cancel — a guest who
//        booked without a password can still complete their intake.
// Files land in the PRIVATE form-uploads bucket under
// <business_id>/<customer_id>/… via the service role (the customer may
// not be signed in at all), and a form_submitted event is appended to
// the customer's timeline in the same request.

interface ApptRow {
  id: string;
  business_id: string;
  customer_id: string;
  service_id: string;
  status: string;
  starts_at: string;
  businesses: { name: string; logo_url: string | null; phone: string | null; timezone: string } | null;
  services: { name: string } | null;
}

async function loadAppt(token: string) {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("appointments")
    .select(
      "id, business_id, customer_id, service_id, status, starts_at, businesses:business_id ( name, logo_url, phone, timezone ), services:service_id ( name )"
    )
    .eq("manage_token", token)
    .single();
  return { admin, appt: (data as unknown as ApptRow) ?? null };
}

/** The form attached to the appointment's service, or null. Every
 *  forms query is defensive: before migration 0012 lands, services has
 *  no form_id column and this simply returns null. */
async function loadForm(admin: ReturnType<typeof createAdminSupabase>, serviceId: string) {
  try {
    const { data: svc, error } = await admin
      .from("services")
      .select("form_id")
      .eq("id", serviceId)
      .single();
    if (error || !svc?.form_id) return null;
    const formId = svc.form_id as string;
    const [{ data: form }, { data: questionRows }] = await Promise.all([
      admin.from("forms").select("id, name, description").eq("id", formId).single(),
      admin
        .from("form_questions")
        .select("*")
        .eq("form_id", formId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);
    if (!form) return null;
    const questions = ((questionRows ?? []) as FormQuestion[]).map((q) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : [],
    }));
    return { form, questions };
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Demo mode — nothing to fill in yet." }, { status: 400 });
  }
  const { token } = await params;
  const { admin, appt } = await loadAppt(token);
  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const loaded = await loadForm(admin, appt.service_id);
  let submission: { id: string; answers: FormAnswers; submitted_at: string } | null = null;
  if (loaded) {
    const { data } = await admin
      .from("form_submissions")
      .select("id, answers, submitted_at")
      .eq("appointment_id", appt.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    submission = data ?? null;
  }

  return NextResponse.json({
    business: appt.businesses,
    appointment: {
      id: appt.id,
      status: appt.status,
      starts_at: appt.starts_at,
      service_name: appt.services?.name ?? "Appointment",
    },
    form: loaded?.form ?? null,
    questions: loaded?.questions ?? [],
    submission,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Demo mode — nothing to fill in yet." }, { status: 400 });
  }
  const { token } = await params;
  const { admin, appt } = await loadAppt(token);
  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  if (appt.status === "cancelled") {
    return NextResponse.json(
      { error: "This appointment was cancelled — there's nothing to fill in." },
      { status: 409 }
    );
  }

  const loaded = await loadForm(admin, appt.service_id);
  if (!loaded) {
    return NextResponse.json({ error: "There's no form attached to this appointment." }, { status: 404 });
  }
  const { form, questions } = loaded;

  // One submission per appointment: a second submit replaces nothing —
  // the first stands as the record (the owner sees the original).
  const { data: existing } = await admin
    .from("form_submissions")
    .select("id")
    .eq("appointment_id", appt.id)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "You've already sent this form — the business has your answers." },
      { status: 409 }
    );
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  let textAnswers: Record<string, string> = {};
  try {
    textAnswers = JSON.parse(String(formData.get("answers") ?? "{}")) as Record<string, string>;
  } catch {
    return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
  }

  const answers: FormAnswers = {};
  let fileCount = 0;
  for (const q of questions) {
    if (q.type === "file") {
      const files = formData
        .getAll(`file_${q.id}`)
        .filter((f): f is File => f instanceof File && f.size > 0);
      if (q.required && files.length === 0) {
        return NextResponse.json({ error: `“${q.label}” needs a file.` }, { status: 400 });
      }
      const paths: string[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80) || "upload";
        const path = `${appt.business_id}/${appt.customer_id}/${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await admin.storage
          .from("form-uploads")
          .upload(path, file, { contentType: file.type || undefined });
        if (upErr) {
          return NextResponse.json(
            { error: "A file couldn't be uploaded — please try again." },
            { status: 500 }
          );
        }
        paths.push(path);
        fileCount++;
      }
      if (paths.length > 0) answers[q.id] = paths;
    } else {
      const v = (textAnswers[q.id] ?? "").toString().slice(0, 4000);
      if (q.required && !v.trim()) {
        return NextResponse.json({ error: `“${q.label}” is required.` }, { status: 400 });
      }
      if (v) answers[q.id] = v;
    }
  }

  const { error: insErr } = await admin.from("form_submissions").insert({
    form_id: form.id,
    business_id: appt.business_id,
    customer_id: appt.customer_id,
    appointment_id: appt.id,
    answers,
  });
  if (insErr) {
    return NextResponse.json(
      { error: "Your answers couldn't be saved — please try again." },
      { status: 500 }
    );
  }

  const answeredCount = Object.keys(answers).length;
  await logCustomerEvent(admin, {
    businessId: appt.business_id,
    customerId: appt.customer_id,
    appointmentId: appt.id,
    type: "form_submitted",
    actorType: "customer",
    actorId: appt.customer_id,
    details: { form_name: form.name, answers: answeredCount, files: fileCount },
  });

  return NextResponse.json({ ok: true });
}
