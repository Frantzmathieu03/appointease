"use client";

import Link from "next/link";
import { formatTimeInZone, zonedTimeToUtc } from "@/lib/slots";

export interface CalColumn {
  key: string;
  label: string;
  dateStr: string; // yyyy-mm-dd in the business zone
  staffId: string | null;
}

export interface CalAppt {
  id: string;
  dateStr: string;
  staffId: string | null;
  startMinutes: number; // minutes from midnight, business zone
  durationMinutes: number;
  title: string;
  sub: string;
  status: string;
  /** Confirmed but the service's form has not been submitted yet. */
  formMissing?: boolean;
}

const CELL_H = 32; // px per 30-minute row → 64px hour rows (plan spec)

/**
 * Time grid (Owner Dashboard Plan, 2026-11-26): hour rows are 64px,
 * columns are staff members (Day view) or the days of one person's
 * week (Week view). Appointment blocks carry a thick colored left
 * edge and a status tint: Completed green, Confirmed blue, Form
 * missing orange. Working hours come from availability: slots
 * outside them are plain light grey and not clickable, and the gaps
 * between two working stretches on the same day (breaks) are
 * striped. Clicking an empty working slot opens the New Appointment
 * flow pre-filled with that date/time/staff; "+ click to book"
 * appears on hover.
 */
export default function CalendarGrid({
  columns,
  appointments,
  rangeStart,
  rangeEnd,
  timezone,
  mode,
  working,
}: {
  columns: CalColumn[];
  appointments: CalAppt[];
  rangeStart: number; // minutes from midnight
  rangeEnd: number;
  timezone: string;
  /** day: columns are staff for one date. week: columns are dates. */
  mode: "day" | "week";
  /** Working intervals (minutes) per column key; empty = no hours set. */
  working: Record<string, [number, number][]>;
}) {
  const rows: number[] = [];
  for (let m = rangeStart; m < rangeEnd; m += 30) rows.push(m);
  const height = rows.length * CELL_H;

  const hhmm = (mins: number) =>
    `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

  const cellState = (intervals: [number, number][], m: number): "work" | "break" | "off" => {
    if (intervals.length === 0) return "work"; // no hours set: old behavior
    for (const [s, e] of intervals) if (m >= s && m < e) return "work";
    const first = intervals[0][0];
    const last = intervals[intervals.length - 1][1];
    if (m >= first && m < last) return "break";
    return "off";
  };

  return (
    <div className="cal-time-grid">
      {columns.map((col) => {
        const blocks = appointments.filter((a) =>
          mode === "week"
            ? a.dateStr === col.dateStr
            : a.dateStr === col.dateStr &&
              (a.staffId === col.staffId || (col.staffId === null && a.staffId === null))
        );
        const intervals = working[col.key] ?? [];
        return (
          <div key={col.key} className="cal-col">
            <div className="cal-col-head">{col.label}</div>
            <div className="cal-col-body" style={{ height }}>
              {rows.map((m) => {
                const state = cellState(intervals, m);
                const instant = zonedTimeToUtc(col.dateStr, hhmm(m), timezone);
                if (state === "off") {
                  return <span key={m} className="cal-cell-off" aria-hidden="true" />;
                }
                if (state === "break") {
                  return (
                    <span key={m} className="cal-cell-break" aria-hidden="true">
                      {m % 60 === 0 ? "Break" : ""}
                    </span>
                  );
                }
                const href =
                  `/owner/dashboard/calendar/new?date=${col.dateStr}` +
                  `&time=${encodeURIComponent(formatTimeInZone(instant, timezone))}` +
                  (col.staffId ? `&staffId=${col.staffId}` : "");
                return (
                  <Link
                    key={m}
                    href={href}
                    className="cal-cell"
                    aria-label={`Book ${col.label} at ${formatTimeInZone(instant, timezone)}`}
                  >
                    {m % 60 === 0 ? (
                      <span className="cal-cell-time">{formatTimeInZone(instant, timezone)}</span>
                    ) : (
                      <span className="cal-book-hint">+ click to book</span>
                    )}
                  </Link>
                );
              })}
              {blocks.map((a) => {
                const top = Math.max(0, ((a.startMinutes - rangeStart) / 30) * CELL_H);
                const h = Math.max(26, (a.durationMinutes / 30) * CELL_H - 3);
                const cls =
                  a.status === "confirmed" && a.formMissing ? "action" : a.status;
                return (
                  <Link
                    key={a.id}
                    href={`/owner/dashboard/appointments/${a.id}`}
                    className={`cal-block cal-block-${cls}`}
                    style={{ top, height: h }}
                  >
                    <strong>{a.title}</strong>
                    {a.sub}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
