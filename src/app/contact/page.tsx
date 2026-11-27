import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact · AppointEase",
  description: "Get in touch with the AppointEase team. Questions from business owners and customers welcome.",
};

export default function ContactPage() {
  return (
    <main className="mkt">
      <div className="mkt-container">
        <div className="section-head" style={{ paddingTop: 42 }}>
          <p className="eyebrow">Contact</p>
          <h1 style={{ fontSize: "clamp(30px, 4.6vw, 42px)" }}>Talk to a human</h1>
          <p className="lede">
            Questions about your booking page, a booking you made, or anything
            else, send us a message and we&apos;ll get back to you. We answer
            every message within one business day, Monday to Friday, 9 AM to
            6 PM Eastern.
          </p>
        </div>

        <div className="contact-grid" style={{ paddingBottom: 56 }}>
          <div className="contact-card">
            <h3>Email us directly</h3>
            <p style={{ margin: "0 0 14px", lineHeight: 1.55 }}>
              <a href="mailto:support@appointease.io" style={{ fontWeight: 700 }}>
                support@appointease.io
              </a>
            </p>
            <h3>Business owners</h3>
            <p className="small" style={{ fontSize: 14, lineHeight: 1.55, margin: "0 0 14px" }}>
              Setting up your page, billing questions, or help for your team:
              pick &quot;Business owner&quot; in the form.
            </p>
            <h3>Customers</h3>
            <p className="small" style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>
              For a specific appointment, the fastest route is the reschedule
              or message link in your confirmation, but we&apos;re happy to
              help here too.
            </p>
          </div>
          <div className="contact-card">
            <ContactForm />
          </div>
        </div>
      </div>
    </main>
  );
}
