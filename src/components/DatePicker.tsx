"use client";

import { useMemo, useState } from "react";
import { weekdayOf } from "@/lib/slots";

// Month-grid date picker over a fixed list of bookable dates
// (yyyy-mm-dd strings in the business's timezone). Month arrows jump
// a whole month at a time, so a date ~60 days out is two taps away —
// no endless sideways scrolling through a strip of day buttons.
// Only the days in `dates` are enabled; slots are still computed per
// selected day by the caller, never precomputed for the whole window.
export default function DatePicker({
  dates,
  value,
  onChange,
  timeZone,
}: {
  dates: string[];
  value: string;
  onChange: (date: string) => void;
  timeZone: string;
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
        {cells.map((ds, i) =>
          ds === null ? (
            <span key={`blank-${i}`} />
          ) : (
            <button
              type="button"
              key={ds}
              className={ds === value ? "cal-day selected" : "cal-day"}
              disabled={!allowed.has(ds)}
              onClick={() => onChange(ds)}
            >
              {Number(ds.slice(8))}
            </button>
          )
        )}
      </div>
    </div>
  );
}
