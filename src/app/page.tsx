import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PLANS, formatPlanPrice } from "@/lib/plans";

// Landing page — visual-first marketing page. Short copy, real product
// claims only: no testimonials, no invented counts or ratings.
export default function HomePage() {
  const demoMode = !isSupabaseConfigured();
  return (
    <main className="mkt">
      <div className="mkt-container">
        {demoMode && (
          <div className="notice" style={{ marginTop: 18 }}>
            Demo mode: the live database is not connected yet. The sample business
            page works end to end with demo data — nothing is saved.
          </div>
        )}

        {/* Hero */}
        <section className="mkt-hero">
          <div className="hero-grid">
            <div>
              <p className="eyebrow">Online booking for small businesses</p>
              <h1>Let customers book.<br />Get back to work.</h1>
              <p className="hero-sub">
                Your own booking page with automatic text &amp; email reminders —
                so fewer people forget, and you spend less time on the phone.
              </p>
              <div className="hero-ctas">
                <Link href="/owner/signup" className="btn btn-primary btn-lg">Create your booking page</Link>
                <Link href="/jesus-barber-shop" className="btn btn-lg">See a live example</Link>
              </div>
              <p className="trust-line">30-day free trial · No card required · Customers always book free</p>
            </div>
            <div className="hero-media">
              <video autoPlay muted loop playsInline poster="/images/hero-barbershop.jpg">
                <source src="/videos/hero-loop.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
          <div className="chips-strip" aria-label="Business types">
            {["Barbershops", "Hair salons", "Law offices", "Clinics", "Nail salons", "Studios", "Pet groomers", "Auto repair"].map((c) => (
              <span key={c} className="chip chip-lg">{c}</span>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mkt-section">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2>Live in three steps</h2>
          </div>
          <div className="split">
            <div>
              <div className="step-row">
                <span className="step-num">1</span>
                <div>
                  <h3>Create your page</h3>
                  <p>Add your services, prices and hours. Your page gets its own link — appointease.io/your-business.</p>
                </div>
              </div>
              <div className="step-row">
                <span className="step-num">2</span>
                <div>
                  <h3>Share your link</h3>
                  <p>Put it on Google, Instagram, your website, or send it by text. Customers pick a time and book in under a minute.</p>
                </div>
              </div>
              <div className="step-row">
                <span className="step-num">3</span>
                <div>
                  <h3>Get booked &amp; reminded</h3>
                  <p>Confirmations and reminders go out by text and email automatically — every booking, every time.</p>
                </div>
              </div>
            </div>
            <div className="split-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/booking-phone.jpg" alt="A business owner checking bookings on a phone" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mkt-section">
          <div className="section-head">
            <p className="eyebrow">Features</p>
            <h2>Everything an appointment business needs</h2>
          </div>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">📅</div>
              <h3>Your own booking page</h3>
              <p>Your services, hours and phone number on one clean page with your own link.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔔</div>
              <h3>Automatic reminders</h3>
              <p>Text and email at confirmation, 24 hours before, and 2 hours before — no chasing.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Two-way messaging</h3>
              <p>Customers message you right from their booking, with unread badges so nothing slips by.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔁</div>
              <h3>Easy reschedule &amp; cancel</h3>
              <p>Every reminder carries a secure link, so changes happen early instead of at the door.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Team calendars</h3>
              <p>Staff members with their own services and hours — customers book the right person.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Get discovered</h3>
              <p>Customers browse by category and location. You pick your category when you sign up.</p>
            </div>
          </div>
        </section>

        {/* Built for your business */}
        <section className="mkt-section">
          <div className="section-head">
            <p className="eyebrow">Built for your business</p>
            <h2>Made for the way you work</h2>
          </div>
          <div className="img-cards">
            <div className="img-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/hero-barbershop.jpg" alt="A barber at work in a bright barbershop" />
              <div className="img-card-body">
                <h3>Barbershops</h3>
                <p>Chairs stay full with online booking and reminders that cut no-shows.</p>
              </div>
            </div>
            <div className="img-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/salon.jpg" alt="A stylist working in a bright hair salon" />
              <div className="img-card-body">
                <h3>Salons &amp; spas</h3>
                <p>Per-stylist services and hours, so clients book the right chair every time.</p>
              </div>
            </div>
            <div className="img-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/office.jpg" alt="A professional greeting a client in a bright office" />
              <div className="img-card-body">
                <h3>Law offices &amp; clinics</h3>
                <p>Consultations booked ahead, with confirmations your clients actually see.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Demo showcase */}
        <section className="mkt-section">
          <div className="showcase">
            <div>
              <p className="eyebrow" style={{ color: "#bcd8c2" }}>Try it as a customer</p>
              <h2>Meet Jesus Barber Shop</h2>
              <p>
                This is a real AppointEase booking page. Look through the services,
                pick a time, and book — the way your own customers will.
              </p>
              <div style={{ marginTop: 20 }}>
                <Link href="/jesus-barber-shop" className="btn btn-white btn-lg">Visit the shop</Link>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hero-barbershop.jpg" alt="Inside Jesus Barber Shop" />
          </div>
        </section>

        {/* Pricing */}
        <section className="mkt-section">
          <div className="section-head">
            <p className="eyebrow">Pricing</p>
            <h2>Priced by the size of your team</h2>
            <p className="lede">Every plan starts with a 30-day free trial. No card required.</p>
          </div>
          <div className="pricing-grid">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`price-card${plan.id === "team" ? " featured" : ""}`}>
                {plan.id === "team" && <span className="price-badge">Best for growing teams</span>}
                <div className="price-name">{plan.name}</div>
                <div className="price-amount">
                  {formatPlanPrice(plan.monthlyCents)}<span>/mo</span>
                </div>
                <p className="small" style={{ margin: 0 }}>
                  {plan.staffLimit === 1 ? "1 team member" : `Up to ${plan.staffLimit} team members`}
                </p>
                <p className="price-blurb">{plan.blurb}</p>
                <Link href="/owner/signup" className={`btn ${plan.id === "team" ? "btn-primary" : ""} btn-block`}>
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
          <p className="pricing-note">
            The first 10 businesses to sign up keep launch pricing for life. Customers never pay to book.
          </p>
        </section>

        {/* FAQ */}
        <section className="mkt-section">
          <div className="section-head">
            <p className="eyebrow">Questions</p>
            <h2>Good to know</h2>
          </div>
          <div className="faq-list">
            <details className="faq-item">
              <summary>Does it cost my customers anything to book?</summary>
              <p>No. Booking is always free for customers — only businesses subscribe, after their free trial.</p>
            </details>
            <details className="faq-item">
              <summary>How does the free trial work?</summary>
              <p>Every plan starts with 30 days free, no card required. If you don&apos;t subscribe when the trial ends, your page pauses — your data is never deleted.</p>
            </details>
            <details className="faq-item">
              <summary>How do reminders work?</summary>
              <p>Each appointment gets a confirmation, then a reminder 24 hours before and another 2 hours before — by text message and email at the same time, each with a link to reschedule or cancel.</p>
            </details>
            <details className="faq-item">
              <summary>Can my staff have their own calendars?</summary>
              <p>Yes. Team and Business plans include multiple staff members, each with their own services and working hours.</p>
            </details>
            <details className="faq-item">
              <summary>Can I cancel anytime?</summary>
              <p>Yes. You can cancel your subscription from your billing settings whenever you like — no phone call, no cancellation fee.</p>
            </details>
          </div>
        </section>

        {/* Final CTA */}
        <section className="cta-band">
          <h2>Your next customer is looking for a time.</h2>
          <p>Give them a page where they can book it — free for 30 days.</p>
          <Link href="/owner/signup" className="btn btn-white btn-lg">Create your booking page</Link>
        </section>
      </div>
    </main>
  );
}
