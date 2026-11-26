import Link from "next/link";
import { requireBusiness, siteUrl } from "@/lib/owner";
import UnreadBadge from "@/components/UnreadBadge";
import DashNav, { type DashNavItem } from "@/components/DashNav";

// Owner workspace shell, restyled 2026-11-25 (late) to the business
// pages' design language at Frantz's order — the dashboard "has to
// look exactly like" the Mustard Seed business page: pale tint
// background, NO platform header (SiteChrome renders nothing on
// these routes), a simple top row (round business logo + name on
// the left, bell and an Account pill on the right), and the section
// nav as ONE white menu card of full-width rows — business identity
// block on top, a green "Finish setup" pill while unpublished, and
// "View booking page" + "Sign out" as full-width pills at the
// bottom. Desktop keeps the two-column structure with the same card
// as the left sidebar; the mobile bottom tab bar is unchanged.
// Every href, label and role rule is the same as before the
// restyle. Services lives in Settings; Team has its own page.
// Staff logins (migration 0011) don't get Team/Settings nav —
// their RLS view is only their own customers.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { business, role } = await requireBusiness();
  const link = `${siteUrl()}/${business.slug}`;
  const isStaff = role === "staff";

  const navItems: DashNavItem[] = [
    { href: "/owner/dashboard", label: "Today" },
    { href: "/owner/dashboard/calendar", label: "Calendar" },
    { href: "/owner/dashboard/inbox", label: "Inbox", badge: true },
    { href: "/owner/dashboard/customers", label: "Customers" },
    ...(!isStaff
      ? [
          { href: "/owner/dashboard/booking-page", label: "Booking page" },
          { href: "/owner/dashboard/forms", label: "Forms" },
          { href: "/owner/dashboard/settings#services", label: "Services" },
          { href: "/owner/dashboard/team", label: "Team" },
          { href: "/owner/dashboard/reports", label: "Reports" },
          { href: "/owner/dashboard/billing", label: "Billing" },
          { href: "/owner/dashboard/settings", label: "Settings" },
        ]
      : []),
  ];

  return (
    <div className="dash-wrap">
      <div className="dash-toprow">
        <span className="biz-header-brand">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt="" className="biz-header-logo" />
          ) : (
            <span className="biz-header-initial" aria-hidden="true">
              {business.name.trim().charAt(0).toUpperCase() || "?"}
            </span>
          )}
          <span className="biz-header-name">{business.name}</span>
        </span>
        <span className="dash-toprow-actions">
          <Link
            href="/owner/dashboard/inbox"
            className="dash-bell"
            aria-label="Notifications — customer messages"
          >
            🔔
            <UnreadBadge variant="owner" businessId={business.id} />
          </Link>
          <details className="dash-account">
            <summary className="dash-account-pill">Account</summary>
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
          <div className="dash-identity">
            <p className="dash-identity-name">{business.name}</p>
            <p className="small" style={{ margin: 0 }}>
              {link.replace(/^https?:\/\//, "")}
              {!business.published && (
                <>
                  {" "}· <span className="chip chip-grey">Not published yet</span>
                </>
              )}
            </p>
          </div>
          {!business.published && role === "owner" && (
            <div className="dash-finish">
              <Link href="/owner/setup" className="btn btn-primary btn-block">
                Finish setup
              </Link>
              <span className="small">to publish your page.</span>
            </div>
          )}
          <DashNav items={navItems} businessId={business.id} />
          <div className="dash-menu-actions">
            <Link href={`/${business.slug}`} className="btn btn-block">
              View booking page
            </Link>
            <form action="/auth/signout" method="post">
              <button className="btn btn-block" type="submit">
                Sign out
              </button>
            </form>
          </div>
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
        <Link href={isStaff ? "/owner/dashboard/team" : "/owner/dashboard/settings"}>More</Link>
      </nav>
    </div>
  );
}
