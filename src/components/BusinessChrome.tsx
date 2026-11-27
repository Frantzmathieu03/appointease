import { getBusinessPageDataWithPreview } from "@/lib/data";
import BusinessHeader from "@/components/BusinessHeader";

// The slim business header + "Powered by" line that the business's
// book / message / my surfaces wear (white label, Frantz 2026-11-25).
// The main business page renders its own top row and footer per
// Frantz's page plan (2026-11-26), so this chrome is applied by the
// sub-route layouts only: its markup and behavior are exactly what
// the shared [slug] layout rendered before the plan.
export default async function BusinessChrome({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const page = await getBusinessPageDataWithPreview(slug);
  if (!page) return <>{children}</>;
  const { business } = page;

  return (
    <>
      <div className="column" style={{ paddingBottom: 0 }}>
        <BusinessHeader slug={slug} name={business.name} logoUrl={business.logo_url} businessId={business.id} ownerId={business.owner_id} />
      </div>
      {children}
      <div className="column" style={{ paddingTop: 0 }}>
        <p className="small center" style={{ margin: 0 }}>
          Powered by AppointEase
        </p>
      </div>
    </>
  );
}
