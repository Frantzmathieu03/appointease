import Link from "next/link";

// Friendly 404 (Customer Side Plan, Frantz 2026-11-26; wording per
// the fix guide, 2026-11-27): a wrong or mistyped link lands here:
// one calm page with the guide's words and three clear ways forward,
// never a bare error.
export default function NotFound() {
  return (
    <div className="bizpage">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      <main className="bp-column" style={{ paddingTop: 64 }}>
        <div className="bp-card center" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>We couldn&apos;t find that page.</h1>
          <p style={{ color: "#5b6b61", margin: "0 0 18px" }}>
            The link may be old or mistyped. If you were trying to book,
            ask the business for their AppointEase link.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/" className="bp-book" style={{ marginTop: 0 }}>
              Home
            </Link>
            <Link href="/login" className="btn" style={{ justifyContent: "center" }}>
              Log in
            </Link>
            <Link href="/owner/signup" className="btn" style={{ justifyContent: "center" }}>
              Start free
            </Link>
          </div>
        </div>
        <p className="small center" style={{ marginTop: 18 }}>
          Powered by AppointEase
        </p>
      </main>
    </div>
  );
}
