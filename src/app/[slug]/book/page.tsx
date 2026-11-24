import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusinessPageData } from "@/lib/data";
import { getBillingState } from "@/lib/plans";
import BookingFlow from "@/components/BookingFlow";

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

  return (
    <main className="column">
      <BookingFlow
        slug={slug}
        businessName={page.business.name}
        timezone={page.business.timezone}
        services={page.services}
        staff={page.staff}
        demoMode={page.demoMode}
        preselectedServiceId={service}
      />
    </main>
  );
}
