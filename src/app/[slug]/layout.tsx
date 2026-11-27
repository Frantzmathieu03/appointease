// Business pages wear the business's own branding only (white label,
// Frantz 2026-11-25). Per his page plan (2026-11-26) every /<slug>
// surface also shares the plan's scope: the Inter font and the
// #F3F6F1 page background (.bizpage in globals.css). The global
// AppointEase header/footer (SiteChrome) renders nothing on these
// paths. The main page renders its own top row and footer from the
// plan; the book / message / my sub-routes add the slim business
// header via their own layouts (BusinessChrome), exactly as this
// layout rendered it before the plan. Unknown slugs render bare: 
// the page itself 404s.
export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bizpage">
      {/* Inter (plan spec: 400/600/700), scoped to business pages. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </div>
  );
}
