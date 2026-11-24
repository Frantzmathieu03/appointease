import { requireBusiness } from "@/lib/owner";
import BusinessDetailsForm from "@/components/owner/BusinessDetailsForm";
import ServicesManager from "@/components/owner/ServicesManager";
import HoursManager from "@/components/owner/HoursManager";
import StaffManager from "@/components/owner/StaffManager";
import PublishButton from "@/components/owner/PublishButton";
import BillingPanel from "@/components/owner/BillingPanel";
import BusinessMediaManager from "@/components/owner/BusinessMediaManager";
import PushOptIn from "@/components/PushOptIn";
import { getBillingState, planById } from "@/lib/plans";
import { isAnnualBillingConfigured, isBillingConfigured } from "@/lib/stripe";
import type { Availability, BusinessPhoto } from "@/lib/types";

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
  const { data: photoRows } = await supabase
    .from("business_photos")
    .select("*")
    .eq("business_id", business.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const hours = (availability ?? []) as Availability[];

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
  const billing = getBillingState(business);

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Settings</h1>

      <div className="card">
        <h2>Plan &amp; billing</h2>
        <BillingPanel
          billingConfigured={isBillingConfigured()}
          annualConfigured={isAnnualBillingConfigured()}
          currentPlanId={planById(business.plan).id}
          phase={billing.phase}
          subscriptionStatus={billing.subscriptionStatus}
          hasStripeCustomer={!!business.stripe_customer_id}
          trialEndLabel={fmtDate(business.trial_ends_at)}
          periodEndLabel={billing.currentPeriodEnd ? fmtDate(billing.currentPeriodEnd) : null}
          pausesAtLabel={billing.pausesAt ? fmtDate(billing.pausesAt) : null}
        />
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
        <h2>Logo &amp; photos</h2>
        <BusinessMediaManager
          businessId={business.id}
          initialLogoUrl={business.logo_url}
          initialPhotos={(photoRows ?? []) as BusinessPhoto[]}
        />
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
