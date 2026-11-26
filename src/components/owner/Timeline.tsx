"use client";

import { useState } from "react";
import type { CustomerEvent } from "@/lib/types";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "appointments", label: "Appointments" },
  { key: "messages", label: "Messages" },
  { key: "notes", label: "Notes" },
  { key: "forms", label: "Forms" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const APPOINTMENT_TYPES = new Set(["booked", "rescheduled", "cancelled", "completed", "no_show"]);

function inFilter(e: CustomerEvent, f: FilterKey): boolean {
  if (f === "all") return true;
  if (f === "appointments") return APPOINTMENT_TYPES.has(e.type);
  if (f === "messages") return e.type === "message";
  if (f === "forms") return e.type === "form_submitted";
  return e.type === "note_added";
}

function describe(e: CustomerEvent, fmt: (iso: string) => string): string {
  const d = (e.details ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  switch (e.type) {
    case "registered":
      return "Created an account";
    case "booked":
      return `Booked ${str(d.service_name) ?? "an appointment"}${d.starts_at ? ` — ${fmt(String(d.starts_at))}` : ""}`;
    case "rescheduled":
      return `Rescheduled${d.from ? ` from ${fmt(String(d.from))}` : ""}${d.to ? ` to ${fmt(String(d.to))}` : ""}`;
    case "cancelled":
      return `Cancelled appointment${str(d.reason) ? ` — reason: “${str(d.reason)}”` : ""}`;
    case "completed":
      return "Visit completed";
    case "no_show":
      return "Marked as no-show";
    case "message":
      return d.sender === "business" ? "Message sent by the business" : "Message sent by the customer";
    case "assigned":
      return str(d.to_staff_name)
        ? `Assigned to ${str(d.to_staff_name)}`
        : "Assignment removed (unassigned)";
    case "note_added": {
      const outcome = str(d.outcome);
      return `Visit notes added${outcome ? ` — outcome: ${outcome.replace("_", " ")}` : ""}`;
    }
    case "reminder_sent":
      return "Reminder sent";
    case "form_submitted": {
      const parts: string[] = [];
      if (typeof d.answers === "number") parts.push(`${d.answers} answer${d.answers === 1 ? "" : "s"}`);
      if (typeof d.files === "number" && d.files > 0)
        parts.push(`${d.files} file${d.files === 1 ? "" : "s"}`);
      return `Submitted ${str(d.form_name) ?? "form"}${parts.length ? ` (${parts.join(", ")})` : ""}`;
    }
    case "profile_changed":
      return "Profile updated";
    case "marked_paid": {
      const cents = typeof d.amount_cents === "number" ? d.amount_cents : null;
      const amount =
        cents !== null ? `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}` : "Payment";
      return `${amount} paid at the office — marked by ${str(d.marked_by_name) ?? "the team"}`;
    }
    default:
      return "Event";
  }
}

const ACTOR_LABEL: Record<string, string> = {
  customer: "by customer",
  team_member: "by the team",
  system: "automatic",
};

/** The customer's full history, newest first (PDF §6). Append-only —
 *  there is deliberately no edit or delete anywhere near this list.
 *  Payment filters from the PDF are omitted: AppointEase never handles
 *  client money, so there are no payment events. */
export default function Timeline({ events, tz }: { events: CustomerEvent[]; tz: string }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const shown = events.filter((e) => inFilter(e, filter));

  const fmtDateTime = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? "btn btn-primary" : "btn"}
            style={{ padding: "6px 12px" }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {shown.length === 0 && (
        <p className="small" style={{ margin: 0 }}>
          Nothing here yet — bookings, messages and notes appear automatically as they happen.
        </p>
      )}
      {shown.map((e) => (
        <p key={e.id} className="small" style={{ margin: "0 0 8px" }}>
          <strong>{fmtDateTime(e.created_at)}</strong> — {describe(e, fmtDateTime)}{" "}
          <span style={{ opacity: 0.75 }}>({ACTOR_LABEL[e.actor_type] ?? e.actor_type})</span>
        </p>
      ))}
    </div>
  );
}
