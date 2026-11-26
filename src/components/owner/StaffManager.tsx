"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { StaffMember } from "@/lib/types";

/**
 * Bookable staff calendars. Plan team-size bands live in
 * src/lib/plans.ts (Solo up to 4 team members · Team up to 9 ·
 * Business 10+, updated 2026-11-26).
 */
export default function StaffManager({ businessId }: { businessId: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data } = await supabase
      .from("staff")
      .select("*")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("created_at", { ascending: true });
    setStaff((data ?? []) as StaffMember[]);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createBrowserSupabase();
    await supabase.from("staff").insert({ business_id: businessId, name: name.trim() });
    setName("");
    setBusy(false);
    load();
  }

  async function remove(m: StaffMember) {
    const ok = window.confirm(
      `Remove ${m.name} from bookable staff? They'll disappear from your booking page and take no new bookings. Their existing appointments and history stay as they are.`
    );
    if (!ok) return;
    const supabase = createBrowserSupabase();
    await supabase.from("staff").update({ active: false }).eq("id", m.id);
    load();
  }

  return (
    <div>
      {staff.length === 0 && (
        <p className="small">No team members yet. Add the people customers can book with — for a solo shop, that&apos;s you.</p>
      )}
      {staff.map((m) => (
        <div key={m.id} className="service-row">
          <div>
            <div className="service-name">{m.name}</div>
            <div className="service-meta">Bookable staff</div>
          </div>
          <button className="btn" style={{ padding: "7px 13px" }} onClick={() => remove(m)}>
            Remove
          </button>
        </div>
      ))}
      <form onSubmit={add} style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Staff name" required aria-label="Staff name" />
        <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
          Add staff member
        </button>
      </form>
      <p className="small" style={{ marginTop: 10 }}>
        {staff.length} active — Solo includes up to 4 team members, Team up to 9, Business 10+.
      </p>
    </div>
  );
}
