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

/**
 * Social accounts for the footer row. Only accounts that exist
 * render here: no dead links and no placeholder icons. Instagram
 * and TikTok get added to this list when those accounts are
 * created (Frantz, 2026-11-27).
 */
const SOCIAL_LINKS: { label: string; href: string; path: string }[] = [
  {
    label: "AppointEase on Facebook",
    href: "https://www.facebook.com/profile.php?id=61596866315937",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    label: "AppointEase on X",
    href: "https://x.com/appointeasee",
    path: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  },
];

export default function SiteChrome({
  children,
  insider = false,
}: {
  children: React.ReactNode;
  /** True when the session user owns a business or is an active
   *  team member (resolved server side in the root layout): the
   *  header then offers "My dashboard" instead of the guest pair. */
  insider?: boolean;
}) {
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
              {insider ? (
                <Link href="/owner/dashboard" className="btn btn-primary header-cta">
                  My dashboard
                </Link>
              ) : (
                <>
                  <Link href="/owner" className="header-link-text">Log in</Link>
                  <Link href="/owner/signup" className="btn btn-primary header-cta">
                    Get started for free
                  </Link>
                </>
              )}
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
          <div className="footer-social">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.href}
                className="footer-social-link"
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
          <div className="footer-bottom">© 2026 AppointEase · support@appointease.io</div>
        </div>
      </footer>
    </>
  );
}
