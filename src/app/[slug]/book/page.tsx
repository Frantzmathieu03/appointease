import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBusinessPageDataWithPreview } from "@/lib/data";
import { getBillingState } from "@/lib/plans";
import { isDemoShop } from "@/lib/demo";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  ensureBusinessMembership,
  ensureCustomerProfile,
  isBusinessMember,
  isBusinessTeamMember,
} from "@/lib/profile";
import { createAdminSupabase } from "@/lib/supabase";
import BookingFlow from "@/components/BookingFlow";
import AccountGate from "@/components/AccountGate";
import JoinStep from "@/components/JoinStep";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string; join?: string; consent?: string }>;
}) {
  const { slug } = await params;
  const { service, join, consent } = await searchParams;
  const page = await getBusinessPageDataWithPreview(slug);
  if (!page) notFound();

  // Same billing gate as the business page: paused businesses can't take
  // new bookings (existing appointments are unaffected).
  if (!getBillingState(page.business).bookingLive) {
    return (
      <main className="column book-column">
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
  // BUSINESS. Being signed in to AppointEase alone is not enough —
  // the gate keys off membership of this business, never the bare
  // session:
  let accountPrefill: { name: string; email: string; phone: string } | null =
    null;
  //   - signed out: the short account step (Google, or email
  //     sign-up/sign-in), which returns here carrying the join marker;
  //   - signed in, not a member of this business (the owner testing
  //     their own page included): the join step — one tap joins this
  //     business and continues into booking. A visitor who just
  //     completed sign-in/sign-up through this business's own account
  //     step arrives with the join marker and is joined on the spot;
  //     they land on their own customer dashboard (/<slug>/my),
  //     never back on the storefront (Frantz, 2026-11-26), and book
  //     from there;
  //   - signed-in member: straight into the booking flow.
  // Demo shops and demo mode stay account-free simulations, as before.
  if (!page.demoMode && !isDemoShop(slug) && isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return (
        <main className="column book-column">
          <p className="eyebrow">{page.business.name}</p>
          <h1 className="center" style={{ fontSize: 28, marginBottom: 14 }}>Book an appointment</h1>
          <AccountGate slug={slug} businessName={page.business.name} />
          <p className="small center" style={{ marginTop: 14 }}>
            <Link href={`/${slug}`}>← Back to {page.business.name}</Link>
          </p>
        </main>
      );
    }
    const business = page.business;
    const isOwner = user.id === business.owner_id;
    // Owners and active team members never hit the join wall on their
    // own business (Frantz, 2026-11-26): they are joined as customers
    // silently and continue straight into the booking flow, so the
    // owner can test the exact client experience end to end.
    const onTeam =
      isOwner ||
      (await isBusinessTeamMember(createAdminSupabase(), business.id, user.id));
    let member = await isBusinessMember(supabase, business.id, user.id);
    if (!member && onTeam) {
      await ensureCustomerProfile(supabase, user);
      await ensureBusinessMembership(supabase, business.id, user.id, {
        smsConsent: consent === "1",
      });
      member = true;
    }
    if (!member) {
      if (join) {
        await ensureCustomerProfile(supabase, user);
        await ensureBusinessMembership(supabase, business.id, user.id, {
          smsConsent: consent === "1",
        });
        // Joined through this business's account step: land on the
        // customer's own dashboard, not back at the storefront or
        // into a half-started flow (Frantz, 2026-11-26). Their
        // dashboard's Book button starts the booking from there.
        redirect(`/${slug}/my`);
      }
      return (
        <main className="column book-column">
          <p className="eyebrow">{business.name}</p>
          <h1 className="center" style={{ fontSize: 28, marginBottom: 14 }}>Book an appointment</h1>
          <JoinStep
            slug={slug}
            businessName={business.name}
            businessId={business.id}
            continuePath={
              service
                ? `/${slug}/book?service=${encodeURIComponent(service)}`
                : `/${slug}/book`
            }
            actionLabel={`Join ${business.name} and book`}
          />
          <p className="small center" style={{ marginTop: 14 }}>
            <Link href={`/${slug}`}>← Back to {business.name}</Link>
          </p>
        </main>
      );
    }
    await ensureCustomerProfile(supabase, user);
    // The member's own details, resolved here on the server so step 3
    // of the flow starts filled from their account.
    const { data: profile } = await supabase
      .from("customers")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .maybeSingle();
    accountPrefill = {
      name:
        profile?.full_name ??
        (user.user_metadata?.full_name as string) ??
        (user.user_metadata?.name as string) ??
        "",
      email: profile?.email ?? user.email ?? "",
      phone: profile?.phone ?? "",
    };
  }

  return (
    <main className="column book-column">
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
        cancellationPolicy={page.business.cancellation_policy ?? null}
        prefill={accountPrefill}
      />
    </main>
  );
}
