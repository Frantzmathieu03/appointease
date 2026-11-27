import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/owner";
import { getBusinessSenderNames } from "@/lib/profile";
import { createAdminSupabase } from "@/lib/supabase";
import ThreadView from "@/components/ThreadView";
import AssignControl from "@/components/owner/AssignControl";
import InboxShell from "@/components/owner/InboxShell";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";
import type { StaffMember } from "@/lib/types";
import { formatPhone } from "@/lib/types";

// One open thread inside the two-column inbox (PDF §4): header carries
// the customer's next appointment, their assignment, and a profile
// link.
export default async function DashboardThreadPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const { supabase, user, business, memberStaffId } = await requireBusiness();
  const tz = business.timezone;

  const { data: customer } = await supabase
    .from("customers")
    .select("id, full_name, email, phone")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) notFound();

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

  const { data: nextAppt } = await supabase
    .from("appointments")
    .select("starts_at, services:service_id ( name )")
    .eq("business_id", business.id)
    .eq("customer_id", customerId)
    .eq("status", "confirmed")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const next = nextAppt as unknown as {
    starts_at: string;
    services: { name: string } | null;
  } | null;

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Inbox</h1>
      <InboxShell
        supabase={supabase}
        business={business}
        myStaffId={memberStaffId}
        selectedCustomerId={customerId}
      >
        <div>
          <p style={{ margin: "0 0 10px" }}>
            <Link href="/owner/dashboard/inbox" style={{ fontWeight: 600, fontSize: 14 }}>
              ← All conversations
            </Link>
          </p>
          <div className="d2-thread-head">
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 19, margin: 0 }}>{customer.full_name || "Customer"}</h2>
              <p className="small" style={{ margin: "3px 0 0" }}>
                {next
                  ? `Next: ${next.services?.name ?? "Appointment"} · ${formatDateInZone(new Date(next.starts_at), tz)}, ${formatTimeInZone(new Date(next.starts_at), tz)}`
                  : "No upcoming appointment"}
                {" · "}
                {[customer.phone ? formatPhone(customer.phone) : null, customer.email]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p style={{ margin: "6px 0 0" }}>
                <AssignControl
                  businessId={business.id}
                  customerId={customerId}
                  staff={staff}
                  assignedStaffId={assignedStaffId}
                  actorId={user.id}
                  compact
                />
              </p>
            </div>
            <Link href={`/owner/dashboard/customers/${customerId}`} className="btn">
              View profile
            </Link>
          </div>
          <div className="card">
            <ThreadView
              businessId={business.id}
              customerId={customerId}
              viewer="business"
              customerName={customer.full_name ?? undefined}
              teamName={business.name}
              senderNames={await getBusinessSenderNames(createAdminSupabase(), business)}
            />
          </div>
          <p className="small">
            Replies alert the customer by email (and text/push where enabled) the
            moment you send, and their replies alert you the same way.
          </p>
        </div>
      </InboxShell>
    </div>
  );
}
