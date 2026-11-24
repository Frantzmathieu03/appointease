import Link from "next/link";
import { requireBusiness } from "@/lib/owner";

// Thread list: every customer who has messaged (or booked) this business,
// newest conversation first, with the exact unread count on each thread.
export default async function DashboardInboxPage() {
  const { supabase, business } = await requireBusiness();

  const { data: rels } = await supabase
    .from("business_customers")
    .select("customer_id, customers:customer_id ( full_name )")
    .eq("business_id", business.id);
  const names = new Map<string, string>();
  for (const r of rels ?? []) {
    names.set(
      r.customer_id as string,
      (r as unknown as { customers: { full_name: string } }).customers?.full_name ?? "Customer"
    );
  }

  const { data: msgs } = await supabase
    .from("messages")
    .select("customer_id, body, sender, read_at, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const threads = new Map<
    string,
    { lastBody: string; lastAt: string; lastSender: string; unread: number }
  >();
  for (const m of msgs ?? []) {
    let t = threads.get(m.customer_id);
    if (!t) {
      t = { lastBody: m.body, lastAt: m.created_at, lastSender: m.sender, unread: 0 };
      threads.set(m.customer_id, t);
    }
    if (m.sender === "customer" && !m.read_at) t.unread += 1;
  }
  const list = [...threads.entries()].sort((a, b) => (a[1].lastAt < b[1].lastAt ? 1 : -1));

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Inbox</h1>
      {list.length === 0 && (
        <div className="card">
          <p className="lede" style={{ marginBottom: 0 }}>
            No conversations yet. When a customer messages you, it lands here —
            and we email you the moment it arrives, so nothing sits unseen.
          </p>
        </div>
      )}
      {list.map(([customerId, t]) => (
        <Link
          key={customerId}
          href={`/owner/dashboard/inbox/${customerId}`}
          className="card"
          style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", textDecoration: "none", color: "inherit" }}
        >
          <div>
            <h3 style={{ marginBottom: 2 }}>
              {names.get(customerId) ?? "Customer"}
              {t.unread > 0 && <span className="badge">{t.unread}</span>}
            </h3>
            <p className="small" style={{ margin: 0 }}>
              {t.lastSender === "business" ? "You: " : ""}
              {t.lastBody.length > 90 ? t.lastBody.slice(0, 90) + "…" : t.lastBody}
            </p>
          </div>
          <span className="small">
            {new Date(t.lastAt).toLocaleDateString([], { month: "short", day: "numeric" })}
          </span>
        </Link>
      ))}
    </div>
  );
}
