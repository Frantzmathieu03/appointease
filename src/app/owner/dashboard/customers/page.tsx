import Link from "next/link";
import { requireBusiness } from "@/lib/owner";
import { formatDateInZone } from "@/lib/slots";
import CustomersManager, { type CustomerRow } from "@/components/owner/CustomersManager";
import type { StaffMember } from "@/lib/types";

// The business's own customers only (tenant isolation): people who booked
// or messaged THIS business. One global customer can appear at many
// businesses; each business sees only its own relationship — including
// its own staff assignment (migration 0010).
export default async function DashboardCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, user, business } = await requireBusiness();
  const tz = business.timezone;

  // Assignment lives on business_customers (migration 0010). Until that
  // migration is applied the column doesn't exist — fall back to the
  // pre-0010 select so this page never breaks.
  interface Rel {
    customer_id: string;
    assigned_staff_id?: string | null;
    customers: { full_name: string; email: string | null; phone: string | null } | null;
  }
  type ApptRow = {
    customer_id: string;
    starts_at: string;
    status: string;
    location_id?: string | null;
  };

  const fetchRels = async (): Promise<Rel[]> => {
    const withAssign = await supabase
      .from("business_customers")
      .select("customer_id, assigned_staff_id, customers:customer_id ( full_name, email, phone )")
      .eq("business_id", business.id);
    if (withAssign.error) {
      const basic = await supabase
        .from("business_customers")
        .select("customer_id, customers:customer_id ( full_name, email, phone )")
        .eq("business_id", business.id);
      return (basic.data ?? []) as unknown as Rel[];
    }
    return (withAssign.data ?? []) as unknown as Rel[];
  };

  // location_id arrives with migration 0013 — fall back to the plain
  // select if the column isn't there yet. Bounded at 2000 rows, most
  // recent first, as an interim limit: this page only counts the rows
  // and finds the latest visit per customer.
  const fetchAppts = async (): Promise<ApptRow[]> => {
    const withLoc = await supabase
      .from("appointments")
      .select("customer_id, starts_at, status, location_id")
      .eq("business_id", business.id)
      .order("starts_at", { ascending: false })
      .limit(2000);
    if (withLoc.error) {
      const basic = await supabase
        .from("appointments")
        .select("customer_id, starts_at, status")
        .eq("business_id", business.id)
        .order("starts_at", { ascending: false })
        .limit(2000);
      return (basic.data ?? []) as ApptRow[];
    }
    return (withLoc.data ?? []) as ApptRow[];
  };

  // Locations, relationships, appointments, unread messages, and staff
  // are independent of each other — fire them together instead of in
  // sequence. The location set is computed after they land. The unread
  // messages query is bounded at 2000 rows as an interim limit; it
  // only feeds a per-customer count.
  const [locRes, rels, apptRows, { data: unreadRows }, { data: staffRows }] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name")
      .eq("business_id", business.id)
      .order("created_at", { ascending: true }),
    fetchRels(),
    fetchAppts(),
    supabase
      .from("messages")
      .select("customer_id")
      .eq("business_id", business.id)
      .eq("sender", "customer")
      .is("read_at", null)
      .limit(2000),
    supabase
      .from("staff")
      .select("id, business_id, name, active")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("created_at", { ascending: true }),
  ]);

  // Locations (migration 0013): a customer "belongs" to a location
  // through their appointments there. The filter only appears when the
  // business actually has 2+ branches.
  const locations = locRes.error ? [] : ((locRes.data ?? []) as { id: string; name: string }[]);
  const locFilter =
    locations.length >= 2 && sp.loc && locations.some((l) => l.id === sp.loc) ? sp.loc : null;
  const stats = new Map<string, { total: number; last: string | null }>();
  const customersAtLocation = new Set<string>();
  for (const a of apptRows) {
    const s = stats.get(a.customer_id) ?? { total: 0, last: null };
    s.total += 1;
    if (!s.last) s.last = a.starts_at;
    stats.set(a.customer_id, s);
    if (locFilter && a.location_id === locFilter) customersAtLocation.add(a.customer_id);
  }

  const unreadBy = new Map<string, number>();
  for (const m of unreadRows ?? []) unreadBy.set(m.customer_id, (unreadBy.get(m.customer_id) ?? 0) + 1);

  const staff = (staffRows ?? []) as StaffMember[];

  const visibleRels = locFilter ? rels.filter((r) => customersAtLocation.has(r.customer_id)) : rels;

  const rows: CustomerRow[] = visibleRels.map((r) => {
    const s = stats.get(r.customer_id);
    return {
      id: r.customer_id,
      full_name: r.customers?.full_name ?? "",
      email: r.customers?.email ?? null,
      phone: r.customers?.phone ?? null,
      assigned_staff_id: r.assigned_staff_id ?? null,
      total: s?.total ?? 0,
      lastLabel: s?.last ? formatDateInZone(new Date(s.last), tz) : null,
      unread: unreadBy.get(r.customer_id) ?? 0,
    };
  });

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Customers</h1>
      {locations.length >= 2 && (
        <div className="tabs" style={{ marginBottom: 12 }}>
          <span className="small" style={{ alignSelf: "center" }}>Location:</span>
          <Link href="/owner/dashboard/customers" className={!locFilter ? "active" : ""}>
            All locations
          </Link>
          {locations.map((l) => (
            <Link
              key={l.id}
              href={`/owner/dashboard/customers?loc=${l.id}`}
              className={locFilter === l.id ? "active" : ""}
            >
              {l.name}
            </Link>
          ))}
        </div>
      )}
      {locFilter && rows.length === 0 ? (
        <div className="card">
          <p className="small" style={{ margin: 0 }}>
            No customers have an appointment at this location yet. When
            someone books there, they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <CustomersManager businessId={business.id} actorId={user.id} staff={staff} rows={rows} />
      )}
    </div>
  );
}
