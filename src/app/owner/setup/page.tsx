import Link from "next/link";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getOwnerBusiness, requireUser, siteUrl } from "@/lib/owner";
import CreateBusinessForm from "@/components/owner/CreateBusinessForm";
import BusinessDetailsForm from "@/components/owner/BusinessDetailsForm";
import ServicesManager from "@/components/owner/ServicesManager";
import HoursManager from "@/components/owner/HoursManager";
import StaffManager from "@/components/owner/StaffManager";
import PublishButton from "@/components/owner/PublishButton";
import CopyLinkButton from "@/components/CopyLinkButton";
import type { Availability } from "@/lib/types";

export default async function OwnerSetupPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="column">
        <div className="notice">
          Demo mode — business setup turns on when the live database is connected.
        </div>
        <Link href="/jesus-barber-shop" className="btn btn-primary btn-block">
          See a finished business page
        </Link>
      </main>
    );
  }

  const { supabase, user } = await requireUser();
  const business = await getOwnerBusiness(supabase, user.id);

  if (!business) {
    return (
      <main className="column">
        <p className="eyebrow">Set up your business</p>
        <h1 style={{ fontSize: 29 }}>First, name your business</h1>
        <p className="lede">Your booking link is reserved the moment you create it.</p>
        <div className="card">
          <CreateBusinessForm />
        </div>
      </main>
    );
  }

  const [{ count: serviceCount }, { data: availability }, { count: staffCount }] = await Promise.all([
    supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("active", true),
    supabase.from("availability").select("*").eq("business_id", business.id),
    supabase.from("staff").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("active", true),
  ]);
  const hours = (availability ?? []) as Availability[];
  const detailsDone = Boolean(business.name && business.address && business.phone);
  const servicesDone = (serviceCount ?? 0) >= 1;
  const hoursDone = hours.length >= 1;
  const link = `${siteUrl()}/${business.slug}`;

  const steps = [
    { label: "Business created — link reserved", done: true },
    { label: "Business details (address + office phone)", done: detailsDone },
    { label: "At least one service", done: servicesDone },
    { label: "Opening hours", done: hoursDone },
    { label: "Publish your booking page", done: business.published },
  ];

  return (
    <main className="column column-wide">
      <p className="eyebrow">Set up {business.name}</p>
      <h1 style={{ fontSize: 29 }}>Your setup checklist</h1>

      <div className="card">
        <ul className="checklist">
          {steps.map((s) => (
            <li key={s.label}>
              <span className={s.done ? "check-dot done" : "check-dot"}>{s.done ? "✓" : ""}</span>
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
        <p className="small" style={{ marginTop: 12 }}>
          Your link: <strong>{link}</strong>
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <CopyLinkButton url={link} />
          <Link href={`/${business.slug}`} className="btn">Preview my page</Link>
          {business.published && (
            <Link href="/owner/dashboard" className="btn btn-primary">Open my dashboard</Link>
          )}
        </div>
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
        <h2>Team {(staffCount ?? 0) > 0 ? `(${staffCount})` : ""}</h2>
        <StaffManager businessId={business.id} />
      </div>

      <div className="card">
        <h2>Opening hours</h2>
        <HoursManager businessId={business.id} initial={hours} />
      </div>

      <div className="card">
        <h2>Publish</h2>
        <PublishButton businessId={business.id} published={business.published} ready={servicesDone && hoursDone} />
      </div>
    </main>
  );
}
