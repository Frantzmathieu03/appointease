import Link from "next/link";
import { requireBusiness, siteUrl } from "@/lib/owner";
import UnreadBadge from "@/components/UnreadBadge";

// Bell icon in the same line-icon style as the business pages' Visit
// us card (Frantz 2026-11-25): single color via currentColor, no emoji.
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

// Owner workspace shell (design-demo layout): business name + section
// nav in a left sidebar, page content on the right, a slim top bar above
// both (business name, View booking page, notifications bell, account
// menu — PDF §2), and a bottom tab bar on mobile. On mobile the sidebar
// does not stack above the content (Frantz 2026-11-25): the tab bar's
// "More" opens /owner/dashboard/more with every remaining section.
// Services lives in Settings; Team has its own page. Staff logins
// (migration 0011) don't get Team/Settings nav — their RLS view is only
// their own customers.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { business, role } = await requireBusiness();
  const link = `${siteUrl()}/${business.slug}`;
  const isStaff = role === "staff";

  return (
    <div className="dash-wrap">
      <div className="dash-topbar">
        <span className="dash-topbar-name">{business.name}</span>
        <span className="dash-topbar-actions">
          <Link href={`/${business.slug}`} className="dash-topbar-link dash-topbar-view">
            View booking page
          </Link>
          <Link
            href="/owner/dashboard/inbox"
            className="dash-topbar-link dash-topbar-bell"
            aria-label="Notifications — customer messages"
          >
            <BellIcon />
            <UnreadBadge variant="owner" businessId={business.id} />
          </Link>
          <details className="dash-account">
            <summary className="dash-topbar-link">Account</summary>
            <div className="dash-account-menu">
              <Link href="/owner/dashboard/settings#profile">Profile</Link>
              <Link href="/owner/dashboard/billing">Billing</Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="dash-account-signout">
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </span>
      </div>

      <div className="dash-shell">
        <aside className="dash-sidebar">
          <p className="eyebrow" style={{ marginBottom: 2 }}>{business.name}</p>
          <p className="small" style={{ margin: 0 }}>
            {link.replace(/^https?:\/\//, "")}
            {!business.published && (
              <>
                {" "}· <span className="chip chip-grey">Not published yet</span>
              </>
            )}
          </p>
          <nav className="dash-nav">
            <Link href="/owner/dashboard">Today</Link>
            <Link href="/owner/dashboard/calendar">Calendar</Link>
            <Link href="/owner/dashboard/inbox">
              Inbox
              <UnreadBadge variant="owner" businessId={business.id} />
            </Link>
            <Link href="/owner/dashboard/customers">Customers</Link>
            {!isStaff && <Link href="/owner/dashboard/booking-page">Booking page</Link>}
            {!isStaff && <Link href="/owner/dashboard/forms">Forms</Link>}
            {!isStaff && <Link href="/owner/dashboard/settings#services">Services</Link>}
            {!isStaff && <Link href="/owner/dashboard/team">Team</Link>}
            {!isStaff && <Link href="/owner/dashboard/reports">Reports</Link>}
            {!isStaff && <Link href="/owner/dashboard/billing">Billing</Link>}
            {!isStaff && <Link href="/owner/dashboard/settings">Settings</Link>}
          </nav>
          {!business.published && role === "owner" && (
            <p className="small" style={{ marginTop: 12 }}>
              <Link href="/owner/setup">Finish setup</Link> to publish your page.
            </p>
          )}
          <form action="/auth/signout" method="post" style={{ marginTop: 16 }}>
            <button className="btn" type="submit">Sign out</button>
          </form>
        </aside>
        <main className="dash-main">{children}</main>
      </div>

      <nav className="dash-tabbar" aria-label="Dashboard">
        <Link href="/owner/dashboard">Today</Link>
        <Link href="/owner/dashboard/calendar">Calendar</Link>
        <Link href="/owner/dashboard/inbox">
          Inbox
          <UnreadBadge variant="owner" businessId={business.id} />
        </Link>
        <Link href="/owner/dashboard/customers">Customers</Link>
        <Link href="/owner/dashboard/more">More</Link>
      </nav>
    </div>
  );
}
