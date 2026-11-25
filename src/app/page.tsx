import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PLANS, formatPlanPrice } from "@/lib/plans";
import { TILE_CATEGORIES } from "@/lib/categories";
import CategoryIcon from "@/components/CategoryIcon";
import HomeAnimations from "@/components/HomeAnimations";

// Landing page — visual-first marketing page, Calendly-style layout:
// animated hero pills, a four-step journey that lights up on scroll,
// alternating feature sections with expandable detail rows, and a big
// plain statement before pricing. Short copy, real product claims
// only: no testimonials, no invented counts, quotes or ratings —
// AppointEase is new. Every visual is a built mock or a recording of
// the real app, using the demo shop (Main Street Barbers) and the
// matched on-page examples.
export default function HomePage() {
  const demoMode = !isSupabaseConfigured();
  return (
    <main className="mkt">
      <HomeAnimations />
      <div className="mkt-container">
        {demoMode && (
          <div className="notice" style={{ marginTop: 18 }}>
            Demo mode: the live database is not connected yet. The sample business
            page works end to end with demo data — nothing is saved.
          </div>
        )}

        {/* Hero (desktop, ≥1024px) — hero video panel with the headline
            on the video under a lightened green gradient, so the footage
            stays bright. Hidden below 1024px (see .hero-desktop CSS).
            The floating pills cycle through the product working:
            a booking lands, a reminder goes out, notes get saved. */}
        <section className="mkt-hero hero-desktop">
          <div className="hero-panel">
            <video className="hero-bg-video" autoPlay muted loop playsInline preload="auto" poster="/hero/hero-poster.jpg" aria-hidden="true">
              <source src="/hero/hero-video.mp4" type="video/mp4" />
            </video>
            <div className="hero-overlay" />
            <div className="hero-content">
              <p className="hero-badge"><span className="hero-badge-dot" />Built for local businesses across the U.S. &amp; beyond</p>
              <h1>Let customers book.<br />Get back to work.</h1>
              <p className="hero-sub">Your own booking page, automatic reminders, and every customer in one place — fewer no-shows, less phone tag.</p>
              <div className="hero-ctas">
                <Link href="/owner/signup" className="btn btn-primary btn-lg">Start free</Link>
                <Link href="/main-street-barbers" className="btn btn-lg">See a live example</Link>
              </div>
              <p className="hero-micro">30 days free · No card needed</p>
            </div>
            <div className="hero-pills" aria-hidden="true">
              <div className="hero-pill">
                <span className="pill-ico">📅</span>
                <span><strong>New booking</strong> — Haircut · Fri 9:30 AM</span>
              </div>
              <div className="hero-pill">
                <span className="pill-ico">🔔</span>
                <span><strong>Reminder sent</strong> — text + email</span>
              </div>
              <div className="hero-pill">
                <span className="pill-ico">📝</span>
                <span><strong>Visit notes saved</strong> — see you next time</span>
              </div>
            </div>
          </div>
        </section>

        {/* Hero (mobile, <1024px) — light and open: centered text on the
            pale background, hero video in a clean panel below, with the
            same floating pills over the video. Nothing else sits on the
            video. Hidden at ≥1024px (see .hero-mobile CSS). */}
        <section className="mkt-hero hero-mobile">
          <div className="hero-content">
            <p className="hero-badge"><span className="hero-badge-dot" />Built for local businesses across the U.S. &amp; beyond</p>
            <h1>Let customers book.<br />Get back to work.</h1>
            <p className="hero-sub">Your own booking page, automatic reminders, and every customer in one place — fewer no-shows, less phone tag.</p>
            <div className="hero-ctas">
              <Link href="/owner/signup" className="btn btn-primary btn-lg">Start free</Link>
              <Link href="/main-street-barbers" className="btn btn-lg">See a live example</Link>
            </div>
            <p className="hero-micro">30 days free · No card needed</p>
          </div>
          <div className="hero-media">
            <video autoPlay muted loop playsInline preload="auto" poster="/hero/hero-poster.jpg" aria-label="AppointEase in action — a client booking an appointment and a business owner checking the day's bookings">
              <source src="/hero/hero-video.mp4" type="video/mp4" />
            </video>
            <div className="hero-pills hero-pills-m" aria-hidden="true">
              <div className="hero-pill">
                <span className="pill-ico">📅</span>
                <span><strong>New booking</strong> — Haircut · Fri 9:30 AM</span>
              </div>
              <div className="hero-pill">
                <span className="pill-ico">🔔</span>
                <span><strong>Reminder sent</strong> — text + email</span>
              </div>
              <div className="hero-pill">
                <span className="pill-ico">📝</span>
                <span><strong>Visit notes saved</strong> — see you next time</span>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mkt-section" data-reveal>
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
              <p>Put it on Google, Instagram, your website, or send it by text. Customers pick a time and book in a few taps.</p>
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

        {/* Journey — the life of one appointment in four named steps.
            The steps light up in sequence when the strip scrolls into
            view (see HomeAnimations); with JS off or reduced motion,
            all four simply show. */}
        <section className="mkt-section" data-reveal>
          <div className="section-head">
            <p className="eyebrow">How a booking flows</p>
            <h2>From your link to your front door</h2>
            <p className="lede">Every appointment follows the same path — and most of it runs itself.</p>
          </div>
          <div className="journey2" data-journey>
            <div className="journey2-step">
              <div className="journey2-icon" aria-hidden="true">📅</div>
              <h3>Book</h3>
              <p>Customers pick a time on your page, day or night.</p>
            </div>
            <div className="journey2-step">
              <div className="journey2-icon" aria-hidden="true">🔔</div>
              <h3>We remind them</h3>
              <p>Automatic texts and emails go out 24 hours and 2 hours before.</p>
              <p className="journey2-note">(when the booking is made far enough ahead)</p>
            </div>
            <div className="journey2-step">
              <div className="journey2-icon" aria-hidden="true">🤝</div>
              <h3>You meet</h3>
              <p>Your day, organized by team member, on one calendar.</p>
            </div>
            <div className="journey2-step">
              <div className="journey2-icon" aria-hidden="true">📝</div>
              <h3>Follow up</h3>
              <p>Write the visit notes, share a summary, book the next visit.</p>
            </div>
          </div>
        </section>

        {/* Feature sections — Calendly-style alternating blocks: a
            built visual on one side, a headline plus expandable plain-
            language detail rows on the other. All visuals are built
            mocks or recordings of the real app, using the demo shop
            and the matched on-page examples. Claims match the live
            product only. */}
        <section className="mkt-section feature-rows">

          {/* (a) Reminders */}
          <div className="feature-row" data-reveal>
            <div className="feature-copy">
              <p className="eyebrow">Automatic reminders</p>
              <h2>Reminders that bring people back</h2>
              <p className="lede">
                Confirmations and reminders go out on their own — by text and
                email — so more people show up, on time.
              </p>
              <div className="feat-details">
                <details className="feat-detail" open>
                  <summary>A confirmation the moment they book</summary>
                  <p>Your customer gets a text and an email right away, with the time, the place, and a link to manage the visit.</p>
                </details>
                <details className="feat-detail">
                  <summary>A reminder 24 hours before, and 2 hours before</summary>
                  <p>Two more reminders land before the appointment, by text and email at the same time (when the booking is made far enough ahead).</p>
                </details>
                <details className="feat-detail">
                  <summary>Running late? They can fix it themselves</summary>
                  <p>Every message carries a secure link to reschedule or cancel, so changes land on your calendar without a phone call.</p>
                </details>
                <details className="feat-detail">
                  <summary>You see it all happen</summary>
                  <p>Open any appointment and see its confirmation and reminders — sent, scheduled, or on the way — so you always know who is coming in.</p>
                </details>
              </div>
            </div>
            <div className="feat-visual">
              {/* Animated loop of the real product: the confirmation
                  screen's own message previews — confirmation, 24-hour
                  reminder, 2-hour reminder, each with its reschedule /
                  cancel link. Recorded from the actual app. */}
              <div className="showcase-photo">
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
            </div>
          </div>

          {/* (b) Customer history + visit notes */}
          <div className="feature-row flip" data-reveal>
            <div className="feature-copy">
              <p className="eyebrow">Customer history</p>
              <h2>Every customer, remembered</h2>
              <p className="lede">
                Open any customer and see everything — bookings, messages,
                visits, and notes — in one timeline.
              </p>
              <div className="feat-details">
                <details className="feat-detail" open>
                  <summary>The whole story on one page</summary>
                  <p>Every booking, message, and visit for a customer sits in one timeline, so anyone on your team can pick up where the last visit left off.</p>
                </details>
                <details className="feat-detail">
                  <summary>Notes after every visit</summary>
                  <p>Write what was discussed and what happens next while it is fresh — saved to the customer&apos;s page, not lost on a sticky note.</p>
                </details>
                <details className="feat-detail">
                  <summary>Share the summary, keep the notes private</summary>
                  <p>Send the customer a short visit summary and their to-dos; your internal notes stay yours.</p>
                </details>
                <details className="feat-detail">
                  <summary>Nothing gets lost when people change</summary>
                  <p>Reassign a customer to another team member and the full history goes with them.</p>
                </details>
              </div>
            </div>
            <div className="mock-panel" role="img" aria-label="A customer page for James at Main Street Barbers: a timeline showing he booked a Classic haircut, reminders were sent, the visit was completed, and visit notes were saved, with a button to share the visit summary">
              <div className="ui-mock">
                <div className="dash-head tight">
                  <span className="phone-avatar">J</span>
                  <div>
                    <div className="dash-biz">James</div>
                    <div className="phone-sub">Main Street Barbers · Confirmation #: AE-7KX42P</div>
                  </div>
                </div>
                <div className="tl">
                  <div className="tl-item">
                    <span className="tl-dot" aria-hidden="true">📅</span>
                    <div>
                      <p className="tl-what">Booked a Classic haircut</p>
                      <p className="tl-when">Friday 9:30 AM · booked online</p>
                    </div>
                  </div>
                  <div className="tl-item">
                    <span className="tl-dot" aria-hidden="true">🔔</span>
                    <div>
                      <p className="tl-what">Reminders sent</p>
                      <p className="tl-when">Text + email, 24 hours and 2 hours before</p>
                    </div>
                  </div>
                  <div className="tl-item">
                    <span className="tl-dot" aria-hidden="true">✅</span>
                    <div>
                      <p className="tl-what">Visit completed</p>
                      <p className="tl-when">With Marcus · 45 minutes</p>
                    </div>
                  </div>
                  <div className="tl-item">
                    <span className="tl-dot" aria-hidden="true">📝</span>
                    <div>
                      <p className="tl-what">Visit notes saved</p>
                      <p className="tl-when">What was done — and what&apos;s next</p>
                    </div>
                  </div>
                </div>
                <div className="share-strip">
                  <span className="mock-btn mock-btn-primary">Share the visit summary</span>
                </div>
              </div>
            </div>
          </div>

          {/* (c) Team */}
          <div className="feature-row" data-reveal>
            <div className="feature-copy">
              <p className="eyebrow">Your team</p>
              <h2>Your whole team, one calendar</h2>
              <p className="lede">
                One booking page for the whole business, and a clear day for
                every person on the team.
              </p>
              <div className="feat-details">
                <details className="feat-detail" open>
                  <summary>Everyone sees their own day</summary>
                  <p>Each team member gets their own calendar, services, and hours — customers book the right person, every time.</p>
                </details>
                <details className="feat-detail">
                  <summary>Assign customers to the right person</summary>
                  <p>Put each customer with the team member who knows them, and their history follows.</p>
                </details>
                <details className="feat-detail">
                  <summary>Team members sign in on their own</summary>
                  <p>Invite your team by email. Staff see only their own customers; managers see the whole business.</p>
                </details>
                <details className="feat-detail">
                  <summary>One link for the whole shop</summary>
                  <p>Customers pick a person — or first available — from your single booking page.</p>
                </details>
              </div>
            </div>
            <div className="mock-panel" role="img" aria-label="Today's appointments at Main Street Barbers, grouped by team member: Marcus has James at 9:00 and Daniel at 10:15, Alicia has Sarah at 9:30 and Beth at 11:00">
              <div className="ui-mock">
                <div className="dash-head">
                  <span className="dash-biz">Main Street Barbers</span>
                  <span className="dash-tabs">
                    <span className="dash-tab active">Today</span>
                    <span className="dash-tab">Calendar</span>
                    <span className="dash-tab">Inbox <span className="dash-badge">2</span></span>
                  </span>
                </div>
                <div className="team-group">
                  <div className="team-head">
                    <span className="team-name">Marcus</span>
                    <span className="dash-chip">2 today</span>
                  </div>
                  <div className="dash-row">
                    <div>
                      <p className="dash-who"><span className="dash-time">9:00 AM</span> — James</p>
                      <p className="dash-what">Classic haircut</p>
                    </div>
                    <span className="dash-chip">Confirmed</span>
                  </div>
                  <div className="dash-row">
                    <div>
                      <p className="dash-who"><span className="dash-time">10:15 AM</span> — Daniel</p>
                      <p className="dash-what">Beard trim</p>
                    </div>
                    <span className="dash-chip">Confirmed</span>
                  </div>
                </div>
                <div className="team-group">
                  <div className="team-head">
                    <span className="team-name">Alicia</span>
                    <span className="dash-chip">2 today</span>
                  </div>
                  <div className="dash-row">
                    <div>
                      <p className="dash-who"><span className="dash-time">9:30 AM</span> — Sarah</p>
                      <p className="dash-what">Cut &amp; color</p>
                    </div>
                    <span className="dash-chip">Confirmed</span>
                  </div>
                  <div className="dash-row">
                    <div>
                      <p className="dash-who"><span className="dash-time">11:00 AM</span> — Beth</p>
                      <p className="dash-what">Blowout &amp; finish</p>
                    </div>
                    <span className="dash-chip">Confirmed</span>
                  </div>
                </div>
                <div className="dash-linkrow">
                  <span className="dash-url">appointease.io/main-street-barbers</span>
                  <span className="mock-btn mock-btn-primary">Copy booking link</span>
                </div>
              </div>
            </div>
          </div>

          {/* (d) Forms */}
          <div className="feature-row flip" data-reveal>
            <div className="feature-copy">
              <p className="eyebrow">Forms before the visit</p>
              <h2>Know before they arrive</h2>
              <p className="lede">
                Get the answers and documents you need before the customer
                walks in — not after they arrive.
              </p>
              <div className="feat-details">
                <details className="feat-detail" open>
                  <summary>Ask your questions up front</summary>
                  <p>Build a short form once — what you need to know before the visit — and attach it to a service.</p>
                </details>
                <details className="feat-detail">
                  <summary>Customers answer before they arrive</summary>
                  <p>After booking, customers fill in your form from their confirmation — answers are ready before they walk in.</p>
                </details>
                <details className="feat-detail">
                  <summary>Documents in one place</summary>
                  <p>Customers can upload files with their answers, and everything sits on their customer page.</p>
                </details>
                <details className="feat-detail">
                  <summary>Start from a ready-made template</summary>
                  <p>Start from a ready-made template — like the law-office intake, with case type, a description, and documents — and make it yours.</p>
                </details>
              </div>
            </div>
            <div className="mock-panel" role="img" aria-label="A short before-your-visit form for Main Street Barbers asking what the customer wants done, whether they are allergic to any hair products, and offering a photo upload">
              <div className="ui-mock">
                <p className="manage-biz">Main Street Barbers</p>
                <p className="manage-title">Before your visit</p>
                <div className="form-field">
                  <p className="form-label">What are we doing today?</p>
                  <p className="form-input">Short back and sides, a little longer on top…</p>
                </div>
                <div className="form-field">
                  <p className="form-label">Allergic to any hair products?</p>
                  <div className="yn-row">
                    <span className="yn-chip sel">No</span>
                    <span className="yn-chip">Yes</span>
                  </div>
                </div>
                <div className="form-field">
                  <p className="form-label">Show us the style you want</p>
                  <p className="form-upload">＋ Add a photo</p>
                </div>
                <span className="mock-btn mock-btn-primary btn-block">Send answers</span>
                <p className="phone-note" style={{ marginTop: 10 }}>Takes about a minute</p>
              </div>
            </div>
          </div>

          {/* (e) Inbox */}
          <div className="feature-row" data-reveal>
            <div className="feature-copy">
              <p className="eyebrow">One inbox</p>
              <h2>Messages in one place</h2>
              <p className="lede">
                Every customer conversation in one inbox — nothing buried in
                a personal phone.
              </p>
              <div className="feat-details">
                <details className="feat-detail" open>
                  <summary>One inbox for every conversation</summary>
                  <p>Every customer message lands in one list, next to their bookings — no digging through texts and emails.</p>
                </details>
                <details className="feat-detail">
                  <summary>Badges show what is waiting</summary>
                  <p>An unread count sits on every conversation, so no message slips by.</p>
                </details>
                <details className="feat-detail">
                  <summary>Reply from anywhere in the app</summary>
                  <p>Answer from the inbox, the customer page, or the appointment — it is all the same conversation.</p>
                </details>
                <details className="feat-detail">
                  <summary>Quick replies for the usual answers</summary>
                  <p>One tap fills in “Running 10 min late” or “Here&apos;s your booking link” — edit it, send it, done.</p>
                </details>
              </div>
            </div>
            <div className="mock-panel" role="img" aria-label="The AppointEase inbox: conversations with James and Sarah marked unread, plus recent conversations with Daniel and Beth">
              <div className="ui-mock">
                <div className="dash-head">
                  <span className="dash-biz">Inbox</span>
                  <span className="dash-badge">2 unread</span>
                </div>
                <div className="inbox-row unread">
                  <span className="inbox-ava">J</span>
                  <div className="inbox-main">
                    <p className="inbox-name"><span>James</span><span className="inbox-time">9:41 AM</span></p>
                    <p className="inbox-snip">Perfect — see you Friday!</p>
                  </div>
                  <span className="dash-badge">1</span>
                </div>
                <div className="inbox-row unread">
                  <span className="inbox-ava">S</span>
                  <div className="inbox-main">
                    <p className="inbox-name"><span>Sarah</span><span className="inbox-time">8:15 AM</span></p>
                    <p className="inbox-snip">Can I move my cut to Saturday morning?</p>
                  </div>
                  <span className="dash-badge">1</span>
                </div>
                <div className="inbox-row">
                  <span className="inbox-ava">D</span>
                  <div className="inbox-main">
                    <p className="inbox-name"><span>Daniel</span><span className="inbox-time">Tue</span></p>
                    <p className="inbox-snip">Thanks — booked for next month too.</p>
                  </div>
                </div>
                <div className="inbox-row">
                  <span className="inbox-ava">B</span>
                  <div className="inbox-main">
                    <p className="inbox-name"><span>Beth</span><span className="inbox-time">Mon</span></p>
                    <p className="inbox-snip">Running 10 minutes late, sorry!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Built for your kind of business */}
        <section className="mkt-section" data-reveal>
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

        {/* Demo showcase — "See it work": the honest stand-in for a
            testimonials band. AppointEase is new, so instead of quotes
            from customers we don't have, visitors try the live demo. */}
        <section className="mkt-section" data-reveal>
          <div className="showcase">
            <div>
              <p className="eyebrow" style={{ color: "#bcd8c2" }}>See it work</p>
              <h2>Meet Main Street Barbers</h2>
              <p>
                This is a live demo of an AppointEase booking page — look through
                the services and try booking, the way your own customers will.
              </p>
              <div style={{ marginTop: 20 }}>
                <Link href="/main-street-barbers" className="btn btn-white btn-lg">Try the demo</Link>
              </div>
            </div>
            <video autoPlay muted loop playsInline poster="/images/barbershop.jpg">
              <source src="/videos/hero-loop.mp4" type="video/mp4" />
            </video>
          </div>
        </section>

        {/* Big statement — the Calendly closing pattern: one plain
            sentence about who this is for, then the free start. */}
        <section className="mkt-section" data-reveal>
          <div className="statement">
            <p className="eyebrow">Why AppointEase</p>
            <h2>Built for people whose work runs on appointments.</h2>
            <p>
              If your day is a calendar — a barber&apos;s chair, a salon, a clinic,
              a law office — AppointEase keeps it full, reminds your customers,
              and keeps the phone quiet.
            </p>
            <Link href="/owner/signup" className="btn btn-primary btn-lg">Start free</Link>
            <p className="cta-micro">30 days free · No card needed</p>
            <p className="cta-micro">Questions? A human answers — by email, whenever you need help.</p>
          </div>
        </section>

        {/* Pricing */}
        <section className="mkt-section" data-reveal>
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
          <p className="pricing-note">
            Annual billing: 2 months free — Solo $299.90/yr · Team $499.90/yr · Business $1,499.90/yr
          </p>

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
                  <th scope="row">Confirmation, 24-hour &amp; 2-hour reminders by text and email (when the booking is made far enough ahead)</th>
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
        <section className="mkt-section" data-reveal>
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
              <p>Each appointment gets a confirmation, then a reminder 24 hours before and another 2 hours before (when the booking is made far enough ahead) — by text message and email at the same time, each with a link to reschedule or cancel.</p>
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
          <Link href="/owner/signup" className="btn btn-white btn-lg">Start free</Link>
          <p className="cta-micro cta-micro-light">30 days free · No card needed</p>
        </section>
      </div>
    </main>
  );
}
