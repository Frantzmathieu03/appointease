import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AppointEase — Let customers book. Get back to work.",
  description:
    "Online booking, reminders and messaging for salons, barbershops, law firms, medical offices and other appointment-based businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="column column-wide">
          <header className="site-header">
            <Link href="/" className="logo">
              <span className="logo-mark">✓</span>
              <span className="logo-word">AppointEase</span>
            </Link>
            <nav className="header-links">
              <Link href="/my-appointments">My appointments</Link>
              <Link href="/owner">Business sign-in</Link>
              <Link href="/owner/signup" className="btn btn-primary" style={{ padding: "9px 15px" }}>
                Create booking page
              </Link>
            </nav>
          </header>
        </div>
        {children}
        <footer className="site-footer">AppointEase · Booking, reminders and messaging for appointment-based businesses</footer>
      </body>
    </html>
  );
}
