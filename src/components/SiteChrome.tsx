"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The AppointEase marketing header/footer. Two kinds of pages show
 * ONLY the business's own branding, so the chrome renders nothing
 * there:
 *   - customer-facing manage pages (/manage/<token>: the
 *     cancel/reschedule links from reminders, PDF §5);
 *   - public business pages (/<slug>, /<slug>/book, /<slug>/message: 
 *     white label, Frantz 2026-11-25): the [slug] layout carries the
 *     business's own slim header and a small "Powered by AppointEase"
 *     line at the bottom;
 *   - the owner dashboard (/owner/dashboard/*, Frantz 2026-11-25
 *     late): restyled to the business pages' design language, so it
 *     carries the business's own top row and menu card instead of
 *     the platform header. The /owner sign-in page keeps the header.
 * A first path segment that is not a known platform route is treated
 * as a business slug. The platform header (Pricing · Business
 * Log in · Get started for free) stays on the platform's own pages: homepage,
 * /explore, pricing and the owner sign-in pages.
 */
const PLATFORM_SEGMENTS = new Set([
  "login",
  "signup",
  "owner",
  "explore",
  "about",
  "terms",
  "privacy",
  "contact",
  "my-appointments",
  "auth",
  "invite",
  "set-password",
  "manage",
]);

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const firstSegment = pathname?.split("/")[1] ?? "";
  if (
    pathname?.startsWith("/manage/") ||
    pathname?.startsWith("/owner/dashboard") ||
    (firstSegment && !PLATFORM_SEGMENTS.has(firstSegment))
  ) {
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
              <Link href="/explore" className="header-link-text header-link-find">Find a business</Link>
              <Link href="/#pricing" className="header-link-text">Pricing</Link>
              <Link href="/owner" className="header-link-text">Log in</Link>
              <Link href="/owner/signup" className="btn btn-primary header-cta">
                Get started for free
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
              <h4>Company</h4>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/owner">Log in</Link>
            </div>
          </div>
          <div className="footer-bottom">© 2026 AppointEase · support@appointease.io</div>
        </div>
      </footer>
    </>
  );
}
