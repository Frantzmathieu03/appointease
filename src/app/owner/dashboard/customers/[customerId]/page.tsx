import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/owner";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";
import AssignControl from "@/components/owner/AssignControl";
import Timeline from "@/components/owner/Timeline";
import NextStepsList from "@/components/owner/NextStepsList";
import type {
  CustomerEvent,
  NextStep,
  StaffMember,
  VisitNote,
} from "@/lib/types";

interface ApptRow {
  id: string;
  starts_at: string;
  status: string;
  confirmation_code: string | null;
  services: { name: string } | null;
  staff: { name: string } | null;
}

// Customer profile (PDF §8): header with assignment, visit stats, then
// Overview / Visits / Timeline / Forms & files / Messages. The Timeline
// is the automatic, append-only history from customer_events
// (migration 0010); Forms & files lists intake submissions
// (migration 0012). The PDF's Payments tab is intentionally absent:
// AppointEase never handles client money.
export default async function DashboardCustomerProfilePage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const { supabase, user, business } = await requireBusiness();
  const tz = business.timezone;

  const { data: customer } = await supabase
    .from("customers")
    .select("id, full_name, email, phone")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) notFound();

  // Relationship row: "customer since" at THIS business + assignment.
  // assigned_staff_id arrives with migration 0010 — fall back quietly.
  const withAssign = await supabase
    .from("business_customers")
    .select("created_at, assigned_staff_id")
    .eq("business_id", business.id)
    .eq("customer_id", customerId)
    .maybeSingle();
  let relCreatedAt: string | null = null;
  let assignedStaffId: string | null = null;
  if (withAssign.error) {
    const basic = await supabase
      .from("business_customers")
      .select("created_at")
      .eq("business_id", business.id)
      .eq("customer_id", customerId)
      .maybeSingle();
    relCreatedAt = (basic.data as { created_at: string } | null)?.created_at ?? null;
  } else {
    const rel = withAssign.data as { created_at: string; assigned_staff_id: string | null } | null;
    relCreatedAt = rel?.created_at ?? null;
    assignedStaffId = rel?.assigned_staff_id ?? null;
  }

  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, business_id, name, active")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });
  const staff = (staffRows ?? []) as StaffMember[];

  const { data: apptData } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, status, confirmation_code, services:service_id ( name ), staff:staff_id ( name )"
    )
    .eq("business_id", business.id)
    .eq("customer_id", customerId)
    .order("starts_at", { ascending: false });
  const appts = (apptData ?? []) as unknown as ApptRow[];

  const { data: eventRows } = await supabase
    .from("customer_events")
    .select("*")
    .eq("business_id", business.id)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(200);
  const events = (eventRows ?? []) as CustomerEvent[];

  // Intake submissions (migration 0012) — empty until the migration
  // lands. answers values that are arrays are uploaded-file paths.
  interface SubmissionRow {
    id: string;
    submitted_at: string;
    appointment_id: string | null;
    answers: Record<string, string | string[]>;
    forms: { name: string } | null;
  }
  const { data: subData } = await supabase
    .from("form_submissions")
    .select("id, submitted_at, appointment_id, answers, forms:form_id ( name )")
    .eq("business_id", business.id)
    .eq("customer_id", customerId)
    .order("submitted_at", { ascending: false });
  const submissions = (subData ?? []) as unknown as SubmissionRow[];

  const { data: noteRows } = await supabase
    .from("visit_notes")
    .select("*")
    .eq("business_id", business.id)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  const notes = (noteRows ?? []) as VisitNote[];
  const { data: stepRows } =
    notes.length > 0
      ? await supabase
          .from("next_steps")
          .select("*")
          .in(
            "visit_note_id",
            notes.map((n) => n.id)
          )
          .order("created_at", { ascending: true })
      : { data: [] };
  const steps = (stepRows ?? []) as NextStep[];
  const stepsByNote = new Map<string, NextStep[]>();
  for (const s of steps) {
    const arr = stepsByNote.get(s.visit_note_id) ?? [];
    arr.push(s);
    stepsByNote.set(s.visit_note_id, arr);
  }
  const noteByAppt = new Map<string, VisitNote>();
  for (const n of notes) if (!noteByAppt.has(n.appointment_id)) noteByAppt.set(n.appointment_id, n);

  const now = Date.now();
  const total = appts.length;
  const completed = appts.filter((a) => a.status === "completed").length;
  const cancelled = appts.filter((a) => a.status === "cancelled").length;
  const noShows = appts.filter((a) => a.status === "no_show").length;
  const nextAppt = [...appts]
    .filter((a) => a.status === "confirmed" && new Date(a.starts_at).getTime() >= now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  const lastNote = notes[0];
  const openSteps = steps.filter((s) => !s.done_at);

  const fmtDT = (iso: string) =>
    `${formatDateInZone(new Date(iso), tz)} · ${formatTimeInZone(new Date(iso), tz)}`;
  const statusLabel = (s: string) => s.replace("_", " ");

  return (
    <div>
      <p className="eyebrow">
        <Link href="/owner/dashboard/customers">← Customers</Link>
      </p>
      <h1 style={{ fontSize: 26, marginBottom: 2 }}>{customer.full_name || "Customer"}</h1>
      <p className="small" style={{ margin: "0 0 4px" }}>
        {[customer.phone, customer.email].filter(Boolean).join(" · ")}
        {relCreatedAt ? ` · Customer since ${formatDateInZone(new Date(relCreatedAt), tz)}` : ""}
      </p>
      <p style={{ margin: "0 0 14px" }}>
        <AssignControl
          businessId={business.id}
          customerId={customerId}
          staff={staff}
          assignedStaffId={assignedStaffId}
          actorId={user.id}
        />
      </p>

      <div className="card" style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
        <span>
          <strong style={{ fontSize: 20 }}>{total}</strong>
          <br />
          <span className="small">Total visits</span>
        </span>
        <span>
          <strong style={{ fontSize: 20 }}>{completed}</strong>
          <br />
          <span className="small">Completed</span>
        </span>
        <span>
          <strong style={{ fontSize: 20 }}>{cancelled}</strong>
          <br />
          <span className="small">Cancelled</span>
        </span>
        <span>
          <strong style={{ fontSize: 20 }}>{noShows}</strong>
          <br />
          <span className="small">No-shows</span>
        </span>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Overview</h2>
        {nextAppt ? (
          <p className="small" style={{ margin: "2px 0" }}>
            <strong>Next appointment:</strong>{" "}
            <Link href={`/owner/dashboard/appointments/${nextAppt.id}`}>
              {nextAppt.services?.name ?? "Appointment"} — {fmtDT(nextAppt.starts_at)}
            </Link>
            {nextAppt.staff ? ` with ${nextAppt.staff.name}` : ""}
          </p>
        ) : (
          <p className="small" style={{ margin: "2px 0" }}>No upcoming appointment.</p>
        )}
        {lastNote && (
          <p className="small" style={{ margin: "6px 0 2px" }}>
            <strong>Last visit:</strong> {statusLabel(lastNote.outcome)} ·{" "}
            {formatDateInZone(new Date(lastNote.created_at), tz)}
            {lastNote.discussed ? ` — ${lastNote.discussed}` : ""}
          </p>
        )}
        {openSteps.length > 0 && (
          <>
            <p className="small" style={{ margin: "10px 0 0" }}>
              <strong>Open next steps</strong>
            </p>
            <NextStepsList steps={openSteps} actorId={user.id} tz={tz} />
          </>
        )}
        <div style={{ marginTop: 12 }}>
          <Link href={`/owner/dashboard/inbox/${customerId}`} className="btn">
            Message customer
          </Link>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Visits</h2>
        {appts.length === 0 && <p className="small" style={{ margin: 0 }}>No appointments yet.</p>}
        {appts.map((a) => {
          const n = noteByAppt.get(a.id);
          return (
            <p key={a.id} className="small" style={{ margin: "0 0 8px" }}>
              <Link href={`/owner/dashboard/appointments/${a.id}`}>
                <strong>{a.services?.name ?? "Appointment"}</strong> — {fmtDT(a.starts_at)}
              </Link>
              {a.staff ? ` · with ${a.staff.name}` : ""} · {statusLabel(a.status)}
              {n ? ` · visit notes (${statusLabel(n.outcome)})` : ""}
            </p>
          );
        })}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Timeline</h2>
        <Timeline events={events} tz={tz} />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Forms &amp; files</h2>
        {submissions.length === 0 && (
          <p className="small" style={{ margin: 0 }}>
            No intake forms submitted yet. When a service with a form
            attached is booked, the customer completes it before the
            visit and it appears here.
          </p>
        )}
        {submissions.map((s) => {
          const answerCount = Object.keys(s.answers ?? {}).length;
          const fileCount = Object.values(s.answers ?? {}).filter((v) => Array.isArray(v)).length;
          return (
            <p key={s.id} className="small" style={{ margin: "0 0 8px" }}>
              <Link href={`/owner/dashboard/forms/submissions/${s.id}`}>
                <strong>{s.forms?.name ?? "Intake form"}</strong>
              </Link>{" "}
              — submitted {fmtDT(s.submitted_at)} · {answerCount} answer
              {answerCount === 1 ? "" : "s"}
              {fileCount > 0 ? ` · ${fileCount} file upload${fileCount === 1 ? "" : "s"}` : ""}
            </p>
          );
        })}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Messages</h2>
        <p className="small" style={{ margin: "0 0 10px" }}>
          The full conversation with this customer lives in the inbox thread.
        </p>
        <Link href={`/owner/dashboard/inbox/${customerId}`} className="btn">
          Open the conversation
        </Link>
      </div>
    </div>
  );
}
