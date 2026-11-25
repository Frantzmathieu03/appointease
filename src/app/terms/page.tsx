import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — AppointEase",
  description: "The terms that govern use of AppointEase, the booking platform for appointment-based businesses.",
};

export default function TermsPage() {
  return (
    <main className="legal">
      <p className="eyebrow">Legal</p>
      <h1>Terms of Service</h1>
      <p className="legal-updated">Effective November 24, 2026</p>

      <p>
        Welcome to AppointEase. AppointEase provides an online booking platform
        that lets appointment-based businesses publish a booking page, manage
        appointments, message customers, and send automatic reminders. By using
        AppointEase — as a business or as a customer booking an appointment —
        you agree to these Terms of Service.
      </p>

      <h2>1. The service</h2>
      <p>
        AppointEase gives each business its own booking page where customers can
        view services and hours, book appointments, and exchange messages with
        the business. AppointEase provides the booking and reminder tools only:
        the services themselves (haircuts, consultations, treatments, and so
        on) are provided by the business you book with, not by AppointEase.
        AppointEase is a scheduling tool only: it is not a medical record
        system and is not HIPAA-certified, so diagnoses, treatment notes and
        other medical details must not be entered into booking notes or
        messages.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li><strong>Business accounts.</strong> A business owner creates an account, sets up their business profile, services, staff and hours, and publishes a booking page.</li>
        <li><strong>Customer accounts.</strong> Customers create one account with a verified phone number and password, or with Google sign-in, and can use it to book with any business on AppointEase.</li>
        <li>You are responsible for keeping your sign-in credentials confidential and for activity under your account. Tell us promptly if you believe your account has been compromised.</li>
        <li>You must provide accurate information and keep it up to date.</li>
      </ul>

      <h2>3. Subscriptions and the free trial</h2>
      <ul>
        <li>Businesses subscribe to a paid plan based on team size. Every plan begins with a 30-day free trial; no payment card is required to start the trial.</li>
        <li>If a business does not subscribe when its trial ends, its public booking page pauses. Account data is not deleted, and the page goes live again when a subscription is active.</li>
        <li>Paid subscriptions renew monthly until cancelled. You can cancel at any time from your billing settings; cancellation takes effect at the end of the current billing period.</li>
        <li>Payments are processed by our payment provider. AppointEase does not store full payment card numbers.</li>
        <li>Customers never pay AppointEase to book an appointment. Any price for a service is set by, and paid to, the business.</li>
      </ul>

      <h2>4. Bookings, reminders and messages</h2>
      <ul>
        <li>When a customer books, AppointEase sends a confirmation and reminders before the appointment by text message and email — at booking, 24 hours before, and 2 hours before — each with a secure link to reschedule or cancel.</li>
        <li>By providing a phone number and email address when booking, the customer agrees to receive these transactional messages about their appointments. Message and data rates may apply. Reply STOP to a text to stop text reminders for that number; appointment emails can be managed through the business.</li>
        <li>Businesses are responsible for honoring appointments booked through their page, for the accuracy of their services, prices and hours, and for responding to customer messages.</li>
        <li>Customers are responsible for showing up on time or using the reschedule/cancel link as early as possible when plans change.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use AppointEase for any unlawful purpose, or to book, offer, or advertise unlawful services.</li>
        <li>Send spam, harassing, or deceptive messages through the platform.</li>
        <li>Impersonate another person or business, or create accounts with false information.</li>
        <li>Attempt to access another user&apos;s account or data, or interfere with the security or operation of the platform.</li>
        <li>Scrape, copy, or resell the platform or its data except as permitted by law.</li>
      </ul>

      <h2>6. Your content</h2>
      <p>
        Businesses keep ownership of the content they add — business names,
        descriptions, photos, services and prices. By adding content, you give
        AppointEase permission to display it on your booking page and in
        customer discovery listings so customers can find and book with you.
      </p>

      <h2>7. Third-party services</h2>
      <p>
        AppointEase relies on third-party providers for hosting, payments,
        email and text delivery. Your use of payment features is also subject
        to the payment provider&apos;s terms. AppointEase is not responsible
        for services provided by the businesses listed on the platform.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        AppointEase is provided &quot;as is&quot; and &quot;as available.&quot;
        We work to keep the platform reliable, but we do not guarantee that it
        will be uninterrupted or error-free, or that every message will be
        delivered by carriers or email providers outside our control.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, AppointEase&apos;s total
        liability for any claim arising from use of the platform is limited to
        the amount the business paid AppointEase in the twelve months before
        the claim, or $100 if no amounts were paid. AppointEase is not liable
        for indirect, incidental, or consequential damages, or for the acts or
        omissions of businesses or customers using the platform.
      </p>

      <h2>10. Termination</h2>
      <p>
        You may stop using AppointEase and close your account at any time. We
        may suspend or terminate an account that violates these terms, with
        notice where reasonably possible.
      </p>

      <h2>11. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. When we make material
        changes, we will update the effective date above and, where practical,
        notify account holders by email. Continuing to use AppointEase after
        changes take effect means you accept the updated terms.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These terms are governed by the laws of the Commonwealth of
        Massachusetts, without regard to its conflict-of-laws rules.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these terms? Email us at{" "}
        <a href="mailto:support@appointease.io">support@appointease.io</a>{" "}
        or use our <Link href="/contact">contact page</Link>.
      </p>
    </main>
  );
}
