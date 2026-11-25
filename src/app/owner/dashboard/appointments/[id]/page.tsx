import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBusiness, siteUrl } from "@/lib/owner";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";
import AssignControl from "@/components/owner/AssignControl";
import VisitNotes, { type NoteBundle } from "@/components/owner/VisitNotes";
import type { NextStep, StaffMember, VisitNote, VisitNoteAddendum } from "@/lib/types";

interface Appt {
  id: string;
  starts_at: string;
  status: string;
  confirmation_code: string | null;
  manage_token: string;
  customer_id: string;
  customers: { full_name: string; phone: string | null; email: string | null } | null;
  services: { name: string; duration_minutes: number } | null;
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

// One appointment in full: who, what, when, with whom — plus the real
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

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, status, confirmation_code, manage_token, customer_id, customers:customer_id ( full_name, phone, email ), services:service_id ( name, duration_minutes ), staff:staff_id ( name )"
    )
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!data) notFound();
  const appt = data as unknown as Appt;

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

  // Visit notes for this appointment (migration 0010) — empty until the
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
  const reminderStatus = (r: Reminder) => {
    switch (r.status) {
      case "sent":
        return `Sent${r.sent_at ? ` · ${fmtWhen(r.sent_at)}` : ""}`;
      case "pending":
        return `Scheduled · ${fmtWhen(r.scheduled_at)}`;
      case "skipped":
        return "Skipped";
      case "cancelled":
        return "Cancelled";
      case "failed":
        return "Failed";
      default:
        return r.status;
    }
  };

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
        <p style={{ margin: "4px 0" }}>
          <strong>{appt.services?.name ?? "Appointment"}</strong>
          {appt.services?.duration_minutes ? ` · ${appt.services.duration_minutes} min` : ""}
        </p>
        <p style={{ margin: "4px 0" }}>
          {formatDateInZone(startsAt, tz)} at {formatTimeInZone(startsAt, tz)}
        </p>
        <p style={{ margin: "4px 0" }}>
          With: {appt.staff?.name ?? "First available"}
        </p>
        {business.address && <p style={{ margin: "4px 0" }}>📍 {business.address}</p>}
        {appt.confirmation_code && (
          <p className="small" style={{ margin: "4px 0" }}>
            Confirmation #: <strong>{appt.confirmation_code}</strong>
          </p>
        )}
        {(appt.customers?.phone || appt.customers?.email) && (
          <p className="small" style={{ margin: "4px 0" }}>
            {[appt.customers?.phone, appt.customers?.email].filter(Boolean).join(" · ")}
          </p>
        )}
        <p style={{ margin: "8px 0 0" }}>
          <AssignControl
            businessId={business.id}
            customerId={appt.customer_id}
            staff={staff}
            assignedStaffId={assignedStaffId}
            actorId={user.id}
            compact
          />
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <Link href={`/owner/dashboard/customers/${appt.customer_id}`} className="btn">
            Customer profile
          </Link>
          <Link href={`/owner/dashboard/inbox/${appt.customer_id}`} className="btn">
            Message customer
          </Link>
          <a href={manageUrl} className="btn" target="_blank" rel="noreferrer">
            Open the customer&apos;s manage page
          </a>
        </div>
        <p className="small" style={{ marginTop: 10 }}>
          Rescheduling and cancelling happen through the customer&apos;s secure
          manage link — the same link in their confirmation and reminders.
          Share it with the customer if they ask you to change this appointment.
        </p>
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
            <div key={kind} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600 }}>{KIND_LABELS[kind]}</div>
              {rows.map((r, i) => (
                <p key={i} className="small" style={{ margin: "2px 0 0" }}>
                  {r.channel === "sms" ? "Text" : "Email"} — {reminderStatus(r)}
                </p>
              ))}
            </div>
          );
        })}
      </div>

      {(isPast || bundles.length > 0 || appt.status === "completed" || appt.status === "no_show") && (
        <VisitNotes
          businessId={business.id}
          customerId={appt.customer_id}
          appointmentId={appt.id}
          appointmentStatus={appt.status}
          actorId={user.id}
          tz={tz}
          bundles={bundles}
        />
      )}
    </div>
  );
}
