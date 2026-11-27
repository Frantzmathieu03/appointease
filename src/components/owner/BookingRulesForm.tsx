"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";

// Owner "Booking rules" (Customer Side Plan, Frantz 2026-11-26):
// the business's own cancellation words: labeled "Late-cancellation
// note" in plain words: plus the reschedule cut-off and the free
// cancellation window in hours. All three live on the business row
// (migration 0016). The note is words only: the business collects
// any fee itself; AppointEase never charges its clients. Before the
// migration lands the save reports that honestly instead of failing
// silently, and the customer screens run on the defaults (no note,
// 12 / 24 hours).
export default function BookingRulesForm({
  businessId,
  initialNote,
  initialCutoff,
  initialWindow,
}: {
  businessId: string;
  initialNote: string;
  initialCutoff: number;
  initialWindow: number;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [cutoff, setCutoff] = useState(String(initialCutoff));
  const [windowHours, setWindowHours] = useState(String(initialWindow));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "pending" | "error">("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    const supabase = createBrowserSupabase();
    const cutoffNum = Math.max(0, Math.floor(Number(cutoff) || 0));
    const windowNum = Math.max(0, Math.floor(Number(windowHours) || 0));
    const { error } = await supabase
      .from("businesses")
      .update({
        cancellation_policy: note.trim() ? note.trim() : null,
        reschedule_cutoff_hours: cutoffNum,
        cancel_window_hours: windowNum,
      })
      .eq("id", businessId);
    if (error) {
      // The columns arrive with the next database update: until
      // then nothing was saved and the defaults apply.
      setState("pending");
      return;
    }
    setState("saved");
    router.refresh();
  }

  return (
    <form onSubmit={save}>
      <label className="field">
        <span>Late cancellation note</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ minHeight: 64 }}
          placeholder="Please cancel at least 24 hours ahead. A late cancellation is $25, paid at the office."
        />
      </label>
      <p className="small" style={{ marginTop: -6, marginBottom: 14 }}>
        Shown to customers when they cancel, and on the booking review.
        Leave it blank to use the friendly standard note. You collect any
        fee yourself. AppointEase never charges your clients.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label className="field" style={{ flex: "1 1 180px" }}>
          <span>Reschedule cut-off (hours before)</span>
          <input
            type="number"
            min={0}
            max={168}
            value={cutoff}
            onChange={(e) => setCutoff(e.target.value)}
          />
        </label>
        <label className="field" style={{ flex: "1 1 180px" }}>
          <span>Free cancellation window (hours before)</span>
          <input
            type="number"
            min={0}
            max={336}
            value={windowHours}
            onChange={(e) => setWindowHours(e.target.value)}
          />
        </label>
      </div>
      <p className="small" style={{ marginTop: -6, marginBottom: 14 }}>
        Inside the reschedule cut-off, customers are asked to call you to
        move an appointment instead of picking a new time online.
      </p>
      <button className="btn btn-primary" type="submit" disabled={state === "saving"}>
        {state === "saving" ? "Saving…" : "Save booking rules"}
      </button>
      {state === "saved" && (
        <span className="small" style={{ marginLeft: 10 }}>Saved.</span>
      )}
      {state === "pending" && (
        <p className="small" style={{ marginTop: 10 }}>
          These settings turn on with the next update. Your customers
          see the standard note and the 12 / 24 hour defaults until then.
        </p>
      )}
      {state === "error" && (
        <p className="small" style={{ marginTop: 10 }}>
          That didn&apos;t save. Please try again.
        </p>
      )}
    </form>
  );
}
