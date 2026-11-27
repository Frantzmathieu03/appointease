import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBusiness, siteUrl } from "@/lib/owner";
import { createAdminSupabase } from "@/lib/supabase";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";
import AssignControl from "@/components/owner/AssignControl";
import MarkPaid, { type PaidMark } from "@/components/owner/MarkPaid";
import VisitNotes, { type NoteBundle } from "@/components/owner/VisitNotes";
import type { NextStep, NoteTemplate, StaffMember, VisitNote, VisitNoteAddendum } from "@/lib/types";
import { formatPhone, formatServicePrice } from "@/lib/types";

interface Appt {
  id: string;
  starts_at: string;
  status: string;
  confirmation_code: string | null;
  manage_token: string;
  customer_id: string;
  service_id: string;
  customers: { full_name: string; phone: string | null; email: string | null } | null;
  services: {
    name: string;
    duration_minutes: number;
    price_cents?: number | null;
    price_type?: "none" | "exact" | "from" | "free" | null;
  } | null;
  staff: { name: string } | null;
}

interface Reminder {
  kind: string;
  channel: string;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
}

const KIND_LABELS: Record<string, string> = {
  confirmation: "Booking confirmation",
  before_24h: "24-hour reminder",
  before_2h: "2-hour reminder",
};
const KIND_ORDER = ["confirmation", "before_24h", "before_2h"];

