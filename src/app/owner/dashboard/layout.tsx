import Link from "next/link";
import { requireBusiness, siteUrl } from "@/lib/owner";
import UnreadBadge from "@/components/UnreadBadge";
import NativeBridge from "@/components/NativeBridge";
import DashNav, { type DashNavItem } from "@/components/DashNav";

// Owner workspace shell — Owner Dashboard Plan (Frantz, 2026-11-26):
// a white top bar across the full width (round logo + business name
// on the left; View booking page, a bell with a red dot when there
// are unread messages, and the signed-in person's initials on the
// right), a 220px white side menu (items 40px tall, the open section
// on #E4EEE7 + bold, Sign out small at the bottom), and the content
// on #F3F6F1, max 1180px, in Inter. Phones keep the bottom tab bar.
// Role rules (migration 0011): staff logins see only their own
// sections; managers see everything except Billing and Team
// management (the Team page itself is read-only for them).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { business, role, user, memberStaffId } = await requireBusiness();
  const link = `${siteUrl()}/${business.slug}`;
  const isStaff = role === "staff";
  const isOwner = role === "owner";

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    "";
  const initialsSource = fullName.trim() || user.email || "?";
  const parts = initialsSource.replace(/@.*$/, "").split(/[\s._-]+/).filter(Boolean);
  const initials = (
    (parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")
  ).toUpperCase();

  const navItems: DashNavItem[] = [
    { href: "/owner/dashboard", label: "Today" },
    { href: "/owner/dashboard/appointments", label: "Appointments", badge: "appointments" },
    { href: "/owner/dashboard/calendar", label: "Calendar" },
    { href: "/owner/dashboard/inbox", label: "Inbox", badge: "inbox" },
    { href: "/owner/dashboard/customers", label: "Customers" },
    ...(!isStaff
      ? [
          { href: "/owner/dashboard/settings#services", label: "Services" },
          { href: "/owner/dashboard/team", label: "Team" },
          { href: "/owner/dashboard/forms", label: "Forms" },
          { href: "/owner/dashboard/booking-page", label: "Booking page" },
          { href: "/owner/dashboard/settings#locations", label: "Locations" },
          { href: "/owner/dashboard/reports", label: "Reports" },
          { href: "/owner/dashboard/settings", label: "Settings" },
          ...(isOwner ? [{ href: "/owner/dashboard/billing", label: "Billing" }] : []),
        ]
      : []),
  ];

  return (
    <div className="dash2">
      {/* Native app bridge with this business as context — inert on web. */}
      <NativeBridge businessId={business.id} />
      {/* Inter (plan spec: 400/600/700), scoped to the dashboard. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap"
        rel="stylesheet"
      />
      <header className="d2-topbar">
        <div className="d2-topbar-in">
          <span className="d2-brand">
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt="" />
            ) : (
              <span className="d2-brand-initial" aria-hidden="true">
                {business.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
            )}
            <span className="d2-brand-name">{business.name}</span>
          </span>
          <span className="d2-top-actions">
            <Link href={`/${business.slug}`} className="d2-view-link">
              View booking page
            </Link>
            <Link
              href="/owner/dashboard/inbox"
              className="d2-bell"
              aria-label="Notifications — customer messages"
            >
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <UnreadBadge variant="owner" businessId={business.id} />
            </Link>
            <span className="d2-avatar" title={user.email ?? undefined} aria-label="Your account">
              {initials}
            </span>
          </span>
        </div>
      </header>

      <div className="d2-shell">
        <aside className="d2-side">
          <DashNav items={navItems} businessId={business.id} memberStaffId={memberStaffId} />
          <div className="d2-signout">
            <form action="/auth/signout" method="post">
              <button type="submit">Sign out</button>
            </form>
          </div>
        </aside>
        <main className="d2-main">
          <div className="d2-main-in">
            {!business.published && isOwner && (
              <div className="d2-setupbar">
                <span>
                  Your booking page isn&apos;t published yet — {link.replace(/^https?:\/\//, "")}{" "}
                  is not live for customers.
                </span>
                <Link href="/owner/setup" style={{ fontWeight: 700 }}>
                  Finish setup
                </Link>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      <nav className="dash-tabbar" aria-label="Dashboard">
        <Link href="/owner/dashboard">Today</Link>
        <Link href="/owner/dashboard/calendar">Calendar</Link>
        <Link href="/owner/dashboard/inbox">
          Inbox
          <UnreadBadge variant="owner" businessId={business.id} />
        </Link>
        <Link href="/owner/dashboard/customers">Customers</Link>
        <Link href={isStaff ? "/owner/dashboard/team" : "/owner/dashboard/settings"}>More</Link>
      </nav>
    </div>
  );
}
