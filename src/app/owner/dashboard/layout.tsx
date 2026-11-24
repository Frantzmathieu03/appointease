import Link from "next/link";
import { requireBusiness, siteUrl } from "@/lib/owner";
import CopyLinkButton from "@/components/CopyLinkButton";
import UnreadBadge from "@/components/UnreadBadge";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { business } = await requireBusiness();
  const link = `${siteUrl()}/${business.slug}`;

  return (
    <main className="column column-wide">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 2 }}>{business.name}</p>
          <p className="small" style={{ margin: 0 }}>
            {link.replace(/^https?:\/\//, "")}
            {!business.published && (
              <>
                {" "}· <span className="chip chip-grey">Not published yet</span>{" "}
                <Link href="/owner/setup">Finish setup</Link>
              </>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <CopyLinkButton url={link} />
          <form action="/auth/signout" method="post">
            <button className="btn" type="submit">Sign out</button>
          </form>
        </div>
      </div>

      <nav className="tabs">
        <Link href="/owner/dashboard">Today</Link>
        <Link href="/owner/dashboard/calendar">Calendar</Link>
        <Link href="/owner/dashboard/customers">Customers</Link>
        <Link href="/owner/dashboard/inbox">
          Inbox
          <UnreadBadge variant="owner" businessId={business.id} />
        </Link>
        <Link href="/owner/dashboard/settings">Settings</Link>
      </nav>

      {children}
    </main>
  );
}
