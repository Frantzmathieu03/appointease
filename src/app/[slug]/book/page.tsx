import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusinessPageData } from "@/lib/data";
import { getBillingState } from "@/lib/plans";
import { isDemoShop } from "@/lib/demo";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { ensureBusinessMembership, ensureCustomerProfile } from "@/lib/profile";
import BookingFlow from "@/components/BookingFlow";
import AccountGate from "@/components/AccountGate";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { slug } = await params;
  const { service } = await searchParams;
  const page = await getBusinessPageData(slug);
  if (!page) notFound();

  // Same billing gate as the business page: paused businesses can't take
  // new bookings (existing appointments are unaffected).
  if (!getBillingState(page.business).bookingLive) {
    return (
      <main className="column">
        <div className="card center">
          <h2>Online booking is temporarily unavailable</h2>
          <p className="lede">
            {page.business.name} isn&apos;t taking online bookings right now.
          </p>
          <p className="small">
            <Link href={`/${slug}`}>← Back to {page.business.name}</Link>
          </p>
        </div>
      </main>
    );
  }

  // Account-first booking (Frantz, 2026-11-25): a booking from a
  // business's page belongs to the customer's account WITH THIS
  // BUSINESS. Signed-out customers get the short account step first
  // (Google, or email sign-up/sign-in) and land right back here;
  // signed-in customers go straight in — and arriving signed in joins
  // them to this business (the per-business membership). Demo shops
  // and demo mode stay account-free simulations, as before.
  if (!page.demoMode && !isDemoShop(slug) && isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return (
        <main className="column">
          <p className="eyebrow">{page.business.name}</p>
          <h1 style={{ fontSize: 28, marginBottom: 14 }}>Book an appointment</h1>
          <AccountGate slug={slug} businessName={page.business.name} />
          <p className="small center" style={{ marginTop: 14 }}>
            <Link href={`/${slug}`}>← Back to {page.business.name}</Link>
          </p>
        </main>
      );
    }
    await ensureCustomerProfile(supabase, user);
    await ensureBusinessMembership(supabase, page.business.id, user.id);
  }

  return (
    <main className="column">
      <BookingFlow
        slug={slug}
        businessName={page.business.name}
        businessAddress={page.business.address}
        timezone={page.business.timezone}
        services={page.services}
        staff={page.staff}
        staffServices={page.staffServices}
        availability={page.availability}
        demoMode={page.demoMode}
        demoShop={isDemoShop(slug)}
        preselectedServiceId={service}
      />
    </main>
  );
}
