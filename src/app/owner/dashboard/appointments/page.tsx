import Link from "next/link";
import { requireBusiness } from "@/lib/owner";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";

interface Row {
  id: string;
  starts_at: string;
  status: string;
  customer_id: string;
  owner_seen_at?: string | null;
  customers: { full_name: string } | null;
  services: { name: string } | null;
}

// Every appointment for the business in one list: upcoming first
// (soonest first), then past. Bookings nobody has opened yet carry
// a NEW tag (appointments.owner_seen_at, migration 0018). The wide
// select feature-detects the column: before 0018 lands the narrow
// select runs and the page works with no tags, exactly as briefed.
// Staff logins see only their assigned customers' appointments,
// matching the Customers and Calendar pages.
export default async function DashboardAppointmentsPage() {
  const { supabase, business, memberStaffId } = await requireBusiness();
  const tz = business.timezone;

  let staffCustomerIds: string[] | null = null;
  if (memberStaffId) {
    const { data: rels } = await supabase
      .from("business_customers")
      .select("customer_id")
      .eq("business_id", business.id)
      .eq("assigned_staff_id", memberStaffId);
    staffCustomerIds = (rels ?? []).map((r) => r.customer_id as string);
  }

  const base =
    "id, starts_at, status, customer_id, customers:customer_id ( full_name ), services:service_id ( name )";
  let rows: Row[] = [];
  let seenKnown = true;
  {
    let q = supabase
      .from("appointments")
      .select(`${base}, owner_seen_at`)
      .eq("business_id", business.id)
      .order("starts_at", { ascending: true })
      .limit(500);
    if (staffCustomerIds) q = q.in("customer_id", staffCustomerIds.length > 0 ? staffCustomerIds : ["00000000-0000-0000-0000-000000000000"]);
    const wide = await q;
    if (!wide.error) {
      rows = (wide.data ?? []) as unknown as Row[];
    } else {
      seenKnown = false;
      let q2 = supabase
        .from("appointments")
        .select(base)
        .eq("business_id", business.id)
        .order("starts_at", { ascending: true })
        .limit(500);
      if (staffCustomerIds) q2 = q2.in("customer_id", staffCustomerIds.length > 0 ? staffCustomerIds : ["00000000-0000-0000-0000-000000000000"]);
      const narrow = await q2;
      rows = (narrow.data ?? []) as unknown as Row[];
    }
  }

  const now = Date.now();
  const isNew = (r: Row) => seenKnown && r.owner_seen_at == null && r.status !== "cancelled";
  const upcoming = rows
    .filter((r) => new Date(r.starts_at).getTime() >= now && r.status !== "cancelled")
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const past = rows
    .filter((r) => !(new Date(r.starts_at).getTime() >= now && r.status !== "cancelled"))
    .sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at));

  const chip = (status: string) =>
    status === "confirmed"
      ? { cls: "chip", label: "Confirmed" }
      : status === "cancelled"
        ? { cls: "chip chip-red", label: "Cancelled" }
        : { cls: "chip chip-grey", label: status.replace("_", " ") };

  const renderRow = (r: Row) => {
    const c = chip(r.status);
    const startsAt = new Date(r.starts_at);
    return (
      <Link key={r.id} href={`/owner/dashboard/appointments/${r.id}`} className="appt-list-row">
        <span className="appt-list-main">
          <strong>{r.customers?.full_name ?? "Customer"}</strong>
          <span className="appt-list-sub">
            {r.services?.name ?? "Appointment"} · {formatDateInZone(startsAt, tz)} at {formatTimeInZone(startsAt, tz)}
          </span>
        </span>
        {isNew(r) && <span className="appt-new">NEW</span>}
        <span className={`${c.cls} chip-sm`}>{c.label}</span>
      </Link>
    );
  };

  return (
    <div>
      <h1 style={{ fontSize: 25 }}>Appointments</h1>
      <p className="small" style={{ marginTop: 0 }}>
        Everyone who booked, in one place. Open one to see the details.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Upcoming</h2>
        {upcoming.length === 0 && (
          <p className="small" style={{ margin: 0 }}>No upcoming appointments.</p>
        )}
        {upcoming.map(renderRow)}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Past appointments</h2>
        {past.length === 0 && (
          <p className="small" style={{ margin: 0 }}>No past appointments yet.</p>
        )}
        {past.map(renderRow)}
      </div>
    </div>
  );
}
