import { requireBusiness } from "@/lib/owner";
import BusinessDetailsForm from "@/components/owner/BusinessDetailsForm";
import ServicesManager from "@/components/owner/ServicesManager";
import HoursManager from "@/components/owner/HoursManager";
import StaffManager from "@/components/owner/StaffManager";
import PublishButton from "@/components/owner/PublishButton";
import PushOptIn from "@/components/PushOptIn";
import type { Availability } from "@/lib/types";

export default async function DashboardSettingsPage() {
  const { supabase, business } = await requireBusiness();

  const { data: availability } = await supabase
    .from("availability")
    .select("*")
    .eq("business_id", business.id);
  const { count: serviceCount } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("active", true);
  const hours = (availability ?? []) as Availability[];

  const trialEnd = new Date(business.trial_ends_at).toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Settings</h1>

      <div className="card">
        <h2>Plan</h2>
        <p className="lede" style={{ marginBottom: 6 }}>
          Free trial until <strong>{trialEnd}</strong> — no card required.
        </p>
        <p className="small">
          After the trial: Solo $19/mo (1 team member) · Team $39/mo (up to 5) ·
          Business $79/mo (up to 15). Paid checkout (Stripe) arrives in the next
          phase; until then your page simply keeps running.
        </p>
      </div>

      <div className="card">
        <h2>Booking page</h2>
        <PublishButton
          businessId={business.id}
          published={business.published}
          ready={(serviceCount ?? 0) >= 1 && hours.length >= 1}
        />
      </div>

      <div className="card">
        <h2>Business details</h2>
        <BusinessDetailsForm business={business} />
      </div>

      <div className="card">
        <h2>Services</h2>
        <ServicesManager businessId={business.id} />
      </div>

      <div className="card">
        <h2>Team</h2>
        <StaffManager businessId={business.id} />
      </div>

      <div className="card">
        <h2>Opening hours</h2>
        <HoursManager businessId={business.id} initial={hours} />
      </div>

      <div className="card">
        <h2>New-message alerts</h2>
        <p className="small" style={{ marginBottom: 10 }}>
          A customer message already triggers an email to your business email
          the moment it lands. Add push so it reaches this device instantly too:
        </p>
        <PushOptIn />
      </div>
    </div>
  );
}
