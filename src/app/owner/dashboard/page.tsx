import Link from "next/link";
import { requireBusiness, siteUrl } from "@/lib/owner";
import { formatDateInZone, formatTimeInZone, zonedTimeToUtc } from "@/lib/slots";
import CopyLinkButton from "@/components/CopyLinkButton";

interface Row {
  id: string;
  starts_at: string;
  status: string;
  staff_id: string | null;
  confirmation_code: string | null;
  customers: { full_name: string; phone: string | null } | null;
  services: { name: string } | null;
  staff: { name: string } | null;
}

// Dashboard home = Today's appointments (owner spec), grouped into one
// column card per staff member like the design demo. Each appointment
// row links to its detail page.
export default async function DashboardTodayPage() {
  const { supabase, business } = await requireBusiness();
  const tz = business.timezone;
  const link = `${siteUrl()}/${business.slug}`;

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const dayStart = zonedTimeToUtc(todayStr, "00:00", tz);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const [{ data }, { data: staffRows }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, starts_at, status, staff_id, confirmation_code, customers:customer_id ( full_name, phone ), services:service_id ( name ), staff:staff_id ( name )"
      )
      .eq("business_id", business.id)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("staff")
      .select("id, name")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("created_at", { ascending: true }),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const todays = rows.filter((r) => r.status !== "cancelled");
  const cancelled = rows.filter((r) => r.status === "cancelled");

  const groups: { key: string; name: string; rows: Row[] }[] = (staffRows ?? []).map((s) => ({
    key: s.id as string,
    name: s.name as string,
    rows: todays.filter((r) => r.staff_id === s.id),
  }));
  const unassigned = todays.filter(
    (r) => !r.staff_id || !groups.some((g) => g.key === r.staff_id)
  );
  if (unassigned.length > 0) {
    groups.push({ key: "unassigned", name: "First available / Unassigned", rows: unassigned });
  }

  const { count: unread } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("sender", "customer")
    .is("read_at", null);

  // Needs attention (PDF §3 / migration 0010): past appointments in the
  // last 30 days with no visit note, and customers with no staff
  // assignment. Both queries degrade quietly until the migration lands.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: pastAppts } = await supabase
    .from("appointments")
    .select("id, starts_at, customers:customer_id ( full_name ), services:service_id ( name )")
    .eq("business_id", business.id)
    .neq("status", "cancelled")
    .gte("starts_at", thirtyDaysAgo)
    .lt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(50);
  let withoutNotes: { id: string; starts_at: string; label: string }[] = [];
  if (pastAppts && pastAppts.length > 0) {
    const { data: noteRows, error: noteErr } = await supabase
      .from("visit_notes")
      .select("appointment_id")
      .in(
        "appointment_id",
        pastAppts.map((a) => a.id)
      );
    if (!noteErr) {
      const noted = new Set((noteRows ?? []).map((n) => n.appointment_id));
      withoutNotes = pastAppts
        .filter((a) => !noted.has(a.id))
        .slice(0, 5)
        .map((a) => {
          const row = a as unknown as {
            id: string;
            starts_at: string;
            customers: { full_name: string } | null;
            services: { name: string } | null;
          };
          return {
            id: row.id,
            starts_at: row.starts_at,
            label: `${row.customers?.full_name ?? "Customer"} · ${row.services?.name ?? "Appointment"}`,
          };
        });
    }
  }
  const { count: unassignedCount } = await supabase
    .from("business_customers")
    .select("customer_id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .is("assigned_staff_id", null);

  const niceDate = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 2 }}>Today&apos;s appointments</h1>
          <p className="small" style={{ margin: 0 }}>
            {business.name} · Daily schedule · {niceDate}
          </p>
        </div>
        <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/owner/dashboard/calendar/new" className="btn btn-primary">
            New appointment
          </Link>
          <CopyLinkButton url={link} />
        </span>
      </div>

      {(unread ?? 0) > 0 && (
        <div className="notice">
          You have {unread} unread customer message{unread === 1 ? "" : "s"} —{" "}
          <Link href="/owner/dashboard/inbox">open your inbox</Link>. (They were also
          emailed to you when they arrived.)
        </div>
      )}

      {(withoutNotes.length > 0 || (unassignedCount ?? 0) > 0) && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Needs attention</h3>
          {(unassignedCount ?? 0) > 0 && (
            <p className="small" style={{ margin: "2px 0" }}>
              {unassignedCount} customer{unassignedCount === 1 ? " is" : "s are"} not assigned
              to a team member — <Link href="/owner/dashboard/customers">assign them</Link>.
            </p>
          )}
          {withoutNotes.length > 0 && (
            <>
              <p className="small" style={{ margin: "6px 0 2px" }}>
                <strong>Visits without notes</strong> (last 30 days):
              </p>
              {withoutNotes.map((a) => (
                <p key={a.id} className="small" style={{ margin: "2px 0" }}>
                  <Link href={`/owner/dashboard/appointments/${a.id}`}>
                    {formatDateInZone(new Date(a.starts_at), tz)} · {a.label}
                  </Link>
                </p>
              ))}
            </>
          )}
        </div>
      )}

      {todays.length === 0 && (
        <div className="card">
          <p className="lede" style={{ marginBottom: 0 }}>
            No appointments today yet. Share your booking link and this page
            fills itself.
          </p>
        </div>
      )}

      {todays.length > 0 && (
        <div className="staff-grid">
          {groups.map((g) => (
            <div className="card" key={g.key} style={{ marginBottom: 0 }}>
              <h3 style={{ marginTop: 0 }}>{g.name}</h3>
              {g.rows.length === 0 && <p className="small">No appointments today.</p>}
              {g.rows.map((r) => (
                <Link
                  key={r.id}
                  href={`/owner/dashboard/appointments/${r.id}`}
                  className="appt-row"
                >
                  <span>
                    <strong>{formatTimeInZone(new Date(r.starts_at), tz)}</strong>
                    {" · "}
                    {r.customers?.full_name ?? "Customer"}
                    <br />
                    <span className="small">{r.services?.name ?? "Appointment"}</span>
                  </span>
                  <span className={r.status === "confirmed" ? "chip" : "chip chip-grey"}>
                    {r.status.replace("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}

      {cancelled.length > 0 && (
        <>
          <h2 style={{ marginTop: 20 }}>Cancelled today</h2>
          {cancelled.map((r) => (
            <div className="card" key={r.id}>
              <p className="small" style={{ margin: 0 }}>
                <Link href={`/owner/dashboard/appointments/${r.id}`}>
                  {formatTimeInZone(new Date(r.starts_at), tz)} — {r.customers?.full_name ?? "Customer"}
                </Link>{" "}
                · {r.services?.name ?? "Appointment"}
                {r.confirmation_code ? ` · # ${r.confirmation_code}` : ""}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
