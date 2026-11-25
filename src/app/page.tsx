import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";

// Landing page — copy and layout follow the design demo.
export default function HomePage() {
  const demoMode = !isSupabaseConfigured();
  return (
    <main className="column">
      {demoMode && (
        <div className="notice">
          Demo mode: the live database is not connected yet. The sample business
          page works end to end with demo data — nothing is saved.
        </div>
      )}

      <p className="eyebrow">Online booking for small businesses</p>
      <h1>Let customers book.<br />Get back to work.</h1>
      <p className="lede">
        Online booking and reminders for salons, barbershops, law firms, medical
        offices, and other appointment-based businesses.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 26 }}>
        <Link href="/owner/signup" className="btn btn-primary">Create your booking page</Link>
        <Link href="/jesus-barber-shop" className="btn">See a live example</Link>
      </div>

      <div className="card">
        <p className="eyebrow">Your booking link</p>
        <h2>One link for every customer</h2>
        <p className="lede" style={{ marginBottom: 10 }}>
          Every business gets its own page — <strong>appointease.io/your-business</strong> —
          to share on Google, Instagram, their website, or by text. Customers see
          your services, hours and phone number, and book in under a minute.
        </p>
        <Link href="/jesus-barber-shop" className="btn">Open the sample business page</Link>
      </div>

      <div className="card">
        <p className="eyebrow">Reminders that bring people in</p>
        <h2>Fewer no-shows, automatically</h2>
        <p className="lede" style={{ marginBottom: 10 }}>
          Every appointment gets a confirmation, then a text and email 24 hours
          before and again 2 hours before — each with a link to reschedule or
          cancel, so changes happen early instead of at the door.
        </p>
      </div>

      <div className="card">
        <p className="eyebrow">Try it as a customer</p>
        <h2>Meet Jesus Barber Shop</h2>
        <p className="lede" style={{ marginBottom: 10 }}>
          Look through the services, pick a time, and book — the way your own
          customers will.
        </p>
        <Link href="/jesus-barber-shop" className="btn btn-primary">Visit the shop</Link>
      </div>

      <div className="card">
        <p className="eyebrow">Simple pricing</p>
        <h2>Priced by the size of your team</h2>
        <p className="lede" style={{ marginBottom: 6 }}>
          <strong>Solo $29.99/mo</strong> — 1 team member · <strong>Team $49.99/mo</strong> — up to 5 ·
          <strong> Business $149.99/mo</strong> — up to 15. Every plan starts with a
          30-day free trial, no card required.
        </p>
      </div>
    </main>
  );
}
