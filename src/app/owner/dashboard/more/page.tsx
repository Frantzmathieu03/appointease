import Link from "next/link";
import { requireBusiness, siteUrl } from "@/lib/owner";

// The mobile tab bar's "More" page (Frantz 2026-11-25): on phones the
// sidebar no longer stacks above the content, so everything it carried
// lives here instead — every remaining dashboard section, the booking
// page link, the finish-setup line while the business is unpublished,
// and Sign out. Same staff-role hiding as the sidebar; a staff login
// keeps Team because the tab bar's More used to land there.
export default async function DashboardMorePage() {
  const { business, role } = await requireBusiness();
  const link = `${siteUrl()}/${business.slug}`;
  const isStaff = role === "staff";

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>More</h1>
      <p className="lede">
        {business.name} · {link.replace(/^https?:\/\//, "")}
        {!business.published && (
          <>
            {" "}· <span className="chip chip-grey">Not published yet</span>
          </>
        )}
      </p>

      <div className="card">
        <nav className="more-list">
          <Link href={`/${business.slug}`}>View booking page</Link>
          {!business.published && role === "owner" && (
            <Link href="/owner/setup">Finish setup — publish your page</Link>
          )}
          {!isStaff && <Link href="/owner/dashboard/booking-page">Booking page</Link>}
          {!isStaff && <Link href="/owner/dashboard/forms">Forms</Link>}
          {!isStaff && <Link href="/owner/dashboard/settings#services">Services</Link>}
          <Link href="/owner/dashboard/team">Team</Link>
          {!isStaff && <Link href="/owner/dashboard/reports">Reports</Link>}
          {!isStaff && <Link href="/owner/dashboard/billing">Billing</Link>}
          {!isStaff && <Link href="/owner/dashboard/settings">Settings</Link>}
        </nav>
        <form action="/auth/signout" method="post" style={{ marginTop: 16 }}>
          <button className="btn" type="submit">Sign out</button>
        </form>
      </div>
    </div>
  );
}