// One appointment in full: who, what, when, with whom, plus the real
// reminder state from public.reminders and the customer's own manage
// link (owner-side reschedule/cancel buttons do not exist yet; changes
// happen through that secure link, exactly like the customer's emails).
export default async function DashboardAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, business } = await requireBusiness();
  const tz = business.timezone;

  // The service price columns ride along when migration 0014 has
  // landed; before that the narrower select keeps the page working.
  const apptSelect =
    "id, starts_at, status, confirmation_code, manage_token, customer_id, service_id, customers:customer_id ( full_name, phone, email ), staff:staff_id ( name ), services:service_id ( ";
  let data: unknown = null;
  {
    const wide = await supabase
      .from("appointments")
      .select(`${apptSelect}name, duration_minutes, price_cents, price_type )`)
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle();
    if (!wide.error) {
      data = wide.data;
    } else {
      const narrow = await supabase
        .from("appointments")
        .select(`${apptSelect}name, duration_minutes )`)
        .eq("id", id)
        .eq("business_id", business.id)
        .maybeSingle();
      data = narrow.data;
    }
  }
  if (!data) notFound();
  const appt = data as unknown as Appt;

  // Opening this page marks the booking as seen (migration 0018):
  // the Appointments menu badge and NEW tags clear. Written with
  // the admin client after requireBusiness has proven membership,
  // so every role can stamp it. Before 0018 lands the update errors
  // on the missing column and is quietly ignored.
  try {
    const admin = createAdminSupabase();
    await admin
      .from("appointments")
      .update({ owner_seen_at: new Date().toISOString() })
      .eq("id", appt.id)
      .is("owner_seen_at", null);
  } catch {
    // Pre-migration or transient: seeing the page matters more.
  }

  const { data: remData } = await supabase
    .from("reminders")
    .select("kind, channel, status, scheduled_at, sent_at")
    .eq("appointment_id", appt.id)
    .order("scheduled_at", { ascending: true });
  const reminders = (remData ?? []) as Reminder[];

  // Assignment + staff list (migration 0010). Both degrade quietly until
  // the migration is applied: no assignment row, empty staff is fine.
  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, business_id, name, active")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });
  const staff = (staffRows ?? []) as StaffMember[];
  const { data: relRow } = await supabase
    .from("business_customers")
    .select("assigned_staff_id")
    .eq("business_id", business.id)
    .eq("customer_id", appt.customer_id)
    .maybeSingle();
  const assignedStaffId =
    (relRow as { assigned_staff_id?: string | null } | null)?.assigned_staff_id ?? null;

  // Visit notes for this appointment (migration 0010): empty until the
  // migration lands or the first note is written.
  const { data: noteRows } = await supabase
    .from("visit_notes")
    .select("*")
    .eq("appointment_id", appt.id)
    .order("created_at", { ascending: true });
  const notes = (noteRows ?? []) as VisitNote[];
  let bundles: NoteBundle[] = [];
  if (notes.length > 0) {
    const noteIds = notes.map((n) => n.id);
    const [{ data: addRows }, { data: stepRows }] = await Promise.all([
      supabase
        .from("visit_note_addenda")
        .select("*")
        .in("visit_note_id", noteIds)
        .order("created_at", { ascending: true }),
      supabase.from("next_steps").select("*").in("visit_note_id", noteIds).order("created_at", { ascending: true }),
    ]);
    const addenda = (addRows ?? []) as VisitNoteAddendum[];
    const steps = (stepRows ?? []) as NextStep[];
    bundles = notes.map((n) => ({
      note: n,
      addenda: addenda.filter((a) => a.visit_note_id === n.id),
      steps: steps.filter((s) => s.visit_note_id === n.id),
    }));
  }
  const isPast = new Date(appt.starts_at).getTime() < Date.now();

  // Intake form state (migration 0012): the form attached to this
  // appointment's service, and whether the customer submitted it.
  // Defensive: before the migration lands, no card is shown.
  let intake: { formName: string; submissionId: string | null; submittedAt: string | null } | null =
    null;
  try {
    const { data: svcRow, error: svcErr } = await supabase
      .from("services")
      .select("form_id")
      .eq("id", appt.service_id)
      .maybeSingle();
    const formId = (svcRow as { form_id?: string | null } | null)?.form_id ?? null;
    if (!svcErr && formId) {
      const [{ data: formRow }, { data: subRow }] = await Promise.all([
        supabase.from("forms").select("name").eq("id", formId).maybeSingle(),
        supabase
          .from("form_submissions")
          .select("id, submitted_at")
          .eq("appointment_id", appt.id)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (formRow) {
        intake = {
          formName: (formRow as { name: string }).name,
          submissionId: (subRow as { id: string } | null)?.id ?? null,
          submittedAt: (subRow as { submitted_at: string } | null)?.submitted_at ?? null,
        };
      }
    }
  } catch {
    intake = null;
  }

  // Visit-note templates (migration 0012) for the note editor's picker.
  const { data: templateRows } = await supabase
    .from("note_templates")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });
  const templates = (templateRows ?? []) as NoteTemplate[];

  // Marked-paid events for this appointment (migration 0015's
  // 'marked_paid' timeline type; the query is safe before it lands,
  // it simply finds nothing). Offline bookkeeping only.
  const { data: paidRows } = await supabase
    .from("customer_events")
    .select("created_at, details")
    .eq("appointment_id", appt.id)
    .eq("type", "marked_paid")
    .order("created_at", { ascending: true });
  const paidMarks: PaidMark[] = ((paidRows ?? []) as {
    created_at: string;
    details: Record<string, unknown>;
  }[])
    .filter((r) => typeof r.details?.amount_cents === "number")
    .map((r) => ({
      dateLabel: `${formatDateInZone(new Date(r.created_at), tz)}`,
      amountCents: r.details.amount_cents as number,
    }));
  const priceWords = appt.services
    ? formatServicePrice({
        price_cents: appt.services.price_cents ?? null,
        price_type: appt.services.price_type ?? null,
      })
    : "";
  const priceLine = priceWords ? `${priceWords} · Pay at the office` : "Pay at the office";
  const prefillCents =
    appt.services?.price_cents != null && appt.services.price_cents > 0
      ? appt.services.price_cents
      : null;

  const startsAt = new Date(appt.starts_at);
  const statusChip =
    appt.status === "confirmed"
      ? { cls: "chip", label: "Confirmed" }
      : appt.status === "cancelled"
        ? { cls: "chip chip-red", label: "Cancelled" }
        : { cls: "chip chip-grey", label: appt.status.replace("_", " ") };
  const manageUrl = `${siteUrl()}/manage/${appt.manage_token}`;

  const fmtWhen = (iso: string) =>
    `${formatDateInZone(new Date(iso), tz)} · ${formatTimeInZone(new Date(iso), tz)}`;
  // Reminder state as a small pill plus a plain when line, never the
  // old channel-dash-status text line.
  const reminderStatus = (r: Reminder): { pill: string; cls: string; when: string } => {
    switch (r.status) {
      case "sent":
        return { pill: "Sent", cls: "chip", when: r.sent_at ? fmtWhen(r.sent_at) : "" };
      case "pending":
        return { pill: "Scheduled", cls: "chip chip-grey", when: fmtWhen(r.scheduled_at) };
      case "failed":
        return { pill: "Failed", cls: "chip chip-red", when: fmtWhen(r.scheduled_at) };
      case "skipped":
        return { pill: "Skipped", cls: "chip chip-grey", when: "" };
      case "cancelled":
        return { pill: "Cancelled", cls: "chip chip-grey", when: "" };
      default:
        return { pill: r.status, cls: "chip chip-grey", when: "" };
    }
  };
  const phoneDigits = (appt.customers?.phone ?? "").replace(/\D/g, "");
  const telHref = phoneDigits
    ? `tel:+${phoneDigits.length === 10 ? "1" : ""}${phoneDigits}`
    : null;

  return (
    <div>
      <p className="eyebrow">
        <Link href="/owner/dashboard">← Today&apos;s appointments</Link>
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: 25 }}>{appt.customers?.full_name ?? "Customer"}</h1>
        <span className={statusChip.cls} style={{ marginTop: 6 }}>{statusChip.label}</span>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Appointment</h2>
        <dl className="appt-rows">
          <div className="appt-row">
            <dt>Service</dt>
            <dd>
              <strong>{appt.services?.name ?? "Appointment"}</strong>
              {appt.services?.duration_minutes ? ` · ${appt.services.duration_minutes} min` : ""}
            </dd>
          </div>
          <div className="appt-row">
            <dt>When</dt>
            <dd>{formatDateInZone(startsAt, tz)} at {formatTimeInZone(startsAt, tz)}</dd>
          </div>
          <div className="appt-row">
            <dt>With</dt>
            <dd>{appt.staff?.name ?? "First available"}</dd>
          </div>
          {business.address && (
            <div className="appt-row">
              <dt>Where</dt>
              <dd>{business.address}</dd>
            </div>
          )}
          {appt.confirmation_code && (
            <div className="appt-row">
              <dt>Confirmation #</dt>
              <dd><strong>{appt.confirmation_code}</strong></dd>
            </div>
          )}
        </dl>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Customer</h2>
        <dl className="appt-rows">
          <div className="appt-row">
            <dt>Name</dt>
            <dd>{appt.customers?.full_name ?? "Customer"}</dd>
          </div>
          {appt.customers?.phone && (
            <div className="appt-row">
              <dt>Phone</dt>
              <dd>{formatPhone(appt.customers.phone)}</dd>
            </div>
          )}
          {appt.customers?.email && (
            <div className="appt-row">
              <dt>Email</dt>
              <dd>{appt.customers.email}</dd>
            </div>
          )}
        </dl>
        <div className="appt-actions">
          <Link href={`/owner/dashboard/customers/${appt.customer_id}`} className="btn">
            Customer profile
          </Link>
          <Link href={`/owner/dashboard/inbox/${appt.customer_id}`} className="btn">
            Message customer
          </Link>
          {telHref && (
            <a href={telHref} className="btn">
              Call {formatPhone(appt.customers?.phone ?? "")}
            </a>
          )}
        </div>
      </div>

      {appt.status !== "cancelled" && (
        <div className="card">
          {/* MarkPaid leads with its own bold price line ("Pay at
              the office"), which titles this card. */}
          <MarkPaid
            appointmentId={appt.id}
            priceLine={priceLine}
            prefillCents={prefillCents}
            marks={paidMarks}
          />
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Assignment</h2>
        <AssignControl
          businessId={business.id}
          customerId={appt.customer_id}
          staff={staff}
          assignedStaffId={assignedStaffId}
          actorId={user.id}
          compact
        />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Change this appointment</h2>
        <p className="small" style={{ margin: "0 0 12px" }}>
          Rescheduling and cancelling happen through the customer&apos;s secure
          manage link, the same link in their confirmation and reminders.
          Share it with the customer if they ask you to change this appointment.
        </p>
        <a href={manageUrl} className="btn" target="_blank" rel="noreferrer">
          Open the customer&apos;s manage page
        </a>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Reminders</h2>
        {reminders.length === 0 && (
          <p className="small" style={{ margin: 0 }}>
            No reminders recorded for this appointment.
          </p>
        )}
        {KIND_ORDER.map((kind) => {
          const rows = reminders.filter((r) => r.kind === kind);
          if (rows.length === 0) return null;
          return (
            <div key={kind} className="rem-group">
              <div className="rem-kind">{KIND_LABELS[kind]}</div>
              {rows.map((r, i) => {
                const st = reminderStatus(r);
                return (
                  <div key={i} className="rem-row">
                    <span className="rem-channel">{r.channel === "sms" ? "Text" : "Email"}</span>
                    <span className="rem-when">{st.when}</span>
                    <span className={`${st.cls} chip-sm`}>{st.pill}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {intake && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Form</h2>
          {intake.submissionId ? (
            <p className="small" style={{ margin: 0 }}>
              <strong>{intake.formName}</strong>: filled in{" "}
              {intake.submittedAt ? fmtWhen(intake.submittedAt) : ""}.{" "}
              <Link href={`/owner/dashboard/forms/submissions/${intake.submissionId}`}>
                See the answers
              </Link>
            </p>
          ) : (
            <p className="small" style={{ margin: 0 }}>
              <strong>{intake.formName}</strong>: not filled in yet. The
              customer can fill it in from the link in their confirmation,
              or from My Appointments.
            </p>
          )}
        </div>
      )}

      {(isPast || bundles.length > 0 || appt.status === "completed" || appt.status === "no_show") && (
        <VisitNotes
          businessId={business.id}
          customerId={appt.customer_id}
          appointmentId={appt.id}
          appointmentStatus={appt.status}
          actorId={user.id}
          tz={tz}
          bundles={bundles}
          templates={templates}
          serviceId={appt.service_id}
        />
      )}
    </div>
  );
}
