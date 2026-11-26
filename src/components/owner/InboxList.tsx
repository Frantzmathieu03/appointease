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
  assignedName: string | null;
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
      if (q && !`${t.name} ${t.lastBody}`.toLowerCase().includes(q)) return false;
      if (filter === "unread") return t.unread > 0;
      if (filter === "mine") return myStaffId !== null && t.assignedStaffId === myStaffId;
      if (filter === "unassigned") return !t.assignedStaffId;
      return true;
    });
  }, [threads, query, filter, myStaffId]);

  const unreadCount = threads.filter((t) => t.unread > 0).length;
  const unassignedCount = threads.filter((t) => !t.assignedStaffId).length;
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: `Unread ${unreadCount}` },
    ...(myStaffId ? [{ id: "mine" as Filter, label: "Mine" }] : []),
    { id: "unassigned", label: `Unassigned ${unassignedCount}` },
  ];

  const whenLabel = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
    if (sameDay)
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (yesterday) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };
  const initialsOf = (name: string) => {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] ?? "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
  };

  return (
    <div className="inbox-list">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Name or message"
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
          <span className="inbox-initials" aria-hidden="true">
            {initialsOf(t.name)}
          </span>
          <span style={{ flex: "1 1 auto", minWidth: 0 }}>
            <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontWeight: 700, fontSize: 14.5 }}>{t.name}</span>
              <span className="small" style={{ flex: "0 0 auto", display: "inline-flex", gap: 6, alignItems: "center" }}>
                {t.unread > 0 && <span className="d2-unread-dot" aria-label={`${t.unread} unread`} />}
                {whenLabel(t.lastAt)}
              </span>
            </span>
            <span
              className="small"
              style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {t.lastSender === "business" ? "You: " : ""}
              {t.lastBody}
            </span>
            <span className="small" style={{ display: "block", fontSize: 12.5 }}>
              {t.assignedName ?? <span className="d2-notassigned">Unassigned</span>}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
