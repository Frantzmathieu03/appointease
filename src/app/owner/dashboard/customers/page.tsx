import Link from "next/link";
import { requireBusiness } from "@/lib/owner";
import { formatDateInZone } from "@/lib/slots";

// The business's own customers only (tenant isolation): people who booked
// or messaged THIS business. One global customer can appear at many
// businesses; each business sees only its own relationship.
export default async function DashboardCustomersPage() {
  const { supabase, business } = await requireBusiness();
  const tz = business.timezone;

  const { data: rels } = await supabase
    .from("business_customers")
    .select("customer_id, customers:customer_id ( full_name, email, phone )")
    .eq("business_id", business.id);
  const customers = (rels ?? []).map((r) => ({
    id: r.customer_id as string,
    ...(r as unknown as { customers: { full_name: string; email: string | null; phone: string | null } }).customers,
  }));

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

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Customers</h1>
      {customers.length === 0 && (
        <div className="card">
          <p className="lede" style={{ marginBottom: 0 }}>
            No customers yet — the first person who books or messages you appears here.
          </p>
        </div>
      )}
      {customers.map((c) => (
        <div className="card" key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h3 style={{ marginBottom: 2 }}>{c.full_name || "Customer"}</h3>
            <p className="small" style={{ margin: 0 }}>
              {[c.phone, c.email].filter(Boolean).join(" · ")}
              {stats.get(c.id)
                ? ` · ${stats.get(c.id)!.total} appointment${stats.get(c.id)!.total === 1 ? "" : "s"}` +
                  (stats.get(c.id)!.last
                    ? ` · last ${formatDateInZone(new Date(stats.get(c.id)!.last!), tz)}`
                    : "")
                : ""}
            </p>
          </div>
          <Link href={`/owner/dashboard/inbox/${c.id}`} className="btn">
            Open profile
            {(unreadBy.get(c.id) ?? 0) > 0 && <span className="badge">{unreadBy.get(c.id)}</span>}
          </Link>
        </div>
      ))}
    </div>
  );
}
