import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PLANS, formatPlanPrice } from "@/lib/plans";
import { TILE_CATEGORIES } from "@/lib/categories";
import CategoryIcon from "@/components/CategoryIcon";

const BENEFITS = [
  { icon: "📞", title: "No more phone tag", line: "Customers book themselves online, so your phone stays free for the work." },
  { icon: "🔔", title: "Fewer no-shows", line: "Automatic text and email reminders bring people in, on time." },
  { icon: "🌙", title: "Book while you sleep", line: "Your page takes bookings around the clock, even after closing time." },
  { icon: "🎨", title: "Your page, your brand", line: "Your services, your hours, your own link — a page that looks like your business." },
  { icon: "🗂️", title: "Every customer in one place", line: "Bookings, history and messages for each customer, kept together." },
  { icon: "💬", title: "Message right in the app", line: "Customers message you from their booking — unread badges mean nothing slips by." },
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

        {/* Hero (desktop, ≥1024px) — hero video panel with the headline
            on the video under a lightened green gradient, so the footage
            stays bright. Hidden below 1024px (see .hero-desktop CSS). */}
        <section className="mkt-hero hero-desktop">
          <div className="hero-panel">
            <video className="hero-bg-video" autoPlay muted loop playsInline preload="auto" poster="/hero/hero-poster.jpg" aria-hidden="true">
              <source src="/hero/hero-video.mp4" type="video/mp4" />
            </video>
            <div className="hero-overlay" />
            <div className="hero-content">
              <p className="hero-badge"><span className="hero-badge-dot" />Built for local businesses across the U.S. &amp; beyond</p>
              <h1>Let customers book.<br />Get back to work.</h1>
              <p className="hero-sub">Your booking page with automatic reminders — fewer no-shows, less phone time.</p>
              <div className="hero-ctas">
                <Link href="/owner/signup" className="btn btn-primary btn-lg">Create your booking page</Link>
                <Link href="/main-street-barbers" className="btn btn-lg">See a live example</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Hero (mobile, <1024px) — light and open: centered text on the
            pale background, hero video in a clean panel below. Nothing
            sits on the video. Hidden at ≥1024px (see .hero-mobile CSS). */}
        <section className="mkt-hero hero-mobile">
          <div className="hero-content">
            <p className="hero-badge"><span className="hero-badge-dot" />Built for local businesses across the U.S. &amp; beyond</p>
            <h1>Let customers book.<br />Get back to work.</h1>
            <div className="hero-ctas">
              <Link href="/owner/signup" className="btn btn-primary btn-lg">Create your booking page</Link>
              <Link href="/main-street-barbers" className="btn btn-lg">See a live example</Link>
            </div>
          </div>
          <div className="hero-media">
            <video autoPlay muted loop playsInline preload="auto" poster="/hero/hero-poster.jpg" aria-label="AppointEase in action — a client booking an appointment and a business owner checking the day's bookings">
              <source src="/hero/hero-video.mp4" type="video/mp4" />
            </video>
          </div>
        </section>

        {/* How it works */}
        <section className="mkt-section">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2>Live in three steps</h2>
          </div>
          <div className="steps-grid">
            <div className="step">
              <span className="step-num">1</span>
              <h3>Create your page</h3>
              <p>Add your services, prices and hours. Your page gets its own link — appointease.io/your-business.</p>
            </div>
            <div className="step">
              <span className="step-num">2</span>
              <h3>Share your link</h3>
              <p>Put it on Google, Instagram, your website, or send it by text. Customers pick a time and book in under a minute.</p>
            </div>
            <div className="step">
              <span className="step-num">3</span>
              <h3>Get booked &amp; reminded</h3>
              <p>Confirmations and reminders go out by text and email automatically — every booking, every time.</p>
            </div>
          </div>
          <div className="steps-media">
            {/* Animated loop of the real product: a customer booking a
                Classic haircut on the live Main Street Barbers page —
                service, day and time, details, sample confirmation.
                Recorded from the actual app, not a mock. */}
            <div className="phone-panel loop-panel">
              <div className="phone-frame">
                <video
                  className="loop-video"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/loops/loop-booking-poster.jpg"
                  aria-label="A customer booking a Classic haircut on the Main Street Barbers page: choosing the service, picking a day and time, entering their details, and receiving a confirmation number"
                >
                  <source src="/loops/loop-booking.webm" type="video/webm" />
                  <source src="/loops/loop-booking.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </section>

        {/* Reminder showcase — a second product example, a different
            business than the steps phone mock above (wellness studio,
            not the barbershop) so the two sections don't repeat. */}
        <section className="mkt-section">
          <div className="section-head">
            <p className="eyebrow">Automatic reminders</p>
            <h2>Reminders that bring people in</h2>
            <p className="lede">Every appointment gets a confirmation, a 24-hour reminder, and a 2-hour reminder — by text and email.</p>
          </div>
          <div className="showcase-photo">
            {/* Animated loop of the real product: the confirmation
                screen's own message previews — confirmation, 24-hour
                reminder, 2-hour reminder, each with its reschedule /
                cancel link. Recorded from the actual app. */}
            <div className="reminder-media">
              <div className="phone-frame reminder-frame">
                <video
                  className="loop-video"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/loops/loop-reminder-poster.jpg"
                  aria-label="The messages a customer receives after booking: a confirmation sent right away, a reminder 24 hours before, and a reminder 2 hours before, each with a link to reschedule or cancel"
                >
                  <source src="/loops/loop-reminder.webm" type="video/webm" />
                  <source src="/loops/loop-reminder.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
            <div className="notify-card">
              <p className="notify-status"><span className="notify-dot" />Reminder sent successfully</p>
              <p className="notify-text">
                Hi <span className="notify-hl">Sarah</span> 👋 Reminder for your massage at{" "}
                <span className="notify-hl">Willow Wellness Studio</span> on Wednesday at 2:30 PM.
              </p>
            </div>
          </div>
        </section>

        {/* Journey strip — the life of one appointment, link to front
            door. The setup steps above are the owner's path; this is
            the customer's. Labels only, no repeated copy. */}
        <section className="mkt-section">
          <div className="section-head">
            <p className="eyebrow">How a booking flows</p>
            <h2>From your link to your front door</h2>
            <p className="lede">Every appointment follows the same path — and most of it runs itself.</p>
          </div>
          <div className="journey-steps">
            <div className="journey-step">
              <div className="journey-icon" aria-hidden="true">🔗</div>
              <p className="journey-label">Share your booking link</p>
            </div>
            <span className="journey-arrow" aria-hidden="true">→</span>
            <div className="journey-step">
              <div className="journey-icon" aria-hidden="true">📅</div>
              <p className="journey-label">Clients book themselves, 24/7</p>
            </div>
            <span className="journey-arrow" aria-hidden="true">→</span>
            <div className="journey-step">
              <div className="journey-icon" aria-hidden="true">🔔</div>
              <p className="journey-label">Reminders go out on their own</p>
            </div>
            <span className="journey-arrow" aria-hidden="true">→</span>
            <div className="journey-step">
              <div className="journey-icon" aria-hidden="true">✅</div>
              <p className="journey-label">They show up</p>
            </div>
          </div>
        </section>

        {/* Feature rows — three deeper looks at the product, alternating
            sides. All visuals are built mocks (like the phone mock
            above), and each example uses a different business than the
            sections around it. Claims match the live product only. */}
        <section className="mkt-section feature-rows">
          {/* Two-way messaging */}
          <div className="feature-row">
            <div className="feature-copy">
              <p className="eyebrow">Messaging</p>
              <h2>Questions get answered in one thread</h2>
              <p className="lede">
                Customers message you from their booking, and you reply from your
                dashboard inbox — the unread count keeps anything from slipping by.
              </p>
            </div>
            <div className="mock-panel" role="img" aria-label="A message thread between a client named Daniel and Harbor Lane Law about moving a consultation to Friday at 10:30 AM">
              <div className="phone-frame chat-frame">
                <div className="phone-screen chat-screen">
                  <div className="phone-head">
                    <span className="phone-avatar">H</span>
                    <div>
                      <div className="phone-name">Harbor Lane Law</div>
                      <div className="phone-sub">Message</div>
                    </div>
                  </div>
                  <div className="bubble">
                    Hi, this is Daniel. My consultation is Thursday at 2:00 —
                    could I move it to Friday morning instead?
                  </div>
                  <div className="bubble mine">
                    Hi Daniel — Friday at <strong>10:30 AM</strong> is open. Tap
                    the link in your confirmation text to move it, and it lands
                    on my calendar right away.
                  </div>
                  <div className="bubble">
                    Done — Friday at 10:30 it is. Thank you!
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Self-service rescheduling */}
          <div className="feature-row flip">
            <div className="feature-copy">
              <p className="eyebrow">Reschedule &amp; cancel</p>
              <h2>Clients fix their own appointments</h2>
              <p className="lede">
                Every confirmation and reminder carries a secure link, so clients
                move or cancel their own visits — your calendar updates, and
                nobody plays phone tag.
              </p>
            </div>
            <div className="mock-panel" role="img" aria-label="A customer's manage-appointment card for a dental visit, with Reschedule and Cancel buttons and a note that a new time is held">
              <div className="manage-mock">
                <p className="manage-biz">Northgate Dental</p>
                <p className="manage-title">Manage your appointment</p>
                <div className="manage-appt">
                  <p className="manage-service">Cleaning &amp; checkup</p>
                  <p className="manage-when">Thursday at 9:00 AM · Confirmation #: AE-4H8K2D</p>
                </div>
                <div className="manage-actions">
                  <span className="mock-btn mock-btn-primary">Reschedule</span>
                  <span className="mock-btn mock-btn-danger">Cancel appointment</span>
                </div>
                <p className="manage-success">
                  <span aria-hidden="true">✓</span>
                  <span>New time held — Friday at 11:30 AM. Fresh reminders are on their way.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Owner dashboard */}
          <div className="feature-row">
            <div className="feature-copy">
              <p className="eyebrow">Owner dashboard</p>
              <h2>The whole day, on one screen</h2>
              <p className="lede">
                Today&apos;s appointments, your calendar, your customers and your
                inbox — plus your booking link, always one tap from being shared.
              </p>
            </div>
            <div className="mock-panel" role="img" aria-label="The owner dashboard showing today's appointments at a hair salon, with a copy booking link button">
              <div className="dash-mock">
                <div className="dash-head">
                  <span className="dash-biz">Luxe Locks Salon</span>
                  <span className="dash-tabs">
                    <span className="dash-tab active">Today</span>
                    <span className="dash-tab">Calendar</span>
                    <span className="dash-tab">Customers</span>
                    <span className="dash-tab">Inbox <span className="dash-badge">2</span></span>
                  </span>
                </div>
                <p className="dash-title">Today</p>
                <div className="dash-row">
                  <div>
                    <p className="dash-who"><span className="dash-time">9:00 AM</span> — Alicia Gomez</p>
                    <p className="dash-what">Cut &amp; color</p>
                  </div>
                  <span className="dash-chip">Confirmed</span>
                </div>
                <div className="dash-row">
                  <div>
                    <p className="dash-who"><span className="dash-time">10:30 AM</span> — Beth Carter</p>
                    <p className="dash-what">Blowout &amp; finish</p>
                  </div>
                  <span className="dash-chip">Confirmed</span>
                </div>
                <div className="dash-row">
                  <div>
                    <p className="dash-who"><span className="dash-time">12:15 PM</span> — Rosa Diaz</p>
                    <p className="dash-what">Balayage</p>
                  </div>
                  <span className="dash-chip">Confirmed</span>
                </div>
                <div className="dash-linkrow">
                  <span className="dash-url">appointease.io/luxe-locks-salon</span>
                  <span className="mock-btn mock-btn-primary">Copy booking link</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits carousel — the single benefits section (the old
            Features grid repeated these points and was removed; its one
            unique point, two-way messaging, is a carousel card now).
            Honest benefit cards, no testimonials:
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
            <p className="lede">See what a booking page looks like in your world.</p>
          </div>
          <div className="cat-grid">
            {TILE_CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/explore?category=${c.slug}`} className="cat-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image ?? ""} alt="" />
                <span className="cat-tile-shade" />
                <span className="cat-tile-body">
                  <CategoryIcon name={c.icon} />
                  <span className="cat-tile-label">{c.label}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Demo showcase */}
        <section className="mkt-section">
          <div className="showcase">
            <div>
              <p className="eyebrow" style={{ color: "#bcd8c2" }}>Try it as a customer</p>
              <h2>Meet Main Street Barbers</h2>
              <p>
                This is a real AppointEase booking page. Look through the services,
                pick a time, and book — the way your own customers will.
              </p>
              <div style={{ marginTop: 20 }}>
                <Link href="/main-street-barbers" className="btn btn-white btn-lg">Visit the shop</Link>
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
                <p className="price-blurb">{plan.blurb}</p>
                <ul className="price-features">
                  {plan.features.map((f) => (
                    <li key={f}><span className="price-check" aria-hidden="true">✓</span>{f}</li>
                  ))}
                </ul>
                <Link href="/owner/signup" className={`btn ${plan.id === "team" ? "btn-primary" : ""} btn-block`}>
                  Start free trial
                </Link>
              </div>
            ))}
          </div>

          {/* Plan comparison — only what the product actually delivers
              (staff limits from plans.ts; everything else is core
              product included in every plan, except priority support,
              which plans.ts reserves for Business). */}
          <div className="compare-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th scope="col"><span className="compare-sr">Feature</span></th>
                  {PLANS.map((plan) => (
                    <th scope="col" key={plan.id}>
                      {plan.name}
                      <span className="compare-price">{formatPlanPrice(plan.monthlyCents)}/mo</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Staff calendars</th>
                  <td>1</td>
                  <td>Up to 5</td>
                  <td>Up to 15</td>
                </tr>
                <tr>
                  <th scope="row">Booking page with your own link</th>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <th scope="row">Confirmation, 24-hour &amp; 2-hour reminders by text and email</th>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <th scope="row">Reschedule &amp; cancel links in every reminder</th>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <th scope="row">Two-way messaging with customers</th>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <th scope="row">Listed in Find-a-Business search</th>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <th scope="row">Priority support</th>
                  <td>—</td>
                  <td>—</td>
                  <td>✓</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="pricing-note">
            Launch pricing: the first 10 businesses to subscribe lock today&apos;s price for life — it never
            goes up while your subscription stays active. Customers never pay to book.
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
