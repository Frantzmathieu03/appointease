import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PLANS, formatPlanPrice, annualCents } from "@/lib/plans";
import { CATEGORIES } from "@/lib/categories";
import HomeAnimations from "@/components/HomeAnimations";

// Category cards for "Made for your kind of business" — labels and
// blurbs come from the shared category list; the photos are the
// resized people-at-work shots under /images/cats/<slug>.jpg (hair
// salons show stylists at work, dental shows the team with a patient).
const CAT_CARDS = CATEGORIES.filter((c) => c.image !== null).map((c) => ({
  slug: c.slug,
  label: c.label,
  blurb: c.blurb,
  img: `/images/cats/${c.slug}.jpg`,
}));

// Landing page — Homepage New Design (Frantz, 2026-11-26): one hero
// with the current looping video, three steps, six feature cards,
// pricing by team size, and a closing call to action. Real product
// claims only: no testimonials, quotes, ratings or invented counts —
// the "What business owners say" section renders only once at least
// two real quotes exist (see TESTIMONIALS below).

interface Testimonial {
  quote: string;
  name: string;
  business: string;
}

// Real quotes from real businesses go here, with permission. The
// section stays hidden until at least two exist — never placeholders,
// never invented quotes (Frantz's Homepage New Design PDF, §4).
const TESTIMONIALS: Testimonial[] = [];

const FEATURES: { icon: string; title: string; body: string; dark?: boolean }[] = [
  {
    icon: "🔔",
    title: "Text + email reminders",
    body: "A confirmation right away, then another 24 hours and 2 hours before — each with links to reschedule or cancel.",
  },
  {
    icon: "🗂️",
    title: "Every client's history",
    body: "Bookings, messages, visit notes and next steps on one timeline. Private notes stay private.",
  },
  {
    icon: "👥",
    title: "Your team, organized",
    body: "Everyone gets their own login and calendar. Assign clients to the person who knows them.",
  },
  {
    icon: "📝",
    title: "Forms",
    body: "Questions and file uploads before the visit, with ready-made templates for law offices and salons.",
  },
  {
    icon: "💬",
    title: "One inbox",
    body: "Message back and forth with clients from one inbox — nothing buried in a personal phone.",
  },
  {
    icon: "💵",
    title: "Your money stays yours",
    body: "Clients pay you directly at your office, the way you already take payment. You pay one simple monthly plan.",
    dark: true,
  },
];

