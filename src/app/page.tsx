import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/categories";
import { REVIEWS, type ReviewEntry } from "@/lib/reviews";
import HomeAnimations from "@/components/HomeAnimations";
import PricingPlans from "@/components/PricingPlans";

// Category cards for "Made for your kind of business": labels and
// blurbs come from the shared category list; the photos are the
// resized people-at-work shots under /images/cats/<slug>.jpg (hair
// salons show stylists at work, dental shows the team with a patient).
const CAT_CARDS = CATEGORIES.filter((c) => c.image !== null).map((c) => ({
  slug: c.slug,
  label: c.label,
  blurb: c.blurb,
  img: `/images/cats/${c.slug}.jpg`,
}));

// Landing page: Homepage New Design (Frantz, 2026-11-26): one hero
// with the current looping video, three steps, six feature cards,
// pricing by team size, and a closing call to action. Real product
// claims only: no testimonials, quotes, ratings or invented counts.
// The reviews section renders only once at least two real reviews
// exist in src/lib/reviews.ts (real businesses, with permission).

/** The people carousel: one wide card per kind of business, each
 *  with a plain two step label in our own words. */
const PEOPLE_FLOW: { slug: string; category: string; from: string; to: string }[] = [
  { slug: "barbershops", category: "Barbershops", from: "Booked", to: "Reminded" },
  { slug: "hair-salons", category: "Hair Salons", from: "Messaged", to: "Answered" },
  { slug: "nail-salons-spas", category: "Nail Salons & Spas", from: "Booked", to: "Confirmed" },
  { slug: "law-offices", category: "Law Offices", from: "Asked", to: "Booked" },
  { slug: "dental-offices", category: "Dental Offices", from: "Reminded", to: "Arrived" },
  { slug: "doctors-clinics", category: "Doctors & Clinics", from: "Booked", to: "Seen" },
  { slug: "pet-groomers", category: "Pet Groomers", from: "Messaged", to: "Booked" },
  { slug: "auto-repair", category: "Auto Repair", from: "Booked", to: "Ready" },
];

const FEATURES: { icon: string; title: string; body: string; dark?: boolean }[] = [
  {
    icon: "🔔",
    title: "Email reminders",
    body: "A confirmation right away, then another 24 hours and 2 hours before, each with links to reschedule or cancel.",
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
    body: "Questions and file uploads before the visit, with ready made templates for law offices and salons.",
  },
  {
    icon: "💬",
    title: "One inbox",
    body: "Message back and forth with clients from one inbox. Nothing is buried in a personal phone.",
  },
  {
    icon: "💵",
    title: "Your money stays yours",
    body: "Clients pay you directly at your office, the way you already take payment. You pay one simple monthly plan.",
    dark: true,
  },
];

/** One review card, in the reference format: a VIDEO entry (the
 *  person on camera, a big bold quote line over the footage, name
 *  and business under it) or a TEXT entry (round photo, name,
 *  business, star rating, the plain quote). Used twice by the
 *  scrolling wall: the set and its duplicate. */
