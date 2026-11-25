import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — AppointEase",
  description:
    "AppointEase is built and run by Frantz Mathieu in Boston, MA — booking pages and automatic reminders for appointment-based businesses.",
};

// About — honest and short: who built this, why it exists, how to reach
// a human. No invented company name, no address, no phone.
export default function AboutPage() {
  return (
    <main className="mkt">
      <div className="mkt-container">
        <div className="section-head" style={{ paddingTop: 42 }}>
          <p className="eyebrow">About</p>
          <h1 style={{ fontSize: "clamp(30px, 4.6vw, 42px)" }}>Hi, I&apos;m Frantz.</h1>
          <p className="lede">
            I built AppointEase, and I run it — from Boston, Massachusetts.
          </p>
        </div>

        <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 56 }}>
          <div className="contact-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/frantz.jpg"
              alt="Frantz Mathieu, founder of AppointEase"
              width={150}
              height={150}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                display: "block",
                margin: "0 auto 20px",
                border: "3px solid var(--mint, #dcefe0)",
              }}
            />
            <p style={{ lineHeight: 1.65, margin: "0 0 14px" }}>
              AppointEase started with a problem every appointment business
              knows too well: the phone rings while your hands are busy, a
              customer forgets and never shows, and the chair sits empty.
              No-shows and phone tag quietly cost local shops real money
              every single week.
            </p>
            <p style={{ lineHeight: 1.65, margin: "0 0 14px" }}>
              So I built the fix I wished they had. AppointEase gives a
              business its own booking page — customers pick a service and a
              time in under a minute — and then confirmations and reminders
              go out automatically, by text and email at the same time:
              right away, 24 hours before, and 2 hours before, each with a
              link to reschedule or cancel. Fewer empty chairs, less time on
              the phone, and a page that looks like your business, not a
              template.
            </p>
            <p style={{ lineHeight: 1.65, margin: "0 0 14px" }}>
              AppointEase is new and small, and I&apos;d rather be honest
              about that than dress it up. When you write to support,
              you&apos;re writing to me — and I read every message myself.
            </p>
            <p style={{ lineHeight: 1.65, margin: 0 }}>
              Questions, ideas, or a problem with your page? Email me at{" "}
              <a href="mailto:support@appointease.io" style={{ fontWeight: 700 }}>
                support@appointease.io
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