export default function HomePage() {
  const demoMode = !isSupabaseConfigured();
  return (
    <main className="mkt hp">
      <HomeAnimations />
      {demoMode && (
        <div className="mkt-container">
          <div className="notice" style={{ marginTop: 18 }}>
            Demo mode: the live database is not connected yet. The sample business
            page works end to end with demo data — nothing is saved.
          </div>
        </div>
      )}

      {/* Hero — one hero at every width. Text centered, the current
          hero video right in a rounded frame on desktop; stacked
          centered on phones. The three floating notes show on
          desktop only. */}
      <section className="hp-hero">
        <div className="mkt-container hp-hero-grid">
          <div className="hp-hero-top">
            <p className="hp-badge">14 days free · no card needed</p>
            <h1 className="hp-headline">Let customers book. Get back to work.</h1>
          </div>
          <div className="hp-hero-media">
            <video
              className="hp-hero-video"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/hero/hero-poster.jpg"
              aria-label="AppointEase in action — a client booking an appointment and a business owner checking the day's bookings"
            >
              <source src="/hero/hero-video.mp4" type="video/mp4" />
            </video>
            <div className="hp-notes" aria-hidden="true">
              <div className="hp-note hp-note-1">
                <span className="hp-note-ico">📅</span>
                <span><strong>New booking</strong> — James · Haircut · Fri 3:00 PM</span>
              </div>
              <div className="hp-note hp-note-2">
                <span className="hp-note-ico">🔔</span>
                <span><strong>Reminder sent</strong> — 24 hours before · Delivered</span>
              </div>
              <div className="hp-note hp-note-3">
                <span className="hp-note-ico">📝</span>
                <span><strong>Visit notes saved</strong> — James · next visit in 3 weeks</span>
              </div>
            </div>
          </div>
          <div className="hp-hero-bottom">
            <p className="hp-sub">
              Your own booking page, automatic text reminders, and every
              client&apos;s history in one place — for law offices, barbers,
              salons and every appointment-based business.
            </p>
            <div className="hp-ctas">
              <Link href="/owner/signup" className="btn btn-primary btn-lg">Create my booking page</Link>
              <Link href="/main-street-barbers" className="btn btn-lg">See a live example</Link>
            </div>
            <p className="hp-money-line">Your clients pay you directly. AppointEase never touches their money.</p>
          </div>
        </div>
      </section>

      {/* The short version — true product facts only, counting up
          as the band scrolls into view. */}
      <section className="hp-section hp-stats-section" data-reveal>
        <div className="mkt-container">
          <div className="hp-stats">
            <div className="hp-stat">
              <span className="hp-stat-num"><span data-count="14">14</span></span>
              <span className="hp-stat-label">days free to try, no card needed</span>
            </div>
            <div className="hp-stat">
              <span className="hp-stat-num"><span data-count="3">3</span></span>
              <span className="hp-stat-label">reminders with every booking — right away, 24 hours and 2 hours before</span>
            </div>
            <div className="hp-stat">
              <span className="hp-stat-num"><span data-count="3">3</span></span>
              <span className="hp-stat-label">steps to put your booking page live</span>
            </div>
            <div className="hp-stat">
              <span className="hp-stat-num">$<span data-count="0">0</span></span>
              <span className="hp-stat-label">of your clients&apos; money touches AppointEase — they pay you directly</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live in three steps */}
      <section className="hp-section" data-reveal>
        <div className="mkt-container">
          <div className="section-head">
            <h2>Live in three steps</h2>
          </div>
          <div className="steps-grid">
            <div className="step">
              <span className="step-num">1</span>
              <h3>Create your page</h3>
              <p>Add your logo, photos, services, prices and hours in about 3 minutes.</p>
            </div>
            <div className="step">
              <span className="step-num">2</span>
              <h3>Share your link</h3>
              <p>Put appointease.io/your-business on Instagram, Google and your texts.</p>
            </div>
            <div className="step">
              <span className="step-num">3</span>
              <h3>Get booked and reminded</h3>
              <p>Clients book, reschedule and cancel themselves. Reminders go out 24 hours and 2 hours before.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Made for your kind of business — the real categories, with
          people at work in each one. */}
      <section className="hp-section hp-section-pale" data-reveal>
        <div className="mkt-container">
          <div className="section-head">
            <h2>Made for your kind of business</h2>
            <p className="lede">If your day runs on appointments, this is your front desk.</p>
          </div>
          <div className="hp-cats">
            {CAT_CARDS.map((c) => (
              <div key={c.slug} className="hp-cat-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt="" loading="lazy" className="hp-cat-img" />
                <h3>{c.label}</h3>
                <p>{c.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* A day with AppointEase — a looping phone sequence: a booking
          comes in, the reminder goes out, the visit lands in the
          client's history. Pure CSS animation; static under
          prefers-reduced-motion. */}
      <section className="hp-section" data-reveal>
        <div className="mkt-container">
          <div className="section-head">
            <h2>A day with AppointEase</h2>
            <p className="lede">One booking, start to finish — while you work.</p>
          </div>
          <div className="hp-day">
            <div className="hp-phone" aria-hidden="true">
              <div className="hp-phone-notch" />
              <p className="hp-phone-head">Today · Main Street Barbers</p>
              <div className="hp-day-stage">
                <div className="hp-day-card hp-day-card-1">
                  <span className="hp-note-ico">📅</span>
                  <span><strong>New booking</strong> — James · Haircut · Sat 10:00 AM</span>
                </div>
                <div className="hp-day-card hp-day-card-2">
                  <span className="hp-note-ico">🔔</span>
                  <span><strong>Reminder sent</strong> — “See you tomorrow at 10:00 AM” · text + email</span>
                </div>
                <div className="hp-day-card hp-day-card-3">
                  <span className="hp-note-ico">📝</span>
                  <span><strong>Visit notes saved</strong> — James · next visit in 3 weeks</span>
                </div>
              </div>
              <p className="hp-phone-foot">Every client, one history</p>
            </div>
            <ol className="hp-day-caps">
              <li className="hp-day-cap hp-day-cap-1">
                <strong>A client books</strong>
                <span>From your page, any time of day — no phone tag.</span>
              </li>
              <li className="hp-day-cap hp-day-cap-2">
                <strong>Reminders go out on their own</strong>
                <span>Right away, 24 hours before, and 2 hours before.</span>
              </li>
              <li className="hp-day-cap hp-day-cap-3">
                <strong>The visit joins their history</strong>
                <span>Notes and next steps, ready for next time.</span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="hp-section hp-section-pale" data-reveal>
        <div className="mkt-container">
          <div className="section-head">
            <h2>Everything your front desk does — automatically</h2>
          </div>
          <div className="hp-cards">
            {FEATURES.map((f) => (
              <div key={f.title} className={`hp-card${f.dark ? " hp-card-dark" : ""}`}>
                <span className="hp-card-ico" aria-hidden="true">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* People at work — a real shop moment on loop: booked online,
          welcomed in person. Muted and lazy, below the fold. */}
      <section className="hp-section" data-reveal>
        <div className="mkt-container">
          <div className="section-head">
            <h2>Booked online. Welcomed in person.</h2>
            <p className="lede">The booking takes care of itself. You take care of the client.</p>
          </div>
          <video
            className="hp-film-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/videos/people-shop-poster.jpg"
            aria-label="Inside a barbershop — the barber welcomes a client who booked online while another client checks his phone"
          >
            <source src="/videos/people-shop.mp4" type="video/mp4" />
          </video>
        </div>
      </section>

      {/* What business owners say — hidden until at least two real
          quotes exist (see TESTIMONIALS above). */}
      {TESTIMONIALS.length >= 2 && (
        <section className="hp-section" data-reveal>
          <div className="mkt-container">
            <div className="section-head">
              <h2>What business owners say</h2>
            </div>
            <div className="hp-cards">
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className="hp-card hp-quote">
                  <blockquote>{t.quote}</blockquote>
                  <figcaption>{t.name} · {t.business}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section className="hp-section" id="pricing" data-reveal>
        <div className="mkt-container">
          <div className="section-head">
            <h2>Simple pricing that grows with your team</h2>
            <p className="lede">14 days free, no card needed. Pay yearly and get 2 months free.</p>
          </div>
          <div className="pricing-grid">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`price-card${plan.id === "team" ? " featured" : ""}`}>
                {plan.id === "team" && <span className="price-badge">Most popular</span>}
                <div className="price-name">{plan.name}</div>
                <div className="price-amount">
                  {formatPlanPrice(plan.monthlyCents)}<span>/mo</span>
                </div>
                <p className="price-annual">or {formatPlanPrice(annualCents(plan))}/yr</p>
                <ul className="price-features">
                  {plan.features.map((f) => (
                    <li key={f}><span className="price-check" aria-hidden="true">✓</span>{f}</li>
                  ))}
                </ul>
                <Link href="/owner/signup" className={`btn ${plan.id === "team" ? "btn-primary" : ""} btn-block`}>
                  Start free
                </Link>
              </div>
            ))}
          </div>
          <p className="pricing-note">
            Your plan grows with your team — we&apos;ll let you know when it&apos;s time to upgrade.
          </p>
        </div>
      </section>

      {/* Behind the counter — the people AppointEase is built for.
          Scene labels only; these are not testimonials. */}
      <section className="hp-section hp-section-pale" data-reveal>
        <div className="mkt-container">
          <div className="section-head">
            <h2>For the people behind the counter</h2>
          </div>
          <div className="hp-people">
            <figure className="hp-person">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/cats/reception.jpg" alt="" loading="lazy" />
              <figcaption>At the front desk</figcaption>
            </figure>
            <figure className="hp-person">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/cats/wellness-desk.jpg" alt="" loading="lazy" />
              <figcaption>At the spa</figcaption>
            </figure>
            <figure className="hp-person">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/cats/pet-groomers.jpg" alt="" loading="lazy" />
              <figcaption>At the groomer</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <div className="mkt-container">
        <section className="cta-band hp-cta" data-reveal>
          <h2>Your booking page can be live today</h2>
          <p>Questions? Email support@appointease.io — a real person answers.</p>
          <Link href="/owner/signup" className="btn btn-white btn-lg">Create my booking page</Link>
        </section>
      </div>
    </main>
  );
}
