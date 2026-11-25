"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { formatPrice, type IntakeForm, type Service } from "@/lib/types";

export default function ServicesManager({ businessId }: { businessId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [forms, setForms] = useState<IntakeForm[]>([]);
  const [form, setForm] = useState({ name: "", duration: "30", price: "", formId: "" });
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

  // Intake forms (migration 0012) — the attach dropdowns stay hidden
  // until the forms table exists and the business has a form.
  const loadForms = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("forms")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });
    if (!error) setForms((data ?? []) as IntakeForm[]);
  }, [businessId]);

  useEffect(() => {
    load();
    loadForms();
  }, [load, loadForms]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const supabase = createBrowserSupabase();
    const priceTrim = form.price.trim();
    const row: Record<string, unknown> = {
      business_id: businessId,
      name: form.name.trim(),
      duration_minutes: Math.max(5, parseInt(form.duration, 10) || 30),
      // Blank price = no public price (null) — the customer confirms the
      // price with the business. A typed 0 stays an explicit "Free".
      price_cents: priceTrim === "" ? null : Math.round((parseFloat(priceTrim) || 0) * 100),
    };
    if (form.formId) row.form_id = form.formId;
    let { error } = await supabase.from("services").insert(row);
    if (error && form.formId) {
      // form_id arrives with migration 0012 — retry without it.
      delete row.form_id;
      ({ error } = await supabase.from("services").insert(row));
      if (!error) setMsg("Service added. Form attaching turns on with the next database update.");
    }
    setForm({ name: "", duration: "30", price: "", formId: "" });
    setBusy(false);
    load();
  }

  async function attachForm(s: Service, formId: string) {
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("services")
      .update({ form_id: formId || null })
      .eq("id", s.id);
    if (error) {
      setMsg("Form attaching turns on with the next database update.");
      return;
    }
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
      {msg && <p className="small" style={{ margin: "0 0 10px" }}>{msg}</p>}
      {services.length === 0 && <p className="small">No services yet — add your first one below.</p>}
      {services.map((s) => (
        <div key={s.id} className="service-row">
          <div>
            <div className="service-name">{s.name}</div>
            <div className="service-meta">{s.duration_minutes} min · {formatPrice(s.price_cents)}</div>
            {forms.length > 0 && (
              <div className="service-meta" style={{ marginTop: 4 }}>
                Intake form:{" "}
                <select
                  value={s.form_id ?? ""}
                  onChange={(e) => attachForm(s, e.target.value)}
                  aria-label={`Intake form for ${s.name}`}
                >
                  <option value="">None</option>
                  {forms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
        {forms.length > 0 && (
          <label className="field">
            <span>Intake form (optional)</span>
            <select value={form.formId} onChange={(e) => setForm({ ...form, formId: e.target.value })}>
              <option value="">None — no form for this service</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        )}
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
