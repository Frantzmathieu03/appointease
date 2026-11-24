import Link from "next/link";
import { requireBusiness } from "@/lib/owner";
import { formatTimeInZone, zonedTimeToUtc } from "@/lib/slots";

interface Row {
  id: string;
  starts_at: string;
  status: string;
  confirmation_code: string | null;
  customers: { full_name: string; phone: string | null } | null;
  services: { name: string } | null;
  staff: { name: string } | null;
}

// Dashboard home = Today's appointments (owner spec).
export default async function DashboardTodayPage() {
  const { supabase, business } = await requireBusiness();
  const tz = business.timezone;

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const dayStart = zonedTimeToUtc(todayStr, "00:00", tz);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, status, confirmation_code, customers:customer_id ( full_name, phone ), services:service_id ( name ), staff:staff_id ( name )"
    )
    .eq("business_id", business.id)
    .gte("starts_at", dayStart.toISOString())
    .lt("starts_at", dayEnd.toISOString())
    .order("starts_at", { ascending: true });
  const rows = (data ?? []) as unknown as Row[];
  const todays = rows.filter((r) => r.status !== "cancelled");
  const cancelled = rows.filter((r) => r.status === "cancelled");

  const { count: unread } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("sender", "customer")
    .is("read_at", null);

  const niceDate = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Today — {niceDate}</h1>

      {(unread ?? 0) > 0 && (
        <div className="notice">
          You have {unread} unread customer message{unread === 1 ? "" : "s"} —{" "}
          <Link href="/owner/dashboard/inbox">open your inbox</Link>. (They were also
          emailed to you when they arrived.)
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

      {todays.map((r) => (
        <div className="card" key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ marginBottom: 2 }}>
              {formatTimeInZone(new Date(r.starts_at), tz)} — {r.customers?.full_name ?? "Customer"}
            </h3>
            <p className="small" style={{ margin: 0 }}>
              {r.services?.name ?? "Appointment"}
              {r.staff?.name ? ` · with ${r.staff.name}` : ""}
              {r.customers?.phone ? ` · ${r.customers.phone}` : ""}
              {r.confirmation_code ? ` · # ${r.confirmation_code}` : ""}
            </p>
          </div>
          <span className={r.status === "confirmed" ? "chip" : "chip chip-grey"}>
            {r.status.replace("_", " ")}
          </span>
        </div>
      ))}

      {cancelled.length > 0 && (
        <>
          <h2 style={{ marginTop: 20 }}>Cancelled today</h2>
          {cancelled.map((r) => (
            <div className="card" key={r.id}>
              <p className="small" style={{ margin: 0 }}>
                {formatTimeInZone(new Date(r.starts_at), tz)} — {r.customers?.full_name ?? "Customer"} ·{" "}
                {r.services?.name ?? "Appointment"}
                {r.confirmation_code ? ` · # ${r.confirmation_code}` : ""}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
