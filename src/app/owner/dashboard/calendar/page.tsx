import { requireBusiness } from "@/lib/owner";
import { formatTimeInZone } from "@/lib/slots";

interface Row {
  id: string;
  starts_at: string;
  status: string;
  confirmation_code: string | null;
  customers: { full_name: string } | null;
  services: { name: string } | null;
  staff: { name: string } | null;
}

// Next 14 days, grouped by day (agenda-style calendar for v1).
export default async function DashboardCalendarPage() {
  const { supabase, business } = await requireBusiness();
  const tz = business.timezone;
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 86400000);

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, status, confirmation_code, customers:customer_id ( full_name ), services:service_id ( name ), staff:staff_id ( name )"
    )
    .eq("business_id", business.id)
    .gte("starts_at", now.toISOString())
    .lt("starts_at", horizon.toISOString())
    .order("starts_at", { ascending: true });
  const rows = (data ?? []) as unknown as Row[];

  const dayKey = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const dayLabel = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" }).format(d);

  const groups = new Map<string, { label: string; rows: Row[] }>();
  for (const r of rows) {
    const d = new Date(r.starts_at);
    const key = dayKey(d);
    if (!groups.has(key)) groups.set(key, { label: dayLabel(d), rows: [] });
    groups.get(key)!.rows.push(r);
  }

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Calendar — next 14 days</h1>
      {rows.length === 0 && (
        <div className="card">
          <p className="lede" style={{ marginBottom: 0 }}>Nothing booked in the next two weeks yet.</p>
        </div>
      )}
      {[...groups.values()].map((g) => (
        <div key={g.label} style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 17 }}>{g.label}</h2>
          {g.rows.map((r) => (
            <div className="card" key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h3 style={{ marginBottom: 2 }}>
                  {formatTimeInZone(new Date(r.starts_at), tz)} — {r.customers?.full_name ?? "Customer"}
                </h3>
                <p className="small" style={{ margin: 0 }}>
                  {r.services?.name ?? "Appointment"}
                  {r.staff?.name ? ` · with ${r.staff.name}` : ""}
                  {r.confirmation_code ? ` · # ${r.confirmation_code}` : ""}
                </p>
              </div>
              <span className={r.status === "confirmed" ? "chip" : "chip chip-grey"}>
                {r.status.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
