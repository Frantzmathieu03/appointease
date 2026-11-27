import type { SupabaseClient } from "@supabase/supabase-js";
import InboxList, { type InboxThreadSummary } from "./InboxList";
import type { Business } from "@/lib/types";

/**
 * Two-column inbox shell (PDF §4): conversation list on the left, the
 * open thread (children) on the right. On mobile the list hides while a
 * thread is open: the thread route stands alone there. RLS does the
 * scoping: a staff login's queries only return their assigned
 * customers' threads (migration 0011), so this component needs no
 * hand-filtering.
 */
export default async function InboxShell({
  supabase,
  business,
  myStaffId,
  selectedCustomerId,
  children,
}: {
  supabase: SupabaseClient;
  business: Business;
  myStaffId: string | null;
  selectedCustomerId?: string;
  children: React.ReactNode;
}) {
  const { data: rels } = await supabase
    .from("business_customers")
    .select("customer_id, assigned_staff_id, customers:customer_id ( full_name )")
    .eq("business_id", business.id);
  const names = new Map<string, string>();
  const assigned = new Map<string, string | null>();
  for (const r of rels ?? []) {
    const row = r as unknown as {
      customer_id: string;
      assigned_staff_id?: string | null;
      customers: { full_name: string } | null;
    };
    names.set(row.customer_id, row.customers?.full_name ?? "Customer");
    assigned.set(row.customer_id, row.assigned_staff_id ?? null);
  }

  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, name")
    .eq("business_id", business.id);
  const initials = new Map<string, string>();
  const staffNames = new Map<string, string>();
  for (const s of staffRows ?? []) {
    const parts = String(s.name).trim().split(/\s+/);
    initials.set(
      s.id as string,
      ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
    );
    staffNames.set(s.id as string, String(s.name));
  }

  const { data: msgs } = await supabase
    .from("messages")
    .select("customer_id, body, sender, read_at, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const byThread = new Map<string, InboxThreadSummary>();
  for (const m of msgs ?? []) {
    let t = byThread.get(m.customer_id);
    if (!t) {
      const sid = assigned.get(m.customer_id) ?? null;
      t = {
        customerId: m.customer_id,
        name: names.get(m.customer_id) ?? "Customer",
        lastBody: m.body,
        lastAt: m.created_at,
        lastSender: m.sender,
        unread: 0,
        assignedStaffId: sid,
        assignedName: sid ? (staffNames.get(sid) ?? null) : null,
        staffInitials: sid ? (initials.get(sid) ?? null) : null,
      };
      byThread.set(m.customer_id, t);
    }
    if (m.sender === "customer" && !m.read_at) t.unread += 1;
  }
  const threads = [...byThread.values()].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));

  return (
    <div className={selectedCustomerId ? "inbox-shell has-thread" : "inbox-shell"}>
      <div className="inbox-list-col">
        <InboxList threads={threads} selectedCustomerId={selectedCustomerId} myStaffId={myStaffId} />
      </div>
      <div className="inbox-thread-col">{children}</div>
    </div>
  );
}
