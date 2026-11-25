import Link from "next/link";
import { redirect } from "next/navigation";
import { requireBusiness, siteUrl } from "@/lib/owner";
import CopyLinkButton from "@/components/CopyLinkButton";

// Reports: plain numbers about the work — appointments booked, visits
// completed, no-shows, cancellations and why, busiest team member,
// most-booked service, new vs returning customers. Every number is
// counted from this business's real appointment rows.
// NO money figures, ever: AppointEase never receives or holds client
// money, so there is no revenue to report.
export default async function DashboardReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, business, role } = await requireBusiness();
  if (role === "staff") redirect("/owner/dashboard");

  const allTime = sp.range === "all";
  const windowStart = allTime ? null : new Date(Date.now() - 30 * 86400000);

  interface ApptRow {
    customer_id: string;
    service_id: string;
    staff_id: string | null;
    starts_at: string;
    status: string;
    cancellation_reason: string | null;
  }
  const [{ data: apptData }, { data: staffRows }, { data: serviceRows }] = await Promise.all([
    supabase
      .from("appointments")
      .select("customer_id, service_id, staff_id, starts_at, status, cancellation_reason")
      .eq("business_id", business.id),
    supabase.from("staff").select("id, name").eq("business_id", business.id),
    supabase.from("services").select("id, name").eq("business_id", business.id),
  ]);
  const all = (apptData ?? []) as ApptRow[];
  const staffName = new Map(((staffRows ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));
  const serviceName = new Map(
    ((serviceRows ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name])
  );

  const inWindow = (a: ApptRow) => !windowStart || new Date(a.starts_at) >= windowStart;
  const rows = all.filter(inWindow);

  const booked = rows.length;
  const completed = rows.filter((a) => a.status === "completed");
  const noShows = rows.filter((a) => a.status === "no_show");
  const cancelled = rows.filter((a) => a.status === "cancelled");
  const finished = completed.length + noShows.length;
  const noShowPct = finished > 0 ? Math.round((noShows.length / finished) * 100) : 0;

  // Top cancellation reasons.
  const reasonCounts = new Map<string, number>();
  for (const a of cancelled) {
    const r = (a.cancellation_reason ?? "").trim() || "No reason given";
    reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1);
  }
  const topReasons = [...reasonCounts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3);

  // Busiest team member, by completed visits.
  const completedByStaff = new Map<string, number>();
  for (const a of completed) {
    const key = a.staff_id ?? "__none__";
    completedByStaff.set(key, (completedByStaff.get(key) ?? 0) + 1);
  }
  const busiest = [...completedByStaff.entries()].sort((x, y) => y[1] - x[1])[0];

  // Most-booked service.
  const byService = new Map<string, number>();
  for (const a of rows) byService.set(a.service_id, (byService.get(a.service_id) ?? 0) + 1);
  const topService = [...byService.entries()].sort((x, y) => y[1] - x[1])[0];

  // New vs returning: a customer is "new" in the window when their
  // first-ever appointment at this business falls inside it.
  const firstEver = new Map<string, number>();
  for (const a of all) {
    const t = new Date(a.starts_at).getTime();
    if (!firstEver.has(a.customer_id) || t < firstEver.get(a.customer_id)!) {
      firstEver.set(a.customer_id, t);
    }
  }
  const windowCustomers = new Set(rows.map((a) => a.customer_id));
  let newCount = 0;
  let returningCount = 0;
  for (const cid of windowCustomers) {
    const first = firstEver.get(cid) ?? 0;
    if (windowStart && first < windowStart.getTime()) returningCount += 1;
    else newCount += 1;
  }

  const bookingLink = `${siteUrl()}/${business.slug}`;

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Reports</h1>

      <div className="tabs" style={{ marginBottom: 14 }}>
        <Link href="/owner/dashboard/reports" className={!allTime ? "active" : ""}>
          Last 30 days
        </Link>
        <Link href="/owner/dashboard/reports?range=all" className={allTime ? "active" : ""}>
          All time
        </Link>
      </div>

      {all.length === 0 ? (
        <div className="card">
          <h2>Nothing to report yet</h2>
          <p className="lede" style={{ marginBottom: 12 }}>
            Reports appear here after your first appointments. Share your
            booking link and this page fills itself in — appointments
            booked, visits finished, and who your busiest team member is.
          </p>
          <CopyLinkButton url={bookingLink} />
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div className="card" style={{ margin: 0 }}>
              <p className="eyebrow">Appointments booked</p>
              <p style={{ fontSize: 34, margin: "4px 0" }}>{booked}</p>
              <p className="small" style={{ margin: 0 }}>
                {allTime ? "Since you started" : "In the last 30 days, plus what's coming up"}
              </p>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <p className="eyebrow">Visits completed</p>
              <p style={{ fontSize: 34, margin: "4px 0" }}>{completed.length}</p>
              <p className="small" style={{ margin: 0 }}>Appointments marked done</p>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <p className="eyebrow">No-shows</p>
              <p style={{ fontSize: 34, margin: "4px 0" }}>
                {noShows.length}
                {finished > 0 && <span className="small"> · {noShowPct}%</span>}
              </p>
              <p className="small" style={{ margin: 0 }}>
                {finished > 0
                  ? "Share of finished visits where the customer didn't come"
                  : "No finished visits in this period yet"}
              </p>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <p className="eyebrow">Cancellations</p>
              <p style={{ fontSize: 34, margin: "4px 0" }}>{cancelled.length}</p>
              <p className="small" style={{ margin: 0 }}>
                {topReasons.length === 0
                  ? "Nobody cancelled in this period"
                  : `Top reason${topReasons.length > 1 ? "s" : ""}: ${topReasons
                      .map(([r, n]) => `${r} (${n})`)
                      .join(" · ")}`}
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
            <div className="card" style={{ margin: 0 }}>
              <p className="eyebrow">Busiest team member</p>
              <p className="lede" style={{ margin: "4px 0" }}>
                {busiest
                  ? busiest[0] === "__none__"
                    ? "First available (no one picked)"
                    : (staffName.get(busiest[0]) ?? "A team member")
                  : "No completed visits yet"}
              </p>
              <p className="small" style={{ margin: 0 }}>
                {busiest ? `${busiest[1]} completed visit${busiest[1] === 1 ? "" : "s"}` : "Completed visits count here"}
              </p>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <p className="eyebrow">Most-booked service</p>
              <p className="lede" style={{ margin: "4px 0" }}>
                {topService ? (serviceName.get(topService[0]) ?? "A service") : "No bookings yet"}
              </p>
              <p className="small" style={{ margin: 0 }}>
                {topService ? `${topService[1]} booking${topService[1] === 1 ? "" : "s"}` : "Bookings count here"}
              </p>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <p className="eyebrow">New vs returning customers</p>
              <p className="lede" style={{ margin: "4px 0" }}>
                {newCount} new · {returningCount} returning
              </p>
              <p className="small" style={{ margin: 0 }}>
                New = their first appointment with you was in this period
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
