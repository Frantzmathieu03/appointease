import { notFound } from "next/navigation";
import { getBusinessPageData } from "@/lib/data";
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
