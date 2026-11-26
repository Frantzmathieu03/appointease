import Link from "next/link";
import { requireBusiness } from "@/lib/owner";
import OwnerBookingForm, { type OwnerBookingCustomer } from "@/components/owner/OwnerBookingForm";
import type { Service, StaffMember } from "@/lib/types";
import { formatPhone } from "@/lib/types";

// "New appointment" (PDF §4): reached from the Today page button and by
// clicking an empty calendar slot (which pre-fills date/time/staff).
export default async function DashboardNewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string; staffId?: string; customerId?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, business, memberStaffId } = await requireBusiness();

  const [{ data: serviceRows }, { data: staffRows }, { data: rels }] = await Promise.all([
    supabase
      .from("services")
      .select("id, business_id, name, duration_minutes, price_cents, active")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("staff")
      .select("id, business_id, name, active")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("business_customers")
      .select("customer_id, customers:customer_id ( full_name, email, phone )")
      .eq("business_id", business.id),
  ]);

  const customers: OwnerBookingCustomer[] = (rels ?? []).map((r) => {
    const row = r as unknown as {
      customer_id: string;
      customers: { full_name: string; email: string | null; phone: string | null } | null;
    };
    return {
      id: row.customer_id,
      name: row.customers?.full_name || "Customer",
      detail: [row.customers?.phone ? formatPhone(row.customers.phone) : null, row.customers?.email].filter(Boolean).join(" · "),
    };
  });

  return (
    <div>
      <p className="eyebrow">
        <Link href="/owner/dashboard/calendar">← Calendar</Link>
      </p>
      <h1 style={{ fontSize: 26 }}>New appointment</h1>
      <div className="card">
        <OwnerBookingForm
          businessId={business.id}
          slug={business.slug}
          timezone={business.timezone}
          services={(serviceRows ?? []) as Service[]}
          staff={(staffRows ?? []) as StaffMember[]}
          customers={customers}
          lockStaffId={memberStaffId}
          initialDate={sp.date}
          initialTime={sp.time}
          initialStaffId={sp.staffId}
          initialCustomerId={sp.customerId}
        />
      </div>
    </div>
  );
}
