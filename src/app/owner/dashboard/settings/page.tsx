import Link from "next/link";
import { redirect } from "next/navigation";
import { requireBusiness, siteUrl } from "@/lib/owner";
import BusinessDetailsForm from "@/components/owner/BusinessDetailsForm";
import ServicesManager from "@/components/owner/ServicesManager";
import HoursManager from "@/components/owner/HoursManager";
import PublishButton from "@/components/owner/PublishButton";
import BillingPanel from "@/components/owner/BillingPanel";
import BusinessMediaManager from "@/components/owner/BusinessMediaManager";
import LocationsManager from "@/components/owner/LocationsManager";
import PushOptIn from "@/components/PushOptIn";
import CopyLinkButton from "@/components/CopyLinkButton";
import { getBillingState, planById } from "@/lib/plans";
import { isAnnualBillingConfigured, isBillingConfigured } from "@/lib/stripe";
import type { Availability, BusinessPhoto } from "@/lib/types";

export default async function DashboardSettingsPage() {
  const { supabase, business, role } = await requireBusiness();
  // Settings (business details, billing, services, hours) are owner /
  // manager territory — staff logins work from Today/Calendar/Inbox/
  // Customers only (PDF §9). Billing changes stay owner-gated inside
  // the billing API routes as before.
  if (role === "staff") redirect("/owner/dashboard");

  const { data: availability } = await supabase
    .from("availability")
    .select("*")
    .eq("business_id", business.id);
  const { data: photoRows } = await supabase
    .from("business_photos")
    .select("*")
    .eq("business_id", business.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const hours = (availability ?? []) as Availability[];
  const bookingLink = `${siteUrl()}/${business.slug}`;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
  const billing = getBillingState(business);

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Settings</h1>

      <div className="card">
        <h2>Business details</h2>
        <p className="small" style={{ marginBottom: 4 }}>
          Booking link: <strong>{bookingLink.replace(/^https?:\/\//, "")}</strong>
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <CopyLinkButton url={bookingLink} />
          <Link href={`/${business.slug}`} className="btn">View booking page</Link>
        </div>
        <BusinessDetailsForm business={business} />
        <h2 style={{ marginTop: 22 }}>Opening hours</h2>
        <HoursManager businessId={business.id} initial={hours} />
      </div>

      <div className="card">
        <h2>Locations</h2>
        <LocationsManager businessId={business.id} />
      </div>

      <div className="card">
        <h2>Reminder schedule</h2>
        <p className="small" style={{ margin: 0 }}>
          Every confirmed appointment gets a confirmation right away, then a
          reminder 24 hours before and another 2 hours before — by text
          message and email at the same time (when the booking is made far
          enough ahead). Every reminder carries the customer&apos;s secure
          link to reschedule or cancel.
        </p>
      </div>

      <div className="card" id="billing">
        <h2>Plan &amp; billing</h2>
        <p className="small" style={{ marginTop: 0 }}>
          Your plan at a glance also lives on the{" "}
          <Link href="/owner/dashboard/billing">Billing page</Link> — same
          buttons, plus your seats and texts sent.
        </p>
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
          initialMissing={hours.length >= 1 ? [] : ["opening hours"]}
        />
      </div>

      <div className="card" id="profile">
        <h2>Profile — logo &amp; photos (optional)</h2>
        <p className="small" style={{ marginBottom: 10 }}>
          Optional — your logo and up to four photos of your work make your
          booking page feel like your shop. You can publish and take bookings
          without them, and add them anytime.
        </p>
        <BusinessMediaManager
          businessId={business.id}
          initialLogoUrl={business.logo_url}
          initialPhotos={(photoRows ?? []) as BusinessPhoto[]}
        />
      </div>

      <div className="card" id="services">
        <h2>Services</h2>
        <ServicesManager businessId={business.id} />
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
