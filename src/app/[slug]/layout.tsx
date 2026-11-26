import { getBusinessPageDataWithPreview } from "@/lib/data";
import BusinessHeader from "@/components/BusinessHeader";

// Business pages wear the business's own branding only (white label,
// Frantz 2026-11-25): this layout puts the slim business header on top
// of every /<slug> surface (page, booking, messaging) and one small
// "Powered by AppointEase" line at the very bottom. The global
// AppointEase header/footer (SiteChrome) renders nothing on these
// paths. Unknown slugs render bare — the page itself 404s.
export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
