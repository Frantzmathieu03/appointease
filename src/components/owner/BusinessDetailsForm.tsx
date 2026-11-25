"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { BUSINESS_TYPES } from "@/lib/owner-shared";
import { CATEGORIES, DEFAULT_CATEGORY } from "@/lib/categories";
import type { Business } from "@/lib/types";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export default function BusinessDetailsForm({ business }: { business: Business }) {
  const [form, setForm] = useState({
    name: business.name,
    type: business.type,
    phone: business.phone ?? "",
    email: business.email ?? "",
    address: business.address ?? "",
    description: business.description ?? "",
    timezone: business.timezone,
  });
  const [category, setCategory] = useState(business.category ?? DEFAULT_CATEGORY);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [k]: e.target.value });
    setSaved(false);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createBrowserSupabase();
    await supabase
      .from("businesses")
      .update({
        name: form.name.trim(),
        type: form.type,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        description: form.description.trim() || null,
        timezone: form.timezone,
      })
      .eq("id", business.id);
    // Category is its own column (migration 0007) — saved separately,
    // best-effort, so a missing column can never fail the details save.
    await supabase.from("businesses").update({ category }).eq("id", business.id);
    setBusy(false);
    setSaved(true);
  }

  return (
    <form onSubmit={save}>
      <label className="field">
        <span>Business name</span>
        <input required value={form.name} onChange={set("name")} />
      </label>
      <label className="field">
        <span>Type</span>
        <select value={form.type} onChange={set("type")}>
          {BUSINESS_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Category (customers find you by this)</span>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSaved(false);
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.label}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Office phone (the Call office button dials this)</span>
        <input type="tel" value={form.phone} onChange={set("phone")} />
      </label>
      <label className="field">
        <span>Business email (new-message alerts go here)</span>
        <input type="email" value={form.email} onChange={set("email")} />
      </label>
      <label className="field">
        <span>Address (shown on your page and in reminders)</span>
        <input value={form.address} onChange={set("address")} placeholder="25 Main St, Boston, MA" />
      </label>
      <label className="field">
        <span>Short description (optional)</span>
        <textarea value={form.description} onChange={set("description")} style={{ minHeight: 56 }} />
      </label>
      <label className="field">
        <span>Timezone</span>
        <select value={form.timezone} onChange={set("timezone")}>
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
          ))}
        </select>
      </label>
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
      </button>
    </form>
  );
}
