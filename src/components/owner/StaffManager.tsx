"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { StaffMember } from "@/lib/types";

/**
 * Team members = calendars. Plan size is measured here:
 * Solo 1 · Team up to 5 · Business up to 15.
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

  async function remove(id: string) {
    const supabase = createBrowserSupabase();
    await supabase.from("staff").update({ active: false }).eq("id", id);
    load();
  }

  return (
    <div>
      {staff.length === 0 && (
        <p className="small">No team members yet. Add the people customers can book with — for a solo shop, that&apos;s you.</p>
      )}
      {staff.map((m) => (
        <div key={m.id} className="service-row">
          <div className="service-name">{m.name}</div>
          <button className="btn" style={{ padding: "7px 13px" }} onClick={() => remove(m.id)}>
            Remove
          </button>
        </div>
      ))}
      <form onSubmit={add} style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team member name" required />
        <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
          Add
        </button>
      </form>
      <p className="small" style={{ marginTop: 10 }}>
        {staff.length} active — Solo includes 1, Team up to 5, Business up to 15.
      </p>
    </div>
  );
}
