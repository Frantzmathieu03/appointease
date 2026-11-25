import { requireBusiness } from "@/lib/owner";
import { formatDateInZone } from "@/lib/slots";
import CustomersManager, { type CustomerRow } from "@/components/owner/CustomersManager";
import type { StaffMember } from "@/lib/types";

// The business's own customers only (tenant isolation): people who booked
// or messaged THIS business. One global customer can appear at many
// businesses; each business sees only its own relationship — including
// its own staff assignment (migration 0010).
export default async function DashboardCustomersPage() {
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
  let rels: Rel[] = [];
  const withAssign = await supabase
    .from("business_customers")
    .select("customer_id, assigned_staff_id, customers:customer_id ( full_name, email, phone )")
    .eq("business_id", business.id);
  if (withAssign.error) {
    const basic = await supabase
      .from("business_customers")
      .select("customer_id, customers:customer_id ( full_name, email, phone )")
      .eq("business_id", business.id);
    rels = (basic.data ?? []) as unknown as Rel[];
  } else {
    rels = (withAssign.data ?? []) as unknown as Rel[];
  }

  const { data: appts } = await supabase
    .from("appointments")
    .select("customer_id, starts_at, status")
    .eq("business_id", business.id)
    .order("starts_at", { ascending: false });
  const stats = new Map<string, { total: number; last: string | null }>();
  for (const a of appts ?? []) {
    const s = stats.get(a.customer_id) ?? { total: 0, last: null };
    s.total += 1;
    if (!s.last) s.last = a.starts_at;
    stats.set(a.customer_id, s);
  }

  const { data: unreadRows } = await supabase
    .from("messages")
    .select("customer_id")
    .eq("business_id", business.id)
    .eq("sender", "customer")
    .is("read_at", null);
  const unreadBy = new Map<string, number>();
  for (const m of unreadRows ?? []) unreadBy.set(m.customer_id, (unreadBy.get(m.customer_id) ?? 0) + 1);

  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, business_id, name, active")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });
  const staff = (staffRows ?? []) as StaffMember[];

  const rows: CustomerRow[] = rels.map((r) => {
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
      <CustomersManager businessId={business.id} actorId={user.id} staff={staff} rows={rows} />
    </div>
  );
}
