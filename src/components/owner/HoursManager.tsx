"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { Availability } from "@/lib/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayState {
  closed: boolean;
  open: string;
  close: string;
}

/** Business-wide weekly hours (staff-specific hours are a later layer). */
export default function HoursManager({
  businessId,
  initial,
}: {
  businessId: string;
  initial: Availability[];
}) {
  const [days, setDays] = useState<DayState[]>(() =>
    DAYS.map((_, weekday) => {
      const row = initial.find((a) => a.staff_id === null && a.weekday === weekday);
      return row
        ? { closed: false, open: row.open_time.slice(0, 5), close: row.close_time.slice(0, 5) }
        : { closed: true, open: "09:00", close: "17:00" };
    })
  );
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDays(
      DAYS.map((_, weekday) => {
        const row = initial.find((a) => a.staff_id === null && a.weekday === weekday);
        return row
          ? { closed: false, open: row.open_time.slice(0, 5), close: row.close_time.slice(0, 5) }
          : { closed: true, open: "09:00", close: "17:00" };
      })
    );
  }, [initial]);

  const setDay = (weekday: number, patch: Partial<DayState>) => {
    setDays(days.map((d, i) => (i === weekday ? { ...d, ...patch } : d)));
    setSaved(false);
  };

  async function save() {
    setBusy(true);
    const supabase = createBrowserSupabase();
    await supabase
      .from("availability")
      .delete()
      .eq("business_id", businessId)
      .is("staff_id", null);
    const rows = days
      .map((d, weekday) => ({ d, weekday }))
      .filter(({ d }) => !d.closed && d.close > d.open)
      .map(({ d, weekday }) => ({
        business_id: businessId,
        staff_id: null,
        weekday,
        open_time: d.open,
        close_time: d.close,
      }));
    if (rows.length > 0) await supabase.from("availability").insert(rows);
    setBusy(false);
    setSaved(true);
  }

  return (
    <div>
      {DAYS.map((name, weekday) => (
        <div
          key={name}
          style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}
        >
          <span style={{ width: 96, fontWeight: 600, fontSize: 14 }}>{name}</span>
          <label className="small" style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={days[weekday].closed}
              onChange={(e) => setDay(weekday, { closed: e.target.checked })}
              style={{ width: "auto" }}
            />
            Closed
          </label>
          {!days[weekday].closed && (
            <>
              <input
                type="time"
                value={days[weekday].open}
                onChange={(e) => setDay(weekday, { open: e.target.value })}
                style={{ width: 128 }}
              />
              <span className="small">to</span>
              <input
                type="time"
                value={days[weekday].close}
                onChange={(e) => setDay(weekday, { close: e.target.value })}
                style={{ width: 128 }}
              />
            </>
          )}
        </div>
      ))}
      <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={save} disabled={busy}>
        {busy ? "Saving…" : saved ? "Saved ✓" : "Save hours"}
      </button>
    </div>
  );
}
