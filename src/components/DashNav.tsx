"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UnreadBadge from "@/components/UnreadBadge";
import NewBookingsBadge from "@/components/NewBookingsBadge";

export interface DashNavItem {
  href: string;
  label: string;
  /** Which live count badge rides on this item, if any. */
  badge?: "inbox" | "appointments";
}

// The dashboard menu card's section rows (business-page design
// language, Frantz 2026-11-25 late): one full-width row per section,
// the section you're on in brand green. Items, order and hrefs are
// decided by the server layout (staff logins see a shorter list);
// this component only renders them and marks the active one.
export default function DashNav({
  items,
  businessId,
  memberStaffId,
}: {
  items: DashNavItem[];
  businessId: string;
  memberStaffId?: string | null;
}) {
  const pathname = usePathname();
  return (
    <nav className="dash-nav">
      {items.map((item) => {
        const base = item.href.split("#")[0];
        const active =
          base === "/owner/dashboard"
            ? pathname === base
            : pathname === base || pathname.startsWith(base + "/");
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={active ? "active" : undefined}
          >
            {item.label}
            {item.badge === "inbox" && <UnreadBadge variant="owner" businessId={businessId} />}
            {item.badge === "appointments" && (
              <NewBookingsBadge businessId={businessId} memberStaffId={memberStaffId} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
