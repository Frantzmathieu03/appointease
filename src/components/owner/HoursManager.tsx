"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { Availability } from "@/lib/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayState {
  closed: boolean;
  open: string;
  close: string;
}

// Build the editor's days from the saved rows. A business with NO
// saved rows yet starts from the suggested week — Monday to Friday
// 9:00 AM–5:00 PM open, Saturday and Sunday closed — as a starting
// point only: nothing is saved until the owner presses Save hours.
function buildDays(initial: Availability[]): DayState[] {
  const hasRows = initial.length > 0;
  return DAYS.map((_, weekday) => {
    const row = initial.find((a) => a.staff_id === null && a.weekday === weekday);
    if (row) {
      return { closed: false, open: row.open_time.slice(0, 5), close: row.close_time.slice(0, 5) };
    }
    if (!hasRows && weekday >= 1 && weekday <= 5) {
      return { closed: false, open: "09:00", close: "17:00" };
    }
    return { closed: true, open: "09:00", close: "17:00" };
  });
}

/** Business-wide weekly hours (staff-specific hours are a later layer). */
export default function HoursManager({
  businessId,
  initial,
}: {
  businessId: string;
  initial: Availability[];
}) {
  const router = useRouter();
  const [days, setDays] = useState<DayState[]>(() => buildDays(initial));
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDays(buildDays(initial));
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
    // Refresh the page so anything that depends on the saved hours
    // (the setup checklist, the publish button) sees them right away.
    router.refresh();
  }

  return (
    <div>
      {initial.length === 0 && (
        <p className="small" style={{ marginTop: 0 }}>
          We filled in a common week to start you off — change anything you
          like, then press Save hours.
        </p>
      )}
      {DAYS.map((name, weekday) => (
        <div
          key={name}
          style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}
        >
          <span style={{ width: 96, fontWeight: 600, fontSize: 14 }}>{name}</span>
          <div style={{ display: "flex", gap: 6 }} role="group" aria-label={`${name}: open or closed`}>
            <button
              type="button"
              className={days[weekday].closed ? "btn" : "btn btn-primary"}
              style={{ padding: "4px 14px", fontSize: 13 }}
              onClick={() => setDay(weekday, { closed: false })}
            >
              Open
            </button>
            <button
              type="button"
              className={days[weekday].closed ? "btn btn-primary" : "btn"}
              style={{ padding: "4px 14px", fontSize: 13 }}
              onClick={() => setDay(weekday, { closed: true })}
            >
              Closed
            </button>
          </div>
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
