import BusinessChrome from "@/components/BusinessChrome";

// The message surface keeps the slim business header + Powered line
// it has always worn (BusinessChrome); only the main business page
// changed in Frantz's 2026-11-26 page plan.
export default async function MessageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <BusinessChrome slug={slug}>{children}</BusinessChrome>;
}
