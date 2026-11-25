"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface InboxThreadSummary {
  customerId: string;
  name: string;
  lastBody: string;
  lastAt: string;
  lastSender: string;
  unread: number;
  assignedStaffId: string | null;
  staffInitials: string | null;
}

type Filter = "all" | "unread" | "mine" | "unassigned";

/**
 * Conversation list for the two-column inbox (PDF §4): search + filters
 * All / Unread / Mine / Unassigned. "Mine" appears only when the
 * signed-in login is linked to a staff calendar (migration 0011).
 */
export default function InboxList({
  threads,
  selectedCustomerId,
  myStaffId,
}: {
  threads: InboxThreadSummary[];
  selectedCustomerId?: string;
  myStaffId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q)) return false;
      if (filter === "unread") return t.unread > 0;
      if (filter === "mine") return myStaffId !== null && t.assignedStaffId === myStaffId;
      if (filter === "unassigned") return !t.assignedStaffId;
      return true;
    });
  }, [threads, query, filter, myStaffId]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    ...(myStaffId ? [{ id: "mine" as Filter, label: "Mine" }] : []),
    { id: "unassigned", label: "Unassigned" },
  ];

  return (
    <div className="inbox-list">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search conversations"
        aria-label="Search conversations"
      />
      <div className="inbox-filters" role="tablist" aria-label="Filter conversations">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={filter === f.id ? "active" : ""}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="small">No conversations match. When a customer messages you, it lands here.</p>
      )}
      {visible.map((t) => (
        <Link
          key={t.customerId}
          href={`/owner/dashboard/inbox/${t.customerId}`}
          className={t.customerId === selectedCustomerId ? "inbox-item active" : "inbox-item"}
        >
          <div style={{ minWidth: 0 }}>
            <span className="who">
              {t.name}
              {t.unread > 0 && <span className="badge">{t.unread}</span>}
              {t.staffInitials && <span className="inbox-initials" title="Assigned staff">{t.staffInitials}</span>}
            </span>
            <span
              className="small"
              style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 210 }}
            >
              {t.lastSender === "business" ? "You: " : ""}
              {t.lastBody}
            </span>
          </div>
          <span className="small" style={{ flex: "0 0 auto" }}>
            {new Date(t.lastAt).toLocaleDateString([], { month: "short", day: "numeric" })}
          </span>
        </Link>
      ))}
    </div>
  );
}
