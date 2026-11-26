"use client";

import { useMemo, useState } from "react";
import { weekdayOf } from "@/lib/slots";

// Month-grid date picker over a fixed list of bookable dates
// (yyyy-mm-dd strings in the business's timezone). Month arrows jump
// a whole month at a time, so a date ~60 days out is two taps away —
// no endless sideways scrolling through a strip of day buttons.
// Only the days in `dates` are enabled; slots are still computed per
// selected day by the caller, never precomputed for the whole window.
//
// Customer Side Plan (Frantz, 2026-11-26): callers that know each
// day's state pass `dayStates` — open days render as white boxes with
// a green outline, closed and fully booked days as plain grey numbers
// (never strikethrough, per the plan's pictures), and only open days
// are tappable. `markedDate` outlines one day with a dashed border —
// the reschedule screen marks the appointment's current day that way.
// Without `dayStates` the original behavior stands: days in `dates`
// are enabled, the rest are disabled and faded.
export type DayState = "open" | "closed" | "full";

export default function DatePicker({
  dates,
  value,
  onChange,
  timeZone,
  dayStates,
  markedDate,
}: {
  dates: string[];
  value: string;
  onChange: (date: string) => void;
  timeZone: string;
  dayStates?: Record<string, DayState>;
  markedDate?: string;
}) {
  const allowed = useMemo(() => new Set(dates), [dates]);
  const firstMonth = dates[0]?.slice(0, 7) ?? "";
  const lastMonth = dates[dates.length - 1]?.slice(0, 7) ?? "";
  const [month, setMonth] = useState(() => (value || dates[0] || "").slice(0, 7));

  const [y, m] = month.split("-").map(Number);
  // Pure calendar math on the zone-local year/month: day 0 of the next
  // month is this month's last day.
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const leadBlanks = weekdayOf(`${month}-01`, timeZone);

  const cells: (string | null)[] = [];
  for (let i = 0; i < leadBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${month}-${String(d).padStart(2, "0")}`);
  }

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-15T12:00:00Z`));

  function shift(delta: number) {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    );
  }

  return (
    <div className="cal">
      <div className="cal-head">
        <button
          type="button"
          className="cal-nav"
          aria-label="Previous month"
          disabled={month <= firstMonth}
          onClick={() => shift(-1)}
        >
          ‹
        </button>
        <span className="cal-title">{monthLabel}</span>
        <button
          type="button"
          className="cal-nav"
          aria-label="Next month"
          disabled={month >= lastMonth}
          onClick={() => shift(1)}
        >
          ›
        </button>
      </div>
      <div className="cal-grid cal-week" aria-hidden="true">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((ds, i) => {
          if (ds === null) return <span key={`blank-${i}`} />;
          const state = dayStates?.[ds];
          const disabled = dayStates
            ? state !== "open" && ds !== value
            : !allowed.has(ds);
          const cls = [
            "cal-day",
            ds === value ? "selected" : "",
            dayStates && state === "open" && ds !== value ? "open" : "",
            dayStates && state && state !== "open" ? "closed" : "",
            markedDate && ds === markedDate ? "marked" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              type="button"
              key={ds}
              className={cls}
              disabled={disabled}
              onClick={() => onChange(ds)}
            >
              {Number(ds.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
