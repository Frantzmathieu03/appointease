import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import UnreadBadge from "@/components/UnreadBadge";

export const metadata: Metadata = {
  title: "AppointEase — Let customers book. Get back to work.",
  description:
    "Online booking, reminders and messaging for salons, barbershops, law firms, medical offices and other appointment-based businesses.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.png",
    apple: "/icon-512.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="site-header-wrap">
          <div className="mkt-container">
            <header className="site-header">
              <Link href="/" className="logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo.webp" alt="AppointEase logo" className="logo-img" width={34} height={34} />
                <span className="logo-word">AppointEase</span>
              </Link>
              <nav className="header-links">
                <Link href="/my-appointments">
                  My appointments
                  <UnreadBadge variant="customer" />
                </Link>
                <Link href="/owner">Business sign-in</Link>
                <Link href="/owner/signup" className="btn btn-primary" style={{ padding: "9px 15px" }}>
                  Create booking page
                </Link>
              </nav>
            </header>
          </div>
        </div>
        {children}
        <footer className="site-footer">
          <div className="mkt-container footer-inner">
            <div className="footer-grid">
              <div className="footer-brand">
                <Link href="/" className="logo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/logo.webp" alt="AppointEase logo" className="logo-img" width={34} height={34} />
                  <span className="logo-word">AppointEase</span>
                </Link>
                <p>Booking, reminders and messaging for appointment-based businesses.</p>
              </div>
              <div className="footer-col">
                <h4>Product</h4>
                <Link href="/owner/signup">Create booking page</Link>
                <Link href="/jesus-barber-shop">See a live example</Link>
                <Link href="/my-appointments">My appointments</Link>
                <Link href="/owner">Business sign-in</Link>
              </div>
              <div className="footer-col">
                <h4>Company</h4>
                <Link href="/contact">Contact</Link>
                <Link href="/terms">Terms of Service</Link>
                <Link href="/privacy">Privacy Policy</Link>
              </div>
            </div>
            <div className="footer-bottom">© 2026 AppointEase</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
