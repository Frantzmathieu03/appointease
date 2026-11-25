"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import {
  formatPrice,
  visitTypeLabel,
  type IntakeForm,
  type Service,
  type StaffMember,
  type VisitType,
} from "@/lib/types";

const VISIT_TYPES: { id: VisitType; label: string }[] = [
  { id: "in_person", label: "At the business" },
  { id: "online", label: "Online" },
  { id: "both", label: "Your choice — either one" },
];

export default function ServicesManager({ businessId }: { businessId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [forms, setForms] = useState<IntakeForm[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  // Who offers what (staff_services): service_id → set of staff ids.
  // A service ABSENT from this map has no rows = everyone offers it.
  const [offers, setOffers] = useState<Map<string, Set<string>>>(new Map());
  const [form, setForm] = useState({
    name: "",
    duration: "30",
    price: "",
    formId: "",
    visitType: "in_person" as VisitType,
  });
  const [newWho, setNewWho] = useState<"everyone" | "some">("everyone");
  const [newOffers, setNewOffers] = useState<Set<string>>(new Set());
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

  const loadStaffAndOffers = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data: staffData } = await supabase
      .from("staff")
      .select("*")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("created_at", { ascending: true });
    const staffRows = (staffData ?? []) as StaffMember[];
    setStaff(staffRows);
    if (staffRows.length === 0) return;
    const { data: ss, error } = await supabase
      .from("staff_services")
      .select("staff_id, service_id")
      .in("staff_id", staffRows.map((s) => s.id));
    if (error) return;
    const map = new Map<string, Set<string>>();
    for (const row of (ss ?? []) as { staff_id: string; service_id: string }[]) {
      if (!map.has(row.service_id)) map.set(row.service_id, new Set());
      map.get(row.service_id)!.add(row.staff_id);
    }
    setOffers(map);
  }, [businessId]);

  useEffect(() => {
    load();
    loadForms();
    loadStaffAndOffers();
  }, [load, loadForms, loadStaffAndOffers]);

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
      visit_type: form.visitType,
    };
    if (form.formId) row.form_id = form.formId;
    let { data: inserted, error } = await supabase
      .from("services")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      // form_id arrives with migration 0012, visit_type with 0013 —
      // retry with only the columns that have always existed.
      delete row.form_id;
      delete row.visit_type;
      ({ data: inserted, error } = await supabase
        .from("services")
        .insert(row)
        .select("id")
        .single());
      if (!error) {
        setMsg("Service added. Some newer settings aren't ready yet — check back soon.");
      }
    }
    if (!error && inserted && newWho === "some" && newOffers.size > 0) {
      await supabase.from("staff_services").insert(
        [...newOffers].map((staffId) => ({ staff_id: staffId, service_id: inserted.id }))
      );
    }
    setForm({ name: "", duration: "30", price: "", formId: "", visitType: "in_person" });
    setNewWho("everyone");
    setNewOffers(new Set());
    setBusy(false);
    load();
    loadStaffAndOffers();
  }

  async function attachForm(s: Service, formId: string) {
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("services")
      .update({ form_id: formId || null })
      .eq("id", s.id);
    if (error) {
      setMsg("Attaching a form isn't ready yet — check back soon.");
      return;
    }
    load();
  }

  async function setVisitType(s: Service, visitType: VisitType) {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("services").update({ visit_type: visitType }).eq("id", s.id);
    if (error) {
      setMsg("That setting isn't ready yet — check back soon.");
      return;
    }
    load();
  }

  // "Who offers this" — everyone (no rows) or only the ticked people.
  async function setWhoMode(s: Service, mode: "everyone" | "some") {
    const supabase = createBrowserSupabase();
    if (mode === "everyone") {
      await supabase.from("staff_services").delete().eq("service_id", s.id);
    } else {
      // Start from "everyone ticked" — the owner unticks from there.
      const current = offers.get(s.id);
      const initial = current && current.size > 0 ? [...current] : staff.map((m) => m.id);
      await supabase.from("staff_services").delete().eq("service_id", s.id);
      if (initial.length > 0) {
        await supabase
          .from("staff_services")
          .insert(initial.map((staffId) => ({ staff_id: staffId, service_id: s.id })));
      }
    }
    loadStaffAndOffers();
  }

  async function toggleOffer(s: Service, staffId: string, on: boolean) {
    const supabase = createBrowserSupabase();
    const current = new Set(offers.get(s.id) ?? []);
    if (on) {
      await supabase.from("staff_services").insert({ staff_id: staffId, service_id: s.id });
    } else {
      if (current.size <= 1) {
        // Unticking the last person = nobody offers it, which the
        // booking page reads as "everyone" — switch the mode instead
        // so what the owner sees is what customers get.
        await supabase.from("staff_services").delete().eq("service_id", s.id);
        setMsg(`${s.name} is back to "everyone offers this" — untick a name only when someone else still offers it.`);
        loadStaffAndOffers();
        return;
      }
      await supabase
        .from("staff_services")
        .delete()
        .eq("service_id", s.id)
        .eq("staff_id", staffId);
    }
    loadStaffAndOffers();
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

  function whoEditor(s: Service) {
    if (staff.length <= 1) return null;
    const restricted = offers.has(s.id);
    const set = offers.get(s.id);
    return (
      <div className="service-meta" style={{ marginTop: 6 }}>
        Who offers this:{" "}
        <select
          value={restricted ? "some" : "everyone"}
          onChange={(e) => setWhoMode(s, e.target.value as "everyone" | "some")}
          aria-label={`Who offers ${s.name}`}
        >
          <option value="everyone">Everyone on the team</option>
          <option value="some">Only some people</option>
        </select>
        {restricted && (
          <span style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", marginLeft: 10 }}>
            {staff.map((m) => (
              <label key={m.id} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={set?.has(m.id) ?? false}
                  onChange={(e) => toggleOffer(s, m.id, e.target.checked)}
                />
                {m.name}
              </label>
            ))}
          </span>
        )}
      </div>
    );
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
            <div className="service-meta" style={{ marginTop: 4 }}>
              Where:{" "}
              <select
                value={s.visit_type ?? "in_person"}
                onChange={(e) => setVisitType(s, e.target.value as VisitType)}
                aria-label={`Where ${s.name} happens`}
              >
                {VISIT_TYPES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            {whoEditor(s)}
            {forms.length > 0 && (
              <div className="service-meta" style={{ marginTop: 4 }}>
                Form:{" "}
                <select
                  value={s.form_id ?? ""}
                  onChange={(e) => attachForm(s, e.target.value)}
                  aria-label={`Form for ${s.name}`}
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
        <label className="field">
          <span>Where does it happen?</span>
          <select
            value={form.visitType}
            onChange={(e) => setForm({ ...form, visitType: e.target.value as VisitType })}
          >
            {VISIT_TYPES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        {staff.length > 1 && (
          <div className="field">
            <span>Who offers this?</span>
            <select
              value={newWho}
              onChange={(e) => {
                const mode = e.target.value as "everyone" | "some";
                setNewWho(mode);
                if (mode === "some" && newOffers.size === 0) {
                  setNewOffers(new Set(staff.map((m) => m.id)));
                }
              }}
            >
              <option value="everyone">Everyone on the team</option>
              <option value="some">Only some people</option>
            </select>
            {newWho === "some" && (
              <span style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                {staff.map((m) => (
                  <label key={m.id} style={{ display: "inline-flex", gap: 4, alignItems: "center", fontWeight: 400 }}>
                    <input
                      type="checkbox"
                      checked={newOffers.has(m.id)}
                      onChange={(e) => {
                        const next = new Set(newOffers);
                        if (e.target.checked) next.add(m.id);
                        else next.delete(m.id);
                        setNewOffers(next);
                      }}
                    />
                    {m.name}
                  </label>
                ))}
              </span>
            )}
          </div>
        )}
        {forms.length > 0 && (
          <label className="field">
            <span>Form (optional) — customers fill it in before the visit</span>
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
