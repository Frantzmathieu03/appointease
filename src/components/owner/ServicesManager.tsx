"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { formatPrice, visitTypeLabel, type Service } from "@/lib/types";

// Services, kept simple (Frantz, 2026-11-25): the add form asks only
// for a name and how long it takes. Price, the attached form, where it
// happens, and who offers it are NOT shown here anymore — those
// columns and any values already saved stay exactly as they are, and
// booking keeps honoring them; they are just not edited from this
// form. The row line still shows the saved price / where words so the
// owner can see what customers see.
export default function ServicesManager({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({ name: "", duration: "30" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("created_at", { ascending: true });
    setServices((data ?? []) as Service[]);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("services").insert({
      business_id: businessId,
      name: form.name.trim(),
      duration_minutes: Math.max(5, parseInt(form.duration, 10) || 30),
    });
    if (error) {
      console.error("Service add failed", error);
      setMsg("That service couldn't be added. Please try again.");
    }
    setForm({ name: "", duration: "30" });
    setBusy(false);
    load();
    router.refresh();
  }

  async function remove(s: Service) {
    const ok = window.confirm(
      `Remove ${s.name}? It will disappear from your booking page and take no new bookings. Existing appointments for it stay on the calendar and in customer histories.`
    );
    if (!ok) return;
    const supabase = createBrowserSupabase();
    // Soft-remove: appointments keep pointing at the service row.
    await supabase.from("services").update({ active: false }).eq("id", s.id);
    load();
    router.refresh();
  }

  return (
    <div>
      {msg && <p className="small" style={{ margin: "0 0 10px" }}>{msg}</p>}
      {services.length === 0 && <p className="small">No services yet — add your first one below.</p>}
      {services.map((s) => (
        <div key={s.id} className="service-row">
          <div>
            <div className="service-name">{s.name}</div>
            <div className="service-meta">
              {s.duration_minutes} min · {formatPrice(s.price_cents)} · {visitTypeLabel(s.visit_type)}
            </div>
          </div>
          <button className="btn" style={{ padding: "7px 13px" }} onClick={() => remove(s)}>
            Remove
          </button>
        </div>
      ))}
      <form onSubmit={add} style={{ marginTop: 14 }}>
        <label className="field">
          <span>Service name</span>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Classic haircut" />
        </label>
        <label className="field">
          <span>How long does it take? (minutes)</span>
          <input type="number" min={5} step={5} required value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy || !form.name.trim()}>
          Add service
        </button>
      </form>
    </div>
  );
}
