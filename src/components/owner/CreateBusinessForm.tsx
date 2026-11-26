"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { TRIAL_DAYS } from "@/lib/plans";
import { slugify } from "@/lib/types";
import { BUSINESS_TYPES } from "@/lib/owner-shared";
import { CATEGORIES, DEFAULT_CATEGORY } from "@/lib/categories";

/**
 * Creates the owner's business row with its slug reserved
 * (appointease.io/<slug>). Slug collisions get a numeric suffix.
 * Shared by owner signup and the setup page's first step.
 */
export default function CreateBusinessForm({ afterCreate = "/owner/setup" }: { afterCreate?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState(BUSINESS_TYPES[0]);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session expired — sign in again.");
      setBusy(false);
      return;
    }
    const base = slugify(name) || "my-business";
    let created = false;
    for (let attempt = 0; attempt < 6 && !created; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const { error } = await supabase.from("businesses").insert({
        owner_id: user.id,
        slug,
        name: name.trim(),
        type,
        phone: phone.trim() || null,
        address: address.trim() || null,
        description: description.trim() || null,
        email: user.email ?? null,
        // 14-day free trial for new businesses (Frantz, 2026-11-26).
        // Set explicitly so the length does not depend on the DB
        // column default; migration 0015 moves the default to match.
        trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 864e5).toISOString(),
      });
      if (!error) {
        created = true;
        // Category lives in its own column (migration 0007). Set it as a
        // best-effort follow-up so business creation never breaks if the
        // migration hasn't been applied yet.
        await supabase.from("businesses").update({ category }).eq("slug", slug);
      } else if ((error as { code?: string }).code !== "23505") {
        setError("Could not create the business — please try again.");
        break;
      }
    }
    setBusy(false);
    if (created) {
      router.push(afterCreate);
      router.refresh();
    } else if (!error) {
      setError("That business link is taken in every variation — try a slightly different name.");
    }
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <label className="field">
        <span>Business name</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Street Barbers" />
      </label>
      {name && (
        <p className="small" style={{ marginTop: -8, marginBottom: 12 }}>
          Your link: <strong>appointease.io/{slugify(name) || "your-business"}</strong>
        </p>
      )}
      <label className="field">
        <span>Business type</span>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {BUSINESS_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Category (customers find you by this)</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.label}</option>
          ))}
        </select>
      </label>
      <p className="small" style={{ margin: "0 0 10px" }}>
        The rest is optional — you can add this later.
      </p>
      <label className="field">
        <span>Office phone (optional — customers will tap to call)</span>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      </label>
      <label className="field">
        <span>Business address (optional — customers tap it for directions)</span>
        <input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" placeholder="25 Main St, Boston, MA" />
      </label>
      <label className="field">
        <span>What does your business do? (optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ minHeight: 56 }}
          placeholder="Tell customers what you do — for example: Haircuts and beard trims for the whole family. Walk-ins welcome."
        />
      </label>
      <button className="btn btn-primary btn-block" type="submit" disabled={busy || !name.trim()}>
        {busy ? "Reserving your link…" : "Create my business"}
      </button>
    </form>
  );
}
