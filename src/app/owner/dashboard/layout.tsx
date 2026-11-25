import Link from "next/link";
import { requireBusiness, siteUrl } from "@/lib/owner";
import UnreadBadge from "@/components/UnreadBadge";

// Owner workspace shell (design-demo layout): business name + section
// nav in a left sidebar, page content on the right. On narrow screens
// the sidebar collapses to a horizontal row of links above the content.
// Services lives in Settings; Team has its own page.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { business } = await requireBusiness();
  const link = `${siteUrl()}/${business.slug}`;

  return (
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
          <Link href="/owner/dashboard/settings#services">Services</Link>
          <Link href="/owner/dashboard/team">Team</Link>
          <Link href="/owner/dashboard/settings">Settings</Link>
        </nav>
        {!business.published && (
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
  );
}
