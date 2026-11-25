"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { formatPrice, type Service } from "@/lib/types";

export default function ServicesManager({ businessId }: { businessId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({ name: "", duration: "30", price: "" });
  const [busy, setBusy] = useState(false);

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
    const supabase = createBrowserSupabase();
    const priceTrim = form.price.trim();
    await supabase.from("services").insert({
      business_id: businessId,
      name: form.name.trim(),
      duration_minutes: Math.max(5, parseInt(form.duration, 10) || 30),
      // Blank price = no public price (null) — the customer confirms the
      // price with the business. A typed 0 stays an explicit "Free".
      price_cents: priceTrim === "" ? null : Math.round((parseFloat(priceTrim) || 0) * 100),
    });
    setForm({ name: "", duration: "30", price: "" });
    setBusy(false);
    load();
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
  }

  return (
    <div>
      {services.length === 0 && <p className="small">No services yet — add your first one below.</p>}
      {services.map((s) => (
        <div key={s.id} className="service-row">
          <div>
            <div className="service-name">{s.name}</div>
            <div className="service-meta">{s.duration_minutes} min · {formatPrice(s.price_cents)}</div>
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
        <div style={{ display: "flex", gap: 10 }}>
          <label className="field" style={{ flex: 1 }}>
            <span>Minutes</span>
            <input type="number" min={5} step={5} required value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>Price ($) — optional</span>
            <input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="35" />
          </label>
        </div>
        <p className="small" style={{ margin: "0 0 10px" }}>
          Leave the price blank if customers confirm it with you directly —
          your page will say &ldquo;Price confirmed with the business.&rdquo;
        </p>
        <button className="btn btn-primary" type="submit" disabled={busy || !form.name.trim()}>
          Add service
        </button>
      </form>
    </div>
  );
}
