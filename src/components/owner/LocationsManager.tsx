"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { Location } from "@/lib/types";
import { formatPhone } from "@/lib/types";

// Settings → Locations. A business can have more than one branch.
// Locations are optional: with none added, the booking page just shows
// the main address from Business details, exactly as before. Defensive
// about migration 0013: until it lands, this card says so in plain
// words instead of breaking Settings.
export default function LocationsManager({ businessId }: { businessId: string }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [ready, setReady] = useState<boolean | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });
  const [editing, setEditing] = useState<Location | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });
    if (error) {
      setReady(false);
      return;
    }
    setReady(true);
    setLocations((data ?? []) as Location[]);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  if (ready === false) {
    return (
      <p className="small" style={{ margin: 0 }}>
        Locations aren&apos;t ready yet. Please check back soon. Your main
        address in Business details above is the one customers see.
      </p>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const supabase = createBrowserSupabase();
    const row = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("locations").update(row).eq("id", editing.id)
      : await supabase.from("locations").insert({ business_id: businessId, ...row });
    setBusy(false);
    if (error) {
      setMsg("That didn't save. Please try again.");
      return;
    }
    setForm({ name: "", address: "", phone: "" });
    setEditing(null);
    setMsg(editing ? "Location updated." : "Location added.");
    load();
  }

  async function remove(loc: Location) {
    const ok = window.confirm(
      `Remove ${loc.name}? Appointments already booked there stay on the calendar. They just won't show a location anymore.`
    );
    if (!ok) return;
    const supabase = createBrowserSupabase();
    await supabase.from("locations").delete().eq("id", loc.id);
    if (editing?.id === loc.id) {
      setEditing(null);
      setForm({ name: "", address: "", phone: "" });
    }
    load();
  }

  function startEdit(loc: Location) {
    setEditing(loc);
    setForm({ name: loc.name, address: loc.address ?? "", phone: loc.phone ?? "" });
    setMsg("");
  }

  return (
    <div>
      <p className="small" style={{ marginTop: 0 }}>
        Got more than one branch? Add each one here. With no locations
        added, customers just see your main address. Nothing to do.
      </p>
      {msg && <p className="small" style={{ margin: "0 0 10px" }}>{msg}</p>}
      {locations.map((loc) => (
        <div key={loc.id} className="service-row">
          <div>
            <div className="service-name">{loc.name}</div>
            <div className="service-meta">
              {[loc.address, loc.phone ? formatPhone(loc.phone) : null].filter(Boolean).join(" · ") || "No address yet"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" style={{ padding: "7px 13px" }} onClick={() => startEdit(loc)}>
              Edit
            </button>
            <button className="btn" style={{ padding: "7px 13px" }} onClick={() => remove(loc)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <form onSubmit={save} style={{ marginTop: 14 }}>
        <label className="field">
          <span>Location name</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Downtown office"
          />
        </label>
        <label className="field">
          <span>Address</span>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="25 Main St, Boston, MA"
          />
        </label>
        <label className="field">
          <span>Phone (optional)</span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" type="submit" disabled={busy || !form.name.trim()}>
            {busy ? "Saving…" : editing ? "Save location" : "Add a location"}
          </button>
          {editing && (
            <button
              className="btn"
              type="button"
              onClick={() => {
                setEditing(null);
                setForm({ name: "", address: "", phone: "" });
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
