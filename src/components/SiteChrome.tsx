"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UnreadBadge from "@/components/UnreadBadge";

/**
 * The AppointEase marketing header/footer. Some pages carry their
 * own shell, so the chrome renders nothing there:
 *   - customer-facing manage pages (/manage/<token> — the
 *     cancel/reschedule links from reminders, PDF §5);
 *   - public business pages (/<slug>, /<slug>/book, /<slug>/message —
 *     white label, Frantz 2026-11-25): the [slug] layout carries the
 *     business's own slim header and a small "Powered by AppointEase"
 *     line at the bottom;
 *   - the owner workspace (/owner/* — sign-in, signup, setup and the
 *     dashboard, Frantz 2026-11-25): the dashboard has its own top
 *     bar, and a signed-in owner must never see the "Create booking
 *     page" sales button stacked above it.
 * A first path segment that is not a known platform route is treated
 * as a business slug. The platform header (with "Create booking
 * page") stays on the platform's own public pages: homepage,
 * /explore, pricing and the legal pages.
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
    pathname?.startsWith("/owner/") ||
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
