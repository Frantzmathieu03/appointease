"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { formatServicePrice, visitTypeLabel, type PriceType, type Service } from "@/lib/types";

// Services, kept simple (Frantz, 2026-11-25): the add form asks for a
// name and how long it takes, plus — per his business page plan
// (2026-11-26) — ONE optional price row: how the price shows on the
// public page (no price / exact / starts at / free) and the dollar
// amount when there is one. The attached form, where it happens, and
// who offers it are still NOT edited here — those columns and any
// values already saved stay exactly as they are, and booking keeps
// honoring them. The row line shows the saved price words exactly as
// customers see them.
export default function ServicesManager({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({ name: "", duration: "30" });
  const [priceType, setPriceType] = useState<PriceType>("none");
  const [price, setPrice] = useState("");
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
    // The optional price row (business page plan, 2026-11-26): an
    // exact / starts-at price needs its dollar amount — without one
    // the service simply saves with no price shown.
    const dollars = parseFloat(price);
    const priceCents =
      priceType === "free"
        ? 0
        : (priceType === "exact" || priceType === "from") &&
            Number.isFinite(dollars) &&
            dollars > 0
          ? Math.round(dollars * 100)
          : null;
    const effectiveType: PriceType =
      priceType === "free"
        ? "free"
        : priceCents !== null
          ? priceType
          : "none";
    const base = {
      business_id: businessId,
      name: form.name.trim(),
      duration_minutes: Math.max(5, parseInt(form.duration, 10) || 30),
    };
    let { error } = await supabase
      .from("services")
      .insert({ ...base, price_type: effectiveType, price_cents: priceCents });
    if (error) {
      // price_type arrives with migration 0014; until it lands, save
      // the price the pre-0014 way (amount only) so adding a service
      // never fails over the display style.
      ({ error } = await supabase
        .from("services")
        .insert({ ...base, price_cents: priceCents }));
    }
    if (error) {
      console.error("Service add failed", error);
      setMsg("That service couldn't be added. Please try again.");
    }
    setForm({ name: "", duration: "30" });
    setPriceType("none");
    setPrice("");
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
              {[`${s.duration_minutes} min`, formatServicePrice(s), visitTypeLabel(s.visit_type)]
                .filter(Boolean)
                .join(" · ")}
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
        <label className="field">
          <span>Price (optional)</span>
          <select value={priceType} onChange={(e) => setPriceType(e.target.value as PriceType)}>
            <option value="none">No price</option>
            <option value="exact">Exact price</option>
            <option value="from">Starts at</option>
            <option value="free">Free</option>
          </select>
        </label>
        {(priceType === "exact" || priceType === "from") && (
          <label className="field">
            <span>{priceType === "from" ? "Starting price ($)" : "Price ($)"}</span>
            <input type="number" min={0} step="0.01" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="250" />
          </label>
        )}
        <button className="btn btn-primary" type="submit" disabled={busy || !form.name.trim()}>
          Add service
        </button>
      </form>
    </div>
  );
}
