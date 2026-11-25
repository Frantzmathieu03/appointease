import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PLANS, formatPlanPrice } from "@/lib/plans";

const BENEFITS = [
  { icon: "📞", title: "No more phone tag", line: "Customers book themselves online, so your phone stays free for the work." },
  { icon: "🔔", title: "Fewer no-shows", line: "Automatic text and email reminders bring people in, on time." },
  { icon: "🌙", title: "Book while you sleep", line: "Your page takes bookings around the clock, even after closing time." },
  { icon: "🎨", title: "Your page, your brand", line: "Your services, your hours, your own link — a page that looks like your business." },
  { icon: "🗂️", title: "Every customer in one place", line: "Bookings, history and messages for each customer, kept together." },
  { icon: "🔁", title: "Reschedules handle themselves", line: "Every reminder carries a secure link to reschedule or cancel." },
  { icon: "📩", title: "Text and email, every time", line: "Confirmation, 24-hour and 2-hour reminders go out on both channels." },
  { icon: "👥", title: "Your whole team, one calendar", line: "Each staff member gets their own services, hours and bookings." },
  { icon: "🔍", title: "Customers find you", line: "Get discovered by category and location when customers browse." },
  { icon: "⚡", title: "Set up in minutes", line: "Add your services and hours, publish, and share your link the same day." },
  { icon: "💚", title: "Free for your customers", line: "Booking never costs your customers a cent — only businesses subscribe." },
  { icon: "🤝", title: "Support from real people", line: "Questions? A human answers — by email, whenever you need help." },
];

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

        {/* Hero — full-background photo, headline on the image */}
        <section className="mkt-hero">
          <div className="hero-panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="hero-bg-img" src="/images/salon-action.jpg" alt="" aria-hidden="true" />
            <div className="hero-overlay" />
            <div className="hero-content">
              <p className="eyebrow">Online booking for small businesses</p>
              <h1>Let customers book.<br />Get back to work.</h1>
              <p className="hero-sub">Your booking page with automatic reminders — fewer no-shows, less phone time.</p>
              <div className="hero-ctas">
                <Link href="/owner/signup" className="btn btn-primary btn-lg">Create your booking page</Link>
                <Link href="/jesus-barber-shop" className="btn btn-lg">See a live example</Link>
              </div>
            </div>
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

        {/* Reminder showcase — a product example on the demo business */}
        <section className="mkt-section">
          <div className="section-head">
            <p className="eyebrow">Automatic reminders</p>
            <h2>Reminders that bring people in</h2>
            <p className="lede">Every appointment gets a confirmation, a 24-hour reminder, and a 2-hour reminder — by text and email.</p>
          </div>
          <div className="showcase-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/reception.jpg" alt="A barber greeting a customer at the reception counter" />
            <div className="notify-card">
              <p className="notify-status"><span className="notify-dot" />Reminder sent successfully</p>
              <p className="notify-text">
                Hi <span className="notify-hl">Maria</span> 👋 Reminder for your appointment at{" "}
                <span className="notify-hl">Jesus Barber Shop</span> tomorrow at 10:00 AM.
              </p>
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

        {/* Benefits carousel — honest benefit cards, no testimonials:
            AppointEase is new, so no invented names, quotes or ratings.
            Real customer quotes can replace these cards later. */}
        <section className="mkt-section">
          <div className="section-head">
            <p className="eyebrow">Why AppointEase</p>
            <h2>Made for businesses that run on appointments</h2>
          </div>
          <div className="carousel" aria-label="AppointEase benefits">
            {BENEFITS.map((b) => (
              <div className="benefit-card" key={b.title}>
                <div className="feature-icon">{b.icon}</div>
                <h3>{b.title}</h3>
                <p>{b.line}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Built for your kind of business */}
        <section className="mkt-section">
          <div className="section-head">
            <p className="eyebrow">Who it&apos;s for</p>
            <h2>Built for your kind of business</h2>
          </div>
          <div className="img-cards">
            <div className="img-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/barbershop.jpg" alt="A barber giving a client a fade with clippers in a men's barbershop" />
              <div className="img-card-body">
                <h3>Barbershops</h3>
                <p>Chairs stay full with online booking and reminders that cut no-shows.</p>
              </div>
            </div>
            <div className="img-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/nail-salon.jpg" alt="A nail technician painting a client's nails in a nail salon" />
              <div className="img-card-body">
                <h3>Nail salons &amp; spas</h3>
                <p>Book by service and technician, so every station stays on schedule.</p>
              </div>
            </div>
            <div className="img-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/law-office.jpg" alt="A lawyer reviewing documents with a client in a law office" />
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
            <video autoPlay muted loop playsInline poster="/images/barbershop.jpg">
              <source src="/videos/hero-loop.mp4" type="video/mp4" />
            </video>
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
