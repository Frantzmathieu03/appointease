import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/owner";
import ThreadView from "@/components/ThreadView";
import AssignControl from "@/components/owner/AssignControl";
import type { StaffMember } from "@/lib/types";

export default async function DashboardThreadPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const { supabase, user, business } = await requireBusiness();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, full_name, email, phone")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) notFound();

  // Assignment in the thread header (PDF §4 / migration 0010) — degrades
  // quietly until the migration is applied.
  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, business_id, name, active")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });
  const staff = (staffRows ?? []) as StaffMember[];
  const { data: relRow } = await supabase
    .from("business_customers")
    .select("assigned_staff_id")
    .eq("business_id", business.id)
    .eq("customer_id", customerId)
    .maybeSingle();
  const assignedStaffId =
    (relRow as { assigned_staff_id?: string | null } | null)?.assigned_staff_id ?? null;

  return (
    <div>
      <p className="eyebrow">
        <Link href="/owner/dashboard/inbox">← Inbox</Link>
        {"  ·  "}
        <Link href={`/owner/dashboard/customers/${customerId}`}>View customer</Link>
      </p>
      <h1 style={{ fontSize: 25 }}>Conversation with {customer.full_name || "Customer"}</h1>
      <p className="small" style={{ marginTop: -6, marginBottom: 6 }}>
        {[customer.phone, customer.email].filter(Boolean).join(" · ")}
      </p>
      <p style={{ margin: "0 0 14px" }}>
        <AssignControl
          businessId={business.id}
          customerId={customerId}
          staff={staff}
          assignedStaffId={assignedStaffId}
          actorId={user.id}
          compact
        />
      </p>
      <div className="card">
        <ThreadView businessId={business.id} customerId={customerId} viewer="business" />
      </div>
      <p className="small">
        Replies alert the customer by email (and text/push where enabled) the
        moment you send — and their replies alert you the same way.
      </p>
    </div>
  );
}
