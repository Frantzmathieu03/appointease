"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { TRIAL_DAYS } from "@/lib/plans";
import { slugify } from "@/lib/types";
import { CATEGORIES, DEFAULT_CATEGORY } from "@/lib/categories";
import { standardServiceNames, DEFAULT_SERVICE_MINUTES } from "@/lib/default-service";

// Top level paths that are real AppointEase pages or system routes:
// a business link can never take one of these names.
const RESERVED_SLUGS = new Set([
  "owner", "login", "signup", "explore", "pricing", "about", "terms",
  "privacy", "contact", "admin", "api", "my-appointments", "auth",
  "manage", "set-password", "robots.txt", "sitemap.xml", "favicon.ico",
]);

// The businesses.type column still gets a plain value at creation,
// derived from the kind the owner picks (the dashboard's Business
// Details form can change it later). Creation itself asks for the
// business name and kind only (Frantz's simplicity rule, restated
// in the 2026-11-27 reader audit fix): phone, address and the
// description are added in the setup checklist's next step, not here.
const TYPE_BY_CATEGORY: Record<string, string> = {
  "barbershops": "Barbershop",
  "hair-salons": "Hair Salon",
  "nail-salons-spas": "Spa / Massage",
  "law-offices": "Law Office",
  "dental-offices": "Dental",
  "doctors-clinics": "Doctor / Medical",
  "pet-groomers": "Other",
  "auto-repair": "Auto Repair",
  "other": "Other",
};

/**
 * Creates the owner's business row with its slug reserved
 * (appointease.io/<slug>). Slug collisions get a numeric suffix.
 * Shared by owner signup and the setup page's first step.
 */
export default function CreateBusinessForm({ afterCreate = "/owner/setup" }: { afterCreate?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
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
      setError("Your session expired. Sign in again.");
      setBusy(false);
      return;
    }
    const base = slugify(name) || "my-business";
    // Reserved words can never be a business link (fix guide,
    // 2026-11-27): a shop named "Login" must not take
    // appointease.io/login and collide with the real page. A reserved
    // base starts from the first suffix instead.
    const startAttempt = RESERVED_SLUGS.has(base) ? 1 : 0;
    let created = false;
    for (let attempt = startAttempt; attempt < 6 && !created; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const { error } = await supabase.from("businesses").insert({
        owner_id: user.id,
        slug,
        name: name.trim(),
        type: TYPE_BY_CATEGORY[category] ?? "Other",
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
        // The standard pair (Frantz, 2026-11-26): every new business
        // starts bookable: the category standard plus a follow-up
        // appointment, provided by the system, free, no owner action
        // needed. Best-effort like the category write; the booking
        // flow's own fallback covers any miss.
        const { data: biz } = await supabase
          .from("businesses")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (biz) {
          await supabase.from("services").insert(
            standardServiceNames(category).map((serviceName) => ({
              business_id: biz.id,
              name: serviceName,
              duration_minutes: DEFAULT_SERVICE_MINUTES,
              price_type: "none",
              price_cents: null,
              active: true,
            }))
          );
        }
      } else if ((error as { code?: string }).code !== "23505") {
        setError("Could not create the business. Please try again.");
        break;
      }
    }
    setBusy(false);
    if (created) {
      router.push(afterCreate);
      router.refresh();
    } else if (!error) {
      setError("That business link is taken in every variation. Try a slightly different name.");
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
          Your link:{" "}
          <strong>
            appointease.io/
            {(() => {
              const b = slugify(name) || "yourshop";
              return RESERVED_SLUGS.has(b) ? `${b}-2` : b;
            })()}
          </strong>
        </p>
      )}
      <label className="field">
        <span>Kind of business (customers find you by this)</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.label}</option>
          ))}
        </select>
      </label>
      <p className="small" style={{ margin: "0 0 10px" }}>
        That is all we need to start. Phone, address and hours come next, and you can change them anytime.
      </p>
      <button className="btn btn-primary btn-block" type="submit" disabled={busy || !name.trim()}>
        {busy ? "Reserving your link…" : "Create my business"}
      </button>
    </form>
  );
}
