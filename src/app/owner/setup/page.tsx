import Link from "next/link";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getOwnerBusiness, requireUser, siteUrl } from "@/lib/owner";
import CreateBusinessForm from "@/components/owner/CreateBusinessForm";
import BusinessDetailsForm from "@/components/owner/BusinessDetailsForm";
import HoursManager from "@/components/owner/HoursManager";
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
        <Link href="/main-street-barbers" className="btn btn-primary btn-block">
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

  const { data: availability } = await supabase
    .from("availability")
    .select("*")
    .eq("business_id", business.id);
  const hours = (availability ?? []) as Availability[];
  // Only the name is required to create the business (Frantz,
  // 2026-11-25) — address, phone and the rest are optional and can be
  // added anytime, so this step is done once the business exists.
  const detailsDone = Boolean(business.name);
  const hoursDone = hours.length >= 1;
  const link = `${siteUrl()}/${business.slug}`;

  // Setup stays short on purpose (Frantz, 2026-11-25): business basics,
  // opening hours, publish. Services, team and photos all live in the
  // dashboard, after the account exists.
  const steps = [
    { label: "Business created — link reserved", done: true },
    { label: "Business details", done: detailsDone },
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
        <h2>Opening hours</h2>
        <HoursManager businessId={business.id} initial={hours} />
      </div>

      <div className="card">
        <h2>Publish</h2>
        <PublishButton
          businessId={business.id}
          published={business.published}
          initialMissing={hoursDone ? [] : ["opening hours"]}
        />
        {business.published && (
          <p className="small" style={{ marginTop: 10 }}>
            Next, in your dashboard: add your services, your team, and your
            logo and photos — your page starts taking bookings as soon as
            your first service is added.
          </p>
        )}
      </div>
    </main>
  );
}
