"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UnreadBadge from "@/components/UnreadBadge";

/**
 * The AppointEase marketing header/footer. Customer-facing manage
 * pages (/manage/<token> — the cancel/reschedule links from reminders)
 * must show ONLY the business's own branding (PDF §5), so the chrome
 * renders nothing there; the page itself carries the business header
 * and a small "Powered by AppointEase" footer line.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/manage/")) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="site-header-wrap">
        <div className="mkt-container">
          <header className="site-header">
            <Link href="/" className="logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.webp" alt="AppointEase logo" className="logo-img" width={40} height={40} />
              <span className="logo-word">Appoint<span className="logo-word-accent">Ease</span></span>
            </Link>
            <nav className="header-links">
              <Link href="/explore" className="header-link-text">Find a business</Link>
              <Link href="/my-appointments" className="header-link-text">
                My appointments
                <UnreadBadge variant="customer" />
              </Link>
              <Link href="/owner" className="header-link-text">Business sign-in</Link>
              <Link href="/owner/signup" className="btn btn-primary header-cta">
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
                <img src="/images/logo.webp" alt="AppointEase logo" className="logo-img" width={40} height={40} />
                <span className="logo-word">Appoint<span className="logo-word-accent">Ease</span></span>
              </Link>
              <p>Booking, reminders and messaging for appointment-based businesses.</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <Link href="/owner/signup">Create booking page</Link>
              <Link href="/explore">Find a business</Link>
              <Link href="/main-street-barbers">See a live example</Link>
              <Link href="/my-appointments">My appointments</Link>
              <Link href="/owner">Business sign-in</Link>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </div>
          </div>
          <div className="footer-bottom">© 2026 AppointEase</div>
        </div>
      </footer>
    </>
  );
}