function reviewCard(r: ReviewEntry, key: string) {
  return r.kind === "video" ? (
    <figure key={key} className="hp-rv-video">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={r.poster}
        aria-label={r.business ? `${r.name}, ${r.business}` : r.name}
      >
        <source src={r.video} type="video/mp4" />
      </video>
      <figcaption className="hp-rv-overlay">
        <span className="hp-rv-quote">{r.quote}</span>
        <span className="hp-rv-who">{r.name}{r.business ? ` · ${r.business}` : ""}</span>
      </figcaption>
    </figure>
  ) : (
    <figure key={key} className="hp-rv-text">
      <div className="hp-rv-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hp-rv-photo" src={r.photo} alt="" loading="lazy" />
        <div>
          <div className="hp-rv-name">{r.name}</div>
          {r.business && <div className="hp-rv-biz">{r.business}</div>}
        </div>
      </div>
      <span className="hp-stars" aria-label={`${r.stars} out of 5 stars`}>
        {"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}
      </span>
      <blockquote>{r.quote}</blockquote>
    </figure>
  );
}

export default function HomePage() {
  const demoMode = !isSupabaseConfigured();
  return (
    <main className="mkt hp">
      <HomeAnimations />
      {demoMode && (
        <div className="mkt-container">
          <div className="notice" style={{ marginTop: 18 }}>
            Demo mode: the live database is not connected yet. The sample business
            page works end to end with demo data. Nothing is saved.
          </div>
        </div>
      )}

      {/* Hero: one hero at every width. Text centered, the current
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
              aria-label="AppointEase in action: a client booking an appointment and a business owner checking the day's bookings"
            >
              <source src="/hero/hero-video.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="hp-hero-bottom">
            <p className="hp-sub">
              Your own booking page, automatic email reminders, and every
              client&apos;s history in one place, for law offices, barbers,
              salons and every appointment based business.
            </p>
            <div className="hp-ctas">
              <Link href="/owner/signup" className="btn btn-primary btn-lg">Create my booking page</Link>
              <Link href="/main-street-barbers" className="btn btn-lg">See a live example</Link>
            </div>
            <p className="hp-money-line">Your clients pay you directly. AppointEase never touches their money.</p>
          </div>
        </div>
      </section>

      {/* A look inside AppointEase: four small dashboard scenes
          that animate gently on a loop (assigning a client, a
          customer message, an email reminder, a new booking).
          Product scenes only, like the day cards above: first
          names and real photos, never testimonials, praise
          quotes or ratings. CSS animation only; static under
          prefers-reduced-motion. */}
      <section className="hp-section" data-reveal>
        <div className="mkt-container">
          <div className="section-head">
            <h2>A look inside AppointEase</h2>
            <p className="lede">Assigning, messaging, reminding and booking, all in one place.</p>
          </div>
          <div className="hp-scenes">
            <div className="hp-scene">
              <p className="hp-scene-head">Team · Assign a client</p>
              <div className="hp-scene-body" aria-hidden="true">
                <div className="hp-scene-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="hp-scene-face" src="/images/faces/maya.jpg" alt="" loading="lazy" />
                  <div className="hp-scene-who">
                    <span className="hp-scene-name">Maya</span>
                    <span className="hp-scene-sub">New client</span>
                  </div>
                </div>
                <div className="hp-scene-arrow"><span /></div>
                <div className="hp-scene-row hp-scene-row-staff">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="hp-scene-face" src="/images/faces/elena.jpg" alt="" loading="lazy" />
                  <div className="hp-scene-who">
                    <span className="hp-scene-name">Elena</span>
                    <span className="hp-scene-sub">Stylist</span>
                  </div>
                  <span className="hp-scene-pill hp-anim-assigned">✓ Assigned</span>
                </div>
              </div>
              <p className="hp-scene-cap">Every client lands with the right person on your team.</p>
            </div>

            <div className="hp-scene">
              <p className="hp-scene-head">Inbox · Messages</p>
              <div className="hp-scene-body hp-scene-thread" aria-hidden="true">
                <div className="hp-brow hp-anim-msg-in">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="hp-scene-face hp-scene-face-sm" src="/images/faces/sofia.jpg" alt="" loading="lazy" />
                  <p className="hp-bubble hp-bubble-in">Hi! Can I move my appointment to Saturday morning?</p>
                </div>
                <div className="hp-brow hp-brow-out hp-anim-typing">
                  <p className="hp-bubble hp-bubble-typing"><span /><span /><span /></p>
                </div>
                <div className="hp-brow hp-brow-out hp-anim-msg-out">
                  <p className="hp-bubble hp-bubble-out">Of course. You are all set for Saturday at 10:00 AM.</p>
                </div>
              </div>
              <p className="hp-scene-cap">Customer messages land in one tidy inbox.</p>
            </div>

            <div className="hp-scene">
              <p className="hp-scene-head">Reminders · Email</p>
              <div className="hp-scene-body" aria-hidden="true">
                <div className="hp-mail-top">
                  <span className="hp-mail-tile">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </span>
                  <div className="hp-mail-who">
                    <strong>Appointment reminder</strong>
                    <span className="hp-mail-to">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="hp-scene-face hp-scene-face-xs" src="/images/faces/lucas.jpg" alt="" loading="lazy" />
                      To: Lucas
                    </span>
                  </div>
                  <span className="hp-scene-pill hp-anim-delivered">✓ Delivered</span>
                </div>
                <p className="hp-mail-subject">Your appointment is tomorrow at 10:00 AM</p>
                <p className="hp-mail-text">
                  Hi Lucas, a quick reminder about your appointment tomorrow.
                  Need a different time? You can reschedule or cancel right
                  from this email.
                </p>
                <div className="hp-mail-chips"><span>Reschedule</span><span>Cancel</span></div>
              </div>
              <p className="hp-scene-cap">Reminders send themselves, right on time.</p>
            </div>

            <div className="hp-scene">
              <p className="hp-scene-head">Calendar · December 2026</p>
              <div className="hp-scene-body" aria-hidden="true">
                <div className="hp-cal-days">
                  <span>Mon<strong>7</strong></span>
                  <span>Tue<strong>8</strong></span>
                  <span>Wed<strong>9</strong></span>
                  <span>Thu<strong>10</strong></span>
                  <span className="hp-cal-on">Fri<strong>11</strong></span>
                </div>
                <div className="hp-cal-slots">
                  <div className="hp-cal-row">
                    <span className="hp-cal-time">9:00 AM</span>
                    <span className="hp-cal-slot hp-cal-busy">Booked</span>
                  </div>
                  <div className="hp-cal-row">
                    <span className="hp-cal-time">11:00 AM</span>
                    <span className="hp-cal-slot">Open</span>
                  </div>
                  <div className="hp-cal-row">
                    <span className="hp-cal-time">1:00 PM</span>
                    <span className="hp-cal-slot hp-cal-busy">Booked</span>
                  </div>
                  <div className="hp-cal-row">
                    <span className="hp-cal-time">3:00 PM</span>
                    <span className="hp-cal-slot hp-cal-newslot">
                      <span className="hp-cal-book hp-anim-book">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="hp-scene-face hp-scene-face-sm" src="/images/faces/daniel.jpg" alt="" loading="lazy" />
                        <span className="hp-cal-book-who"><strong>Daniel</strong><span>Haircut</span></span>
                        <span className="hp-cal-tag hp-anim-tag">New booking</span>
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <p className="hp-scene-cap">New bookings drop straight onto the calendar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* The short version: true product facts only, counting up
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
              <span className="hp-stat-label">reminders with every booking: right away, 24 hours and 2 hours before</span>
            </div>
            <div className="hp-stat">
              <span className="hp-stat-num"><span data-count="3">3</span></span>
              <span className="hp-stat-label">steps to put your booking page live</span>
            </div>
            <div className="hp-stat">
              <span className="hp-stat-num">$<span data-count="0">0</span></span>
              <span className="hp-stat-label">of your clients&apos; money touches AppointEase. They pay you directly</span>
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
              <p>Put appointease.io/yourshop on Instagram, Google and your texts.</p>
            </div>
            <div className="step">
              <span className="step-num">3</span>
              <h3>Get booked and reminded</h3>
              <p>Clients book, reschedule and cancel themselves. Reminders go out 24 hours and 2 hours before.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Made for your kind of business: the real categories, with
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
                <img src={c.img} alt={`${c.label} at work`} loading="lazy" className="hp-cat-img" />
                <h3>{c.label}</h3>
                <p>{c.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* A day with AppointEase: ONE card inside the phone rotates
          through the three moments that used to float on the hero
          video (Frantz's correction: off the video, into this
          animated card, wording unchanged). Pure CSS animation;
          static under prefers-reduced-motion. */}
      <section className="hp-section" data-reveal>
        <div className="mkt-container">
          <div className="section-head">
            <h2>A day with AppointEase</h2>
            <p className="lede">One booking, start to finish, while you work.</p>
          </div>
          <div className="hp-panel">
          <div className="hp-day">
            <div className="hp-phone" aria-hidden="true">
              <div className="hp-phone-notch" />
              <p className="hp-phone-head">Today · Main Street Barbers</p>
              <div className="hp-day-stage">
                <div className="hp-day-card hp-day-card-1">
                  <span className="hp-note-ico">📅</span>
                  <span><strong>New booking</strong> · James · Haircut · Fri 3:00 PM</span>
                </div>
                <div className="hp-day-card hp-day-card-2">
                  <span className="hp-note-ico">🔔</span>
                  <span><strong>Reminder sent</strong> · 24 hours before · Delivered</span>
                </div>
                <div className="hp-day-card hp-day-card-3">
                  <span className="hp-note-ico">📝</span>
                  <span><strong>Visit notes saved</strong> · James · next visit in 3 weeks</span>
                </div>
              </div>
              <p className="hp-phone-foot">Every client, one history</p>
            </div>
            <ol className="hp-day-caps">
              <li className="hp-day-cap hp-day-cap-1">
                <strong>A client books</strong>
                <span>From your page, any time of day, with no phone tag.</span>
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
        </div>
      </section>

      {/* Feature cards */}
      <section className="hp-section hp-section-pale" data-reveal>
        <div className="mkt-container">
          <div className="section-head">
            <h2>Everything your front desk does, automatically</h2>
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

      {/* People at work: a real shop moment on loop: booked online,
          welcomed in person. Muted and lazy, below the fold. */}
      <section className="hp-section" data-reveal>
        <div className="mkt-container">
          <div className="section-head">
            <h2>Booked online. Welcomed in person.</h2>
            <p className="lede">The booking takes care of itself. You take care of the client.</p>
          </div>
          <div className="hp-panel hp-film-panel">
            <video
              className="hp-film-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/videos/people-shop-poster.jpg"
              aria-label="Inside a barbershop: the barber welcomes a client who booked online while another client checks his phone"
            >
              <source src="/videos/people-shop.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* The statement band: one bold line, lots of air (the line is
          the site's own pre-redesign statement, restored 2026-11-26). */}
      <section className="hp-section hp-statement" data-reveal>
        <div className="mkt-container">
          <h2>Built for people whose work runs on appointments.</h2>
          <Link href="/owner/signup" className="btn btn-primary btn-lg">Start free</Link>
        </div>
      </section>

      {/* Reviews: real words from real businesses, data-driven from
          src/lib/reviews.ts, shown as a slow scrolling wall (the
          set and its duplicate on one track). The section renders
          ONLY when at least two real reviews exist there. It stays
          hidden until the first pilot shops give real words with
          permission: never placeholders, never invented quotes,
          names, or ratings. */}
      {REVIEWS.length >= 2 && (
        <section className="hp-section hp-reviews" data-reveal>
          <div className="mkt-container">
            <div className="section-head">
              <h2>This is what real users are saying</h2>
            </div>
          </div>
          <div className="hp-reviews-wall">
            <div className="hp-reviews-track">
              <div className="hp-reviews-set">
                {REVIEWS.map((r, i) => reviewCard(r, `a-${i}`))}
              </div>
              <div className="hp-reviews-set" aria-hidden="true">
                {REVIEWS.map((r, i) => reviewCard(r, `b-${i}`))}
              </div>
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
          <PricingPlans />
          <p className="pricing-note">
            Your plan grows with your team. We&apos;ll let you know when it&apos;s time to upgrade.
          </p>
        </div>
      </section>

      {/* FAQ (restored at Frantz's word, 2026-11-27): the original
          five questions from before the Phase 4 rebuild, back in
          their original place right after pricing. The reminders
          answer says email only, because texting is not live yet. */}
      <section className="hp-section" data-reveal>
        <div className="mkt-container">
          <div className="section-head">
            <p className="eyebrow">Questions</p>
            <h2>Good to know</h2>
          </div>
          <div className="faq-list">
            <details className="faq-item">
              <summary>Does it cost my customers anything to book?</summary>
              <p>No. Booking is always free for customers. Only businesses subscribe, after their free trial.</p>
            </details>
            <details className="faq-item">
              <summary>Do my clients pay through AppointEase?</summary>
              <p>No. Clients pay you directly, the way you already take payment. AppointEase never touches their money.</p>
            </details>
            <details className="faq-item">
              <summary>Can AppointEase take a deposit or a no show fee for me?</summary>
              <p>No. AppointEase does not take client money at all, so it cannot hold deposits or charge no show fees. Clients pay you directly at your business.</p>
            </details>
            <details className="faq-item">
              <summary>Do I need a card to start the trial?</summary>
              <p>No. Every plan starts with 14 days free, no card required.</p>
            </details>
            <details className="faq-item">
              <summary>What happens when my trial ends?</summary>
              <p>You pick a plan to keep going: Solo $29.99 a month, Team $49.99 a month, or Business $149.99 a month. Pay yearly and you get 2 months free. If you do not subscribe, your booking page pauses. Your data is not deleted.</p>
            </details>
            <details className="faq-item">
              <summary>How do reminders work?</summary>
              <p>By email today. Each appointment gets a confirmation, then a reminder 24 hours before and another 2 hours before, when the booking is made far enough ahead. Text reminders are not live yet.</p>
            </details>
            <details className="faq-item">
              <summary>Can clients reschedule or cancel themselves?</summary>
              <p>Yes. They use the secure link in their confirmation email, or their account on your business page. Your own cancellation rules still apply.</p>
            </details>
            <details className="faq-item">
              <summary>Can my staff have their own calendars?</summary>
              <p>Yes. Team and Business plans include multiple staff members, each with their own login, calendar, services and working hours.</p>
            </details>
            <details className="faq-item">
              <summary>Can my staff see all my customers?</summary>
              <p>No. Staff see only the clients assigned to them. Managers can see more, but Billing and Team stay with the owner.</p>
            </details>
            <details className="faq-item">
              <summary>Do my customers need an account for every business they use?</summary>
              <p>Yes. Each business has its own customer accounts, kept separate on purpose. A customer joins your business on your page, and nothing mixes with other businesses.</p>
            </details>
            <details className="faq-item">
              <summary>What if I have more than one location?</summary>
              <p>You can add locations in your dashboard and manage them from the same account.</p>
            </details>
            <details className="faq-item">
              <summary>Can I cancel my subscription anytime?</summary>
              <p>Yes. You can cancel from Billing whenever you like. No phone call and no cancellation fee.</p>
            </details>
            <details className="faq-item">
              <summary>Can I delete my account if I stop?</summary>
              <p>Yes. You can delete your account from Settings. The deletion is set for 48 hours later, so you can change your mind and keep your account before then.</p>
            </details>
          </div>
        </div>
      </section>

      {/* Behind the counter: a slow people carousel in the spirit
          of the reference Frantz sent. Wide photo cards glide
          sideways on their own; each carries a small two pill
          label pair in our own words. Scene labels only; these
          are not testimonials. Pauses on hover; still (and
          hand scrollable) under prefers-reduced-motion. */}
      <section className="hp-section hp-section-pale" data-reveal>
        <div className="mkt-container">
          <div className="section-head">
            <h2>For the people behind the counter</h2>
          </div>
        </div>
        <div className="hp-carousel">
          <div className="hp-carousel-track">
            {PEOPLE_FLOW.map((p) => (
              <figure key={p.slug} className="hp-pc-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/images/cats/${p.slug}.jpg`} alt={`${p.category} at work`} loading="lazy" />
                <figcaption>
                  <span className="hp-pc-cat">{p.category}</span>
                  <span className="hp-pc-pair">
                    <span className="hp-pc-pill">{p.from}</span>
                    <span className="hp-pc-arrow" aria-hidden="true">→</span>
                    <span className="hp-pc-pill">{p.to}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
            {PEOPLE_FLOW.map((p) => (
              <figure key={`dup-${p.slug}`} className="hp-pc-card" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/images/cats/${p.slug}.jpg`} alt="" loading="lazy" />
                <figcaption>
                  <span className="hp-pc-cat">{p.category}</span>
                  <span className="hp-pc-pair">
                    <span className="hp-pc-pill">{p.from}</span>
                    <span className="hp-pc-arrow" aria-hidden="true">→</span>
                    <span className="hp-pc-pill">{p.to}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <div className="mkt-container">
        <section className="cta-band hp-cta" data-reveal>
          <h2>Your booking page can be live today</h2>
          <p>Questions? Email support@appointease.io. A real person answers.</p>
          <Link href="/owner/signup" className="btn btn-white btn-lg">Create my booking page</Link>
        </section>
      </div>

      {/* Find a business (restored at Frantz's word, 2026-11-26):
          someone without a direct link can find a business by name
          and by ZIP code or city. A plain form onto /explore, which
          opens with both filters already filled in. */}
      <section className="hp-section hp-find-section" data-reveal>
        <div className="mkt-container">
          <div className="hp-find-card">
            <div className="hp-head">
              <h2>Find a business</h2>
              <p className="hp-lede">
                Looking for your barber, your salon, your lawyer? Search by
                name, or by ZIP code or city.
              </p>
            </div>
            <form className="hp-find" action="/explore" method="get">
              <label className="hp-find-field">
                <span>Business name</span>
                <input type="text" name="q" placeholder="e.g. Main Street Barbers" autoComplete="off" />
              </label>
              <label className="hp-find-field">
                <span>ZIP code or city</span>
                <input type="text" name="place" placeholder="e.g. 02062 or Norwood" autoComplete="off" />
              </label>
              <button type="submit" className="btn btn-primary btn-lg hp-find-btn">Search</button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
