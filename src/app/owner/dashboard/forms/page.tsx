import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/owner";
import FormsManager from "@/components/owner/FormsManager";
import type { Service } from "@/lib/types";

// Intake forms (PDF §4): list, builder, phone-frame preview, the
// law-firm starter template, and visit-note templates (PDF §7).
// Owner / manager territory — staff logins don't manage forms.
export default async function DashboardFormsPage() {
  const { supabase, business, role } = await requireBusiness();
  if (role === "staff") redirect("/owner/dashboard");

  const { data: serviceRows } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });
  const services = (serviceRows ?? []) as Service[];

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Forms</h1>
      <p className="small" style={{ marginTop: 0, maxWidth: 560 }}>
        Intake forms are completed by the customer before their visit.
        Build a form here, then attach it to a service in Settings →
        Services — the customer gets a “Complete your intake form” step
        on their booking, and their answers land on the appointment and
        on their profile.
      </p>
      <FormsManager businessId={business.id} services={services} />
    </div>
  );
}
