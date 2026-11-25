import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — AppointEase",
  description: "How AppointEase collects, uses and protects information for businesses and their customers.",
};

export default function PrivacyPage() {
  return (
    <main className="legal">
      <p className="eyebrow">Legal</p>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Effective November 24, 2026</p>

      <p>
        This policy explains what information AppointEase collects, how we use
        it, and the choices you have. AppointEase is a booking platform:
        businesses use it to publish booking pages and manage appointments, and
        customers use it to book and manage their appointments.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account information.</strong> Name, email address, and phone number when you create a business or customer account. If you sign in with Google, we receive the basic profile information Google shares.</li>
        <li><strong>Business information.</strong> Business name, category, address, phone, services, prices, staff and hours that a business adds to its booking page. Much of this is intended to be public so customers can find and book the business.</li>
        <li><strong>Booking information.</strong> The service, staff member, date and time you book, your contact details, and any notes you add, plus your appointment history (bookings, reschedules, cancellations) and reviews you leave.</li>
        <li><strong>Messages.</strong> Messages exchanged between customers and businesses through AppointEase.</li>
        <li><strong>Payment information.</strong> Subscription payments are processed by our payment provider (Stripe). We receive confirmation of payment and subscription status; we do not store full card numbers.</li>
        <li><strong>Technical information.</strong> Basic device, browser and usage data needed to run and secure the service, and notification preferences such as web-push subscriptions you opt into.</li>
      </ul>

      <h2>2. Health information</h2>
      <p>
        AppointEase is an appointment-scheduling tool — it is not a medical
        record system, and it is not HIPAA-certified. Businesses that take
        bookings for health-related services, such as dental, medical or
        wellness practices, must not enter diagnoses, treatment notes, or
        other medical details into booking notes, messages, or any other
        part of AppointEase. Customers should share only the information
        needed to book and manage an appointment.
      </p>

      <h2>3. How we use information</h2>
      <ul>
        <li>To provide the service: create and display booking pages, take bookings, and show each business only its own customers, appointments and messages.</li>
        <li>To send appointment confirmations and reminders by text message and email (at booking, 24 hours before, and 2 hours before), including secure reschedule/cancel links.</li>
        <li>To let businesses and customers message each other, and to notify you about new messages.</li>
        <li>To process subscriptions, prevent fraud and abuse, and keep the platform secure.</li>
        <li>To respond to support requests and improve the service.</li>
      </ul>
      <p>
        A customer&apos;s booking and message history with one business is not
        shared with other businesses. Each business sees only its own
        relationships, appointments and messages.
      </p>

      <h2>4. How we share information</h2>
      <ul>
        <li><strong>With the business you book.</strong> Your name, contact details, booking details and messages are shared with that business so it can serve you.</li>
        <li><strong>With service providers.</strong> We use trusted providers to run AppointEase — for example hosting and database, payment processing, email delivery and text messaging. They receive only the information needed to perform their service.</li>
        <li><strong>For legal reasons.</strong> We may disclose information if required by law, court order, or to protect the rights and safety of our users and the platform.</li>
        <li><strong>Never sold.</strong> We do not sell your personal information, and we do not share it for third-party advertising.</li>
      </ul>

      <h2>5. Cookies</h2>
      <p>
        We use cookies and similar storage that are necessary to keep you
        signed in and to make the site work. We do not use third-party
        advertising trackers.
      </p>

      <h2>6. Data security</h2>
      <p>
        We protect information with encryption in transit, access controls,
        and database rules that separate each business&apos;s data. No system
        is perfectly secure, but we work to safeguard your information and to
        limit access to only what is needed to operate the service.
      </p>

      <h2>7. Data retention</h2>
      <p>
        We keep account, booking and message information for as long as the
        account is active and as needed to provide the service, resolve
        disputes, and meet legal obligations. When a subscription lapses, data
        is retained so the business can reactivate without starting over.
      </p>

      <h2>8. Your rights and choices</h2>
      <ul>
        <li><strong>Access and correction.</strong> You can view and update your account and booking information in the app, or contact us for help.</li>
        <li><strong>Deletion.</strong> You can ask us to delete your account and personal information; some records may be kept where the law requires.</li>
        <li><strong>Text messages.</strong> Reply STOP to stop appointment text reminders for your number. Essential booking emails can be managed by contacting us or the business.</li>
        <li><strong>Marketing.</strong> We do not send marketing texts. If we ever offer optional product emails, you will be able to unsubscribe at any time.</li>
      </ul>

      <h2>9. Children</h2>
      <p>
        AppointEase is intended for adults and businesses. We do not knowingly
        collect personal information from children under 13.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. When we make material
        changes, we will update the effective date above and, where practical,
        notify account holders by email.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about privacy? Email us at{" "}
        <a href="mailto:support@appointease.io">support@appointease.io</a>{" "}
        or use our <Link href="/contact">contact page</Link>.
      </p>
    </main>
  );
}
