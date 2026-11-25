"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import BusinessMediaManager from "@/components/owner/BusinessMediaManager";
import PublishButton from "@/components/owner/PublishButton";
import CopyLinkButton from "@/components/CopyLinkButton";
import type { Business, BusinessPhoto } from "@/lib/types";
import { formatPhone } from "@/lib/types";

// The booking-page editor: one form for the words on the public page,
// the logo & photos manager, the publish switch, and a live preview
// that renders the public hero card with the words as you type them.
export default function BookingPageEditor({
  business,
  initialPhotos,
  hoursLabel,
  categoryText,
  bookingLink,
  publishMissing,
}: {
  business: Business;
  initialPhotos: BusinessPhoto[];
  hoursLabel: string;
  categoryText: string;
  bookingLink: string;
  publishMissing: string[];
}) {
  const [form, setForm] = useState({
    name: business.name,
    description: business.description ?? "",
    phone: business.phone ?? "",
    address: business.address ?? "",
  });
  const [logoUrl, setLogoUrl] = useState(business.logo_url);
  const [photos, setPhotos] = useState(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // After a logo/photo upload the media manager refreshes the page —
  // pick the fresh values up so the preview follows.
  useEffect(() => setLogoUrl(business.logo_url), [business.logo_url]);
  useEffect(() => setPhotos(initialPhotos), [initialPhotos]);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
        description: form.description.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      })
      .eq("id", business.id);
    setBusy(false);
    setSaved(true);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <CopyLinkButton url={bookingLink} />
        <Link href={`/${business.slug}`} className="btn">View booking page</Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div>
          <div className="card" style={{ marginTop: 0 }}>
            <h2>The words on your page</h2>
            <form onSubmit={save}>
              <label className="field">
                <span>Business name</span>
                <input required value={form.name} onChange={set("name")} />
              </label>
              <label className="field">
                <span>What does your business do? (optional)</span>
                <textarea
                  value={form.description}
                  onChange={set("description")}
                  style={{ minHeight: 56 }}
                  placeholder="Tell customers what you do — for example: Haircuts and beard trims for the whole family. Walk-ins welcome."
                />
              </label>
              <label className="field">
                <span>Office phone (the Call button dials this)</span>
                <input type="tel" value={form.phone} onChange={set("phone")} />
              </label>
              <label className="field">
                <span>Address (shown on your page and in reminders)</span>
                <input value={form.address} onChange={set("address")} placeholder="25 Main St, Boston, MA" />
              </label>
              <button className="btn btn-primary" type="submit" disabled={busy || !form.name.trim()}>
                {busy ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
              </button>
            </form>
          </div>

          <div className="card">
            <h2>Logo &amp; photos (optional)</h2>
            <p className="small" style={{ marginBottom: 10 }}>
              Optional — a logo and up to four photos of your work. You can
              take bookings without them.
            </p>
            <BusinessMediaManager
              businessId={business.id}
              initialLogoUrl={business.logo_url}
              initialPhotos={initialPhotos}
            />
          </div>

          <div className="card">
            <h2>Publish</h2>
            <PublishButton businessId={business.id} published={business.published} initialMissing={publishMissing} />
          </div>
        </div>

        <div>
          <p className="eyebrow" style={{ marginTop: 0 }}>Preview — your page header</p>
          <div className="hero-card" style={{ margin: 0 }}>
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`${form.name} logo`}
                style={{
                  width: 76,
                  height: 76,
                  objectFit: "cover",
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.65)",
                  marginBottom: 10,
                  background: "#fff",
                }}
              />
            )}
            <p className="eyebrow">{categoryText}</p>
            <h1>{form.name || "Your business name"}</h1>
            {form.address && (
              <p className="lede" style={{ marginBottom: 6 }}>📍 {form.address}</p>
            )}
            <p className="lede" style={{ marginBottom: 6 }}>{hoursLabel}</p>
            {form.description && (
              <p className="lede" style={{ marginBottom: 0 }}>{form.description}</p>
            )}
            <div className="action-row" style={{ margin: "16px 0 0" }}>
              <span
                className="btn"
                style={{ background: "#fff", color: "var(--green)", borderColor: "#fff" }}
              >
                Book appointment
              </span>
              <span
                className="btn"
                style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.65)" }}
              >
                Message us
              </span>
              <span
                className="btn"
                style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.65)" }}
              >
                Call {form.phone ? formatPhone(form.phone) : "office"}
              </span>
            </div>
          </div>
          {photos.length > 0 && (
            <div className="card">
              <h2>Our work</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={p.url}
                    alt={`Work by ${form.name}`}
                    style={{
                      width: "100%",
                      aspectRatio: "4 / 3",
                      objectFit: "cover",
                      borderRadius: 14,
                      border: "1px solid var(--line)",
                      display: "block",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <p className="small">
            The preview shows the top of your page. Services, hours and
            reviews appear below it on the real page.
          </p>
        </div>
      </div>
    </div>
  );
}
