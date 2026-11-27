import Link from "next/link";

// Friendly 404 (Customer Side Plan, Frantz 2026-11-26): a wrong or
// mistyped business link lands here: one calm business-family page
// with the plan's exact words, never a bare error. Platform paths
// that don't exist land here too and get the same calm treatment,
// with a way home.
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
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>This page doesn&apos;t exist.</h1>
          <p style={{ color: "#5b6b61", margin: "0 0 18px" }}>
            Check the link, or contact the business.
          </p>
          <Link href="/" className="bp-book" style={{ marginTop: 0 }}>
            Go to AppointEase
          </Link>
        </div>
        <p className="small center" style={{ marginTop: 18 }}>
          Powered by AppointEase
        </p>
      </main>
    </div>
  );
}
