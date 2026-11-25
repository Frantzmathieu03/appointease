"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { NextStep } from "@/lib/types";

/**
 * Next-step checklist from visit notes (PDF §7). Ticking an item records
 * who did it and when (next_steps.done_by / done_at).
 */
export default function NextStepsList({
  steps,
  actorId,
  tz,
}: {
  steps: NextStep[];
  actorId: string;
  tz: string;
}) {
  const [items, setItems] = useState(steps);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(step: NextStep) {
    setBusyId(step.id);
    const supabase = createBrowserSupabase();
    const done = !step.done_at;
    const patch = done
      ? { done_at: new Date().toISOString(), done_by: actorId }
      : { done_at: null, done_by: null };
    const { error } = await supabase.from("next_steps").update(patch).eq("id", step.id);
    if (!error) {
      setItems((prev) => prev.map((s) => (s.id === step.id ? { ...s, ...patch } : s)));
    }
    setBusyId(null);
  }

  if (items.length === 0) return null;

  const fmtDay = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(
      new Date(iso)
    );

  return (
    <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>
      {items.map((s) => (
        <li key={s.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={!!s.done_at}
            disabled={busyId === s.id}
            onChange={() => toggle(s)}
            style={{ marginTop: 3 }}
          />
          <span className="small" style={{ textDecoration: s.done_at ? "line-through" : "none" }}>
            {s.text}
            {s.owner === "client" ? " · (customer)" : " · (team)"}
            {s.due_date ? ` · due ${s.due_date}` : ""}
            {s.done_at ? ` · done ${fmtDay(s.done_at)}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
