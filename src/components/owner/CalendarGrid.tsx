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
}

const CELL_H = 28; // px per 30-minute row (matches .cal-cell height)

/**
 * Time grid (PDF §4): rows are the business's opening hours, columns
 * are days (Week view) or staff members (Day view). Clicking an empty
 * slot opens the New Appointment flow pre-filled with that date/time/
 * staff; clicking a block opens the appointment. Blocks are colored by
 * status: confirmed green, cancelled grey, completed blue-grey,
 * no-show red.
 */
export default function CalendarGrid({
  columns,
  appointments,
  rangeStart,
  rangeEnd,
  timezone,
  mode,
}: {
  columns: CalColumn[];
  appointments: CalAppt[];
  rangeStart: number; // minutes from midnight
  rangeEnd: number;
  timezone: string;
  /** day: columns are staff for one date. week: columns are dates. */
  mode: "day" | "week";
}) {
  const rows: number[] = [];
  for (let m = rangeStart; m < rangeEnd; m += 30) rows.push(m);
  const height = rows.length * CELL_H;

  const hhmm = (mins: number) =>
    `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

  return (
    <div className="cal-time-grid">
      {columns.map((col) => {
        const blocks = appointments.filter((a) =>
          mode === "week"
            ? a.dateStr === col.dateStr
            : a.dateStr === col.dateStr &&
              (a.staffId === col.staffId || (col.staffId === null && a.staffId === null))
        );
        return (
          <div key={col.key} className="cal-col">
            <div className="cal-col-head">{col.label}</div>
            <div className="cal-col-body" style={{ height }}>
              {rows.map((m) => {
                const instant = zonedTimeToUtc(col.dateStr, hhmm(m), timezone);
                const href =
                  `/owner/dashboard/calendar/new?date=${col.dateStr}` +
                  `&time=${encodeURIComponent(formatTimeInZone(instant, timezone))}` +
                  (col.staffId ? `&staffId=${col.staffId}` : "");
                return (
                  <Link key={m} href={href} className="cal-cell" aria-label={`Book ${col.label} at ${formatTimeInZone(instant, timezone)}`}>
                    <span className="cal-cell-time">
                      {m % 60 === 0 ? formatTimeInZone(instant, timezone) : ""}
                    </span>
                  </Link>
                );
              })}
              {blocks.map((a) => {
                const top = Math.max(0, ((a.startMinutes - rangeStart) / 30) * CELL_H);
                const h = Math.max(24, (a.durationMinutes / 30) * CELL_H - 3);
                return (
                  <Link
                    key={a.id}
                    href={`/owner/dashboard/appointments/${a.id}`}
                    className={`cal-block cal-block-${a.status}`}
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
