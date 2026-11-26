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
import { formatPhone } from "@/lib/types";

interface ApptRow {
  id: string;
  starts_at: string;
  status: string;
  confirmation_code: string | null;
  services: { name: string } | null;
  staff: { name: string } | null;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "visits", label: "Visits" },
  { id: "timeline", label: "Timeline" },
  { id: "messages", label: "Messages" },
  { id: "forms", label: "Forms & files" },
  // Marked paid only (revised Dashboard Changes PDF, 2026-11-26):
  // what the front desk marked as paid AT THE OFFICE. AppointEase
  // never collects payments; there is no other payment content.
  { id: "payments", label: "Payments" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// Customer profile (Owner Dashboard Plan, 2026-11-26): a header card
// (initials avatar, name, phone · email · client since, "Assigned
// to … · Change", Message / Add note / Book for <name> buttons, and
// the counts row — Visits, Completed, Cancelled, No-shows, plus Paid
// at office), then tabs Overview / Visits / Timeline / Messages /
// Forms & files / Payments. "Paid at office" and the Payments tab
// (revised PDF, 2026-11-26) cover ONLY what the front desk marked as
// paid at the office — AppointEase never collects client money.
// Overview leads with the last visit's note card and the timeline.
export default async function DashboardCustomerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { customerId } = await params;
  const sp = await searchParams;
  const tab: TabId = TABS.some((t) => t.id === sp.tab) ? (sp.tab as TabId) : "overview";
  const { supabase, user, business } = await requireBusiness();
  const tz = business.timezone;

  const { data: customer } = await supabase
    .from("customers")
    .select("id, full_name, email, phone")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) notFound();

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

  // Marked paid at the office (revised PDF, 2026-11-26): the sum and
  // the Payments tab read the same 'marked_paid' timeline events.
  const fmtMoney = (cents: number) =>
    `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
  const paidMarks = events.filter(
    (e) => e.type === "marked_paid" && typeof e.details?.amount_cents === "number"
  );
  const paidTotalCents = paidMarks.reduce(
    (sum, e) => sum + (e.details.amount_cents as number),
    0
  );
  const nextAppt = [...appts]
    .filter((a) => a.status === "confirmed" && new Date(a.starts_at).getTime() >= now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  const lastNote = notes[0];
  const lastNoteAppt = lastNote ? appts.find((a) => a.id === lastNote.appointment_id) : undefined;
  const lastNoteSteps = lastNote ? (stepsByNote.get(lastNote.id) ?? []) : [];
  const openSteps = steps.filter((s) => !s.done_at);
  const noteTarget = [...appts]
    .filter((a) => new Date(a.starts_at).getTime() < now && a.status !== "cancelled")
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];

  const fmtDT = (iso: string) =>
    `${formatDateInZone(new Date(iso), tz)} · ${formatTimeInZone(new Date(iso), tz)}`;
  const statusLabel = (s: string) => s.replace("_", " ");
  const statusTag = (s: string) =>
    s === "completed"
      ? "tag tag-completed"
      : s === "cancelled"
        ? "tag tag-grey"
        : s === "no_show"
          ? "tag tag-red"
          : "tag tag-confirmed";
  const nameParts = (customer.full_name || "C").trim().split(/\s+/);
  const initials = (
    (nameParts[0]?.[0] ?? "C") + (nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : "")
  ).toUpperCase();
  const firstName = nameParts[0] || "customer";
  const tabHref = (id: TabId) =>
    id === "overview"
      ? `/owner/dashboard/customers/${customerId}`
      : `/owner/dashboard/customers/${customerId}?tab=${id}`;

  return (
    <div>
      <p style={{ margin: "0 0 12px" }}>
        <Link href="/owner/dashboard/customers" style={{ fontWeight: 600, fontSize: 14 }}>
          ← All customers
        </Link>
      </p>

      <div className="card">
        <div className="d2-profile-head">
          <span className="d2-ava" aria-hidden="true">{initials}</span>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <h1 className="d2-profile-name">{customer.full_name || "Customer"}</h1>
            <p className="small" style={{ margin: "3px 0 2px" }}>
              {[customer.phone ? formatPhone(customer.phone) : null, customer.email]
                .filter(Boolean)
                .join(" · ")}
              {relCreatedAt ? ` · Client since ${formatDateInZone(new Date(relCreatedAt), tz)}` : ""}
            </p>
            <p style={{ margin: 0, fontSize: 14 }}>
              <AssignControl
                businessId={business.id}
                customerId={customerId}
                staff={staff}
                assignedStaffId={assignedStaffId}
                actorId={user.id}
                compact
              />
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={`/owner/dashboard/inbox/${customerId}`} className="btn">
              Message
            </Link>
            {noteTarget && (
              <Link href={`/owner/dashboard/appointments/${noteTarget.id}`} className="btn">
                Add note
              </Link>
            )}
            <Link
              href={`/owner/dashboard/calendar/new?customerId=${customerId}`}
              className="btn btn-primary"
            >
              Book for {firstName}
            </Link>
          </div>
        </div>
        <div className="d2-counts">
          <div className="d2-count">
            <p className="d2-count-label">Visits</p>
            <p className="d2-count-num">{total}</p>
          </div>
          <div className="d2-count">
            <p className="d2-count-label">Completed</p>
            <p className="d2-count-num">{completed}</p>
          </div>
          <div className="d2-count">
            <p className="d2-count-label">Cancelled</p>
            <p className="d2-count-num">{cancelled}</p>
          </div>
          <div className="d2-count">
            <p className="d2-count-label">No-shows</p>
            <p className="d2-count-num">{noShows}</p>
          </div>
          <div className="d2-count">
            <p className="d2-count-label">Paid at office</p>
            <p className="d2-count-num">{fmtMoney(paidTotalCents)}</p>
          </div>
        </div>
      </div>

      <nav className="d2-tabs" aria-label="Customer profile sections">
        {TABS.map((t) => (
          <Link key={t.id} href={tabHref(t.id)} className={tab === t.id ? "active" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="d2-today-grid">
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="d2-card-head">
              <h2>
                {lastNoteAppt
                  ? `Last visit · ${formatDateInZone(new Date(lastNoteAppt.starts_at), tz)}, ${formatTimeInZone(new Date(lastNoteAppt.starts_at), tz)}`
                  : "Last visit"}
              </h2>
              {lastNote && (
                <span className={statusTag(lastNote.outcome)}>{statusLabel(lastNote.outcome)}</span>
              )}
            </div>
            {nextAppt && (
              <p className="small" style={{ margin: "2px 0 10px" }}>
                <strong>Next appointment:</strong>{" "}
                <Link href={`/owner/dashboard/appointments/${nextAppt.id}`}>
                  {nextAppt.services?.name ?? "Appointment"} — {fmtDT(nextAppt.starts_at)}
                </Link>
                {nextAppt.staff ? ` with ${nextAppt.staff.name}` : ""}
              </p>
            )}
            {!lastNote && (
              <p className="small" style={{ margin: 0 }}>
                No visit notes yet. After a visit, open the appointment and add notes — what you
                talked about, what the client decided, and the next steps. They show up here.
              </p>
            )}
            {lastNote && (
              <>
                {lastNoteAppt && (
                  <h3 style={{ margin: "0 0 8px" }}>{lastNoteAppt.services?.name ?? "Visit"}</h3>
                )}
                {lastNote.discussed && (
                  <>
                    <p className="d2-sched-group" style={{ marginTop: 6 }}>What we discussed</p>
                    <p style={{ margin: "0 0 10px", fontSize: 14.5, lineHeight: 1.55 }}>{lastNote.discussed}</p>
                  </>
                )}
                {lastNote.customer_actions && (
                  <>
                    <p className="d2-sched-group">What the client did / decided</p>
                    <p style={{ margin: "0 0 10px", fontSize: 14.5, lineHeight: 1.55 }}>{lastNote.customer_actions}</p>
                  </>
                )}
                {lastNoteSteps.length > 0 && (
                  <>
                    <p className="d2-sched-group">Next steps</p>
                    <NextStepsList steps={lastNoteSteps} actorId={user.id} tz={tz} />
                  </>
                )}
                <p className="small" style={{ margin: "12px 0 0" }}>
                  {lastNote.visibility === "shared" ? "Summary shared with the customer" : "Internal only"} ·{" "}
                  {formatDateInZone(new Date(lastNote.created_at), tz)}
                  {lastNote.locked_at ? " · locked" : ""} ·{" "}
                  {lastNoteAppt && (
                    <Link href={`/owner/dashboard/appointments/${lastNoteAppt.id}`}>
                      Open the visit to add an addendum or share the summary
                    </Link>
                  )}
                </p>
              </>
            )}
            {openSteps.length > 0 && !lastNote && (
              <>
                <p className="d2-sched-group">Open next steps</p>
                <NextStepsList steps={openSteps} actorId={user.id} tz={tz} />
              </>
            )}
          </div>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="d2-card-head">
              <h2>Timeline</h2>
              <Link href={tabHref("timeline")} style={{ fontSize: 13.5, fontWeight: 600 }}>
                All events
              </Link>
            </div>
            <Timeline events={events.slice(0, 8)} tz={tz} />
          </div>
        </div>
      )}

      {tab === "visits" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Visits</h2>
          {appts.length === 0 && <p className="small" style={{ margin: 0 }}>No appointments yet.</p>}
          {appts.map((a) => {
            const n = noteByAppt.get(a.id);
            return (
              <p key={a.id} className="small" style={{ margin: "0 0 10px" }}>
                <Link href={`/owner/dashboard/appointments/${a.id}`}>
                  <strong>{a.services?.name ?? "Appointment"}</strong> — {fmtDT(a.starts_at)}
                </Link>{" "}
                <span className={statusTag(a.status)}>{statusLabel(a.status)}</span>
                {a.staff ? ` · with ${a.staff.name}` : ""}
                {n ? ` · visit notes (${statusLabel(n.outcome)})` : ""}
              </p>
            );
          })}
        </div>
      )}

      {tab === "timeline" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Timeline</h2>
          <Timeline events={events} tz={tz} />
        </div>
      )}

      {tab === "messages" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Messages</h2>
          <p className="small" style={{ margin: "0 0 10px" }}>
            The full conversation with this customer lives in the inbox thread.
          </p>
          <Link href={`/owner/dashboard/inbox/${customerId}`} className="btn btn-primary">
            Open the conversation
          </Link>
        </div>
      )}

      {tab === "forms" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Forms &amp; files</h2>
          {submissions.length === 0 && (
            <p className="small" style={{ margin: 0 }}>
              No forms yet. When this customer books a service that has a
              form, they fill it in before the visit and it shows up here.
            </p>
          )}
          {submissions.map((s) => {
            const answerCount = Object.keys(s.answers ?? {}).length;
            const fileCount = Object.values(s.answers ?? {}).filter((v) => Array.isArray(v)).length;
            return (
              <p key={s.id} className="small" style={{ margin: "0 0 8px" }}>
                <Link href={`/owner/dashboard/forms/submissions/${s.id}`}>
                  <strong>{s.forms?.name ?? "Form"}</strong>
                </Link>{" "}
                — filled in {fmtDT(s.submitted_at)} · {answerCount} answer
                {answerCount === 1 ? "" : "s"}
                {fileCount > 0 ? ` · ${fileCount} file${fileCount === 1 ? "" : "s"}` : ""}
              </p>
            );
          })}
        </div>
      )}

      {tab === "payments" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Payments</h2>
          <p className="small" style={{ marginTop: 0 }}>
            Paid at the office. AppointEase never collects payments.
          </p>
          {paidMarks.length === 0 && (
            <p className="small" style={{ margin: 0 }}>
              Nothing marked paid yet. When the front desk marks an
              appointment paid at the office, it shows up here.
            </p>
          )}
          {paidMarks.map((e) => (
            <p key={e.id} className="small" style={{ margin: "0 0 8px" }}>
              <strong>{fmtMoney(e.details.amount_cents as number)}</strong>
              {" — "}
              {fmtDT(e.created_at)} · marked by{" "}
              {typeof e.details.marked_by_name === "string"
                ? e.details.marked_by_name
                : "the team"}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
