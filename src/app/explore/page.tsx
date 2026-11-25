import type { Metadata } from "next";
import { getPublishedBusinesses } from "@/lib/data";
import { CATEGORIES } from "@/lib/categories";
import ExploreDirectory from "@/components/ExploreDirectory";

export const metadata: Metadata = {
  title: "Find a business near you — AppointEase",
  description:
    "Browse barbershops, salons, law offices, clinics and more that take bookings on AppointEase. Pick a business, pick a time, done.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const initialCategory =
    category && CATEGORIES.some((c) => c.slug === category) ? category : "all";
  const { businesses, demoMode } = await getPublishedBusinesses();

  return (
    <main className="mkt">
      <div className="mkt-container">
        <div className="explore-head">
          <p className="eyebrow">Marketplace</p>
          <h1>Find a business near you</h1>
          <p className="lede">
            Browse local businesses that take bookings on AppointEase — pick
            one, pick a time, done.
          </p>
        </div>
        {demoMode && (
          <div className="notice">
            Demo mode: the live database is not connected yet — showing the
            sample business only.
          </div>
        )}
        <ExploreDirectory businesses={businesses} initialCategory={initialCategory} />
      </div>
    </main>
  );
}
