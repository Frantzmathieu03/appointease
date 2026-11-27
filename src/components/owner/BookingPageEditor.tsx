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
// the cover / logo / photos manager (with the photos heading), the
// publish switch, and a live preview that renders the top of the
// public page: cover, logo, name, words, Book button: with the
// words as you type them (Frantz's page plan, 2026-11-26).
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
  const [coverUrl, setCoverUrl] = useState(business.cover_url ?? null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState(business.gallery_title ?? "");
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryNote, setGalleryNote] = useState("");

  // After a logo/cover/photo upload the media manager refreshes the
  // page: pick the fresh values up so the preview follows.
  useEffect(() => setLogoUrl(business.logo_url), [business.logo_url]);
  useEffect(() => setCoverUrl(business.cover_url ?? null), [business.cover_url]);
  useEffect(() => setPhotos(initialPhotos), [initialPhotos]);

  async function saveGalleryTitle() {
    setGalleryBusy(true);
    setGalleryNote("");
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("businesses")
      .update({ gallery_title: galleryTitle.trim() || null })
      .eq("id", business.id);
    setGalleryBusy(false);
    setGalleryNote(
      error
        ? "That heading couldn't be saved. Please try again."
        : "Heading saved ✓"
    );
  }

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
                  placeholder="Tell customers what you do. For example: Haircuts and beard trims for the whole family. Walk ins welcome."
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
            <h2>Cover, logo &amp; photos (optional)</h2>
            <p className="small" style={{ marginBottom: 10 }}>
              Optional: a cover photo, a logo and up to four photos of
              your work. You can take bookings without them.
            </p>
            <label className="field">
              <span>Photos heading (shown above your photos)</span>
              <input
                value={galleryTitle}
                onChange={(e) => {
                  setGalleryTitle(e.target.value);
                  setGalleryNote("");
                }}
                placeholder="Our work"
                maxLength={60}
              />
            </label>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
              <button
                className="btn"
                type="button"
                onClick={saveGalleryTitle}
                disabled={galleryBusy}
              >
                {galleryBusy ? "Saving…" : "Save heading"}
              </button>
              {galleryNote && <span className="small">{galleryNote}</span>}
            </div>
            <BusinessMediaManager
              businessId={business.id}
              initialLogoUrl={business.logo_url}
              initialCoverUrl={business.cover_url ?? null}
              initialPhotos={initialPhotos}
            />
          </div>

          <div className="card">
            <h2>Publish</h2>
            <PublishButton businessId={business.id} published={business.published} initialMissing={publishMissing} />
          </div>
        </div>

        <div>
          <p className="eyebrow" style={{ marginTop: 0 }}>Preview: the top of your page</p>
          <div
            className="bizpage"
            style={{
              borderRadius: 16,
              border: "1px solid var(--line)",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 20px 22px" }}>
              <div className="bp-cover-wrap">
                <div className="bp-cover">
                  {coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverUrl} alt="" />
                  )}
                </div>
              </div>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="bp-logo" src={logoUrl} alt={`${form.name} logo`} />
              ) : (
                <div className="bp-logo bp-logo-initial" aria-hidden="true">
                  {(form.name.trim().charAt(0) || "Y").toUpperCase()}
                </div>
              )}
              <h1 className="bp-name">{form.name || "Your business name"}</h1>
              <p className="bp-tagline">{categoryText}</p>
              {form.description && <p className="bp-about">{form.description}</p>}
              <span className="bp-book">Book an appointment</span>
              <div className="bp-actions">
                <span className="bp-square">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
                  </svg>
                  Call
                </span>
                <span className="bp-square">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12a8 8 0 0 1-8 8H4l2.3-2.9A8 8 0 1 1 21 12z" />
                  </svg>
                  Message
                </span>
                <span className="bp-square">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.6" />
                  </svg>
                  Directions
                </span>
              </div>
            </div>
          </div>
          {photos.length > 0 && (
            <div className="card">
              <h2>{galleryTitle.trim() || "Our work"}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {photos.slice(0, 4).map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={p.url}
                    alt={`Work by ${form.name}`}
                    style={{
                      width: "100%",
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 12,
                      display: "block",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <p className="small">
            The preview shows the top of your page. Services and hours
            appear below it on the real page. Hours today: {hoursLabel}.
            {form.phone ? ` Callers reach you at ${formatPhone(form.phone)}.` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
