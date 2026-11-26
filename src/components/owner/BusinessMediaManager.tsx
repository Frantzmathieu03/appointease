"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { BusinessPhoto } from "@/lib/types";

// Owner media manager: one cover photo + one logo + up to 4 work
// photos (owners can pick many photos at once from their gallery),
// stored in the public "business-media" Supabase Storage bucket under
// <business_id>/. Writes are owner-only (RLS + storage policies,
// migration 0006); the public business page reads the URLs. The cover
// is its own image (businesses.cover_url, migration 0014) — the wide
// photo across the top of the page in Frantz's page plan (2026-11-26).
// Validation is honest and plain: JPEG/PNG/WebP only, logo ≤ 2 MB,
// cover and photos ≤ 5 MB each.

const BUCKET = "business-media";
const MAX_PHOTOS = 4;
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function storagePathFromUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

function validate(file: File, maxBytes: number): string | null {
  if (!ACCEPTED.includes(file.type)) return "Please choose a JPG, PNG or WebP image.";
  if (file.size > maxBytes)
    return `That image is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`;
  return null;
}

export default function BusinessMediaManager({
  businessId,
  initialLogoUrl,
  initialCoverUrl,
  initialPhotos,
}: {
  businessId: string;
  initialLogoUrl: string | null;
  initialCoverUrl?: string | null;
  initialPhotos: BusinessPhoto[];
}) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl ?? null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  // Returns the public URL, or a plain-words reason it did not work.
  // The caller decides how to show the reason (one file vs. many).
  async function upload(
    file: File,
    kind: "logo" | "photo" | "cover"
  ): Promise<{ url: string } | { problem: string }> {
    const problem = validate(file, kind === "logo" ? LOGO_MAX_BYTES : PHOTO_MAX_BYTES);
    if (problem) return { problem };
    const supabase = createBrowserSupabase();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${businessId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type });
    if (upErr) {
      console.error("Media upload failed", upErr);
      return { problem: "That upload didn't go through. Check your connection and try again." };
    }
    return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
  }

  async function onLogo(file: File) {
    setBusy("logo");
    setError("");
    setNote("");
    const result = await upload(file, "logo");
    if ("problem" in result) {
      setError(result.problem);
    } else {
      const url = result.url;
      const supabase = createBrowserSupabase();
      const old = logoUrl;
      const { error: dbErr } = await supabase
        .from("businesses")
        .update({ logo_url: url })
        .eq("id", businessId);
      if (dbErr) {
        console.error("Logo save failed", dbErr);
        setError("Your logo uploaded but couldn't be saved. Please try again.");
      } else {
        setLogoUrl(url);
        if (old) {
          const oldPath = storagePathFromUrl(old);
          if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
        }
        router.refresh();
      }
    }
    setBusy("");
  }

  async function onCover(file: File) {
    setBusy("cover");
    setError("");
    setNote("");
    const result = await upload(file, "cover");
    if ("problem" in result) {
      setError(result.problem);
    } else {
      const url = result.url;
      const supabase = createBrowserSupabase();
      const old = coverUrl;
      const { error: dbErr } = await supabase
        .from("businesses")
        .update({ cover_url: url })
        .eq("id", businessId);
      if (dbErr) {
        console.error("Cover save failed", dbErr);
        setError("Your cover photo uploaded but couldn't be saved. Please try again.");
      } else {
        setCoverUrl(url);
        if (old) {
          const oldPath = storagePathFromUrl(old);
          if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
        }
        router.refresh();
      }
    }
    setBusy("");
  }

  async function removeCover() {
    setBusy("cover");
    setError("");
    const supabase = createBrowserSupabase();
    const { error: dbErr } = await supabase
      .from("businesses")
      .update({ cover_url: null })
      .eq("id", businessId);
    if (dbErr) {
      console.error("Cover remove failed", dbErr);
      setError("That cover photo couldn't be removed. Please try again.");
    } else {
      const oldPath = coverUrl ? storagePathFromUrl(coverUrl) : null;
      setCoverUrl(null);
      if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
      router.refresh();
    }
    setBusy("");
  }

  async function removeLogo() {
    setBusy("logo");
    setError("");
    const supabase = createBrowserSupabase();
    const { error: dbErr } = await supabase
      .from("businesses")
      .update({ logo_url: null })
      .eq("id", businessId);
    if (dbErr) {
      console.error("Logo remove failed", dbErr);
      setError("That logo couldn't be removed. Please try again.");
    } else {
      const oldPath = logoUrl ? storagePathFromUrl(logoUrl) : null;
      setLogoUrl(null);
      if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
      router.refresh();
    }
    setBusy("");
  }

  // Owners can pick many photos at once from their gallery. They are
  // added one after another; a plain note says how far along it is, and
  // the note at the end says how many were added. Only the open slots
  // are filled — the limit is MAX_PHOTOS photos in total.
  async function onPhotos(picked: File[]) {
    if (picked.length === 0) return;
    const open = MAX_PHOTOS - photos.length;
    if (open <= 0) {
      setError(`You can show up to ${MAX_PHOTOS} photos. Remove one first.`);
      return;
    }
    const toAdd = picked.slice(0, open);
    const leftOut = picked.length - toAdd.length;
    setBusy("photo");
    setError("");
    setNote(toAdd.length > 1 ? `Adding ${toAdd.length} photos…` : "Adding your photo…");
    const supabase = createBrowserSupabase();
    const added: BusinessPhoto[] = [];
    let problem = "";
    for (let i = 0; i < toAdd.length; i++) {
      if (toAdd.length > 1) setNote(`Adding photo ${i + 1} of ${toAdd.length}…`);
      const result = await upload(toAdd[i], "photo");
      if ("problem" in result) {
        problem = result.problem;
        continue;
      }
      const { data, error: dbErr } = await supabase
        .from("business_photos")
        .insert({
          business_id: businessId,
          url: result.url,
          position: photos.length + added.length,
        })
        .select("*")
        .single();
      if (dbErr || !data) {
        console.error("Photo save failed", dbErr);
        problem = "A photo uploaded but couldn't be saved. Please try again.";
        const path = storagePathFromUrl(result.url);
        if (path) await supabase.storage.from(BUCKET).remove([path]);
      } else {
        added.push(data as BusinessPhoto);
      }
    }
    if (added.length > 0) {
      setPhotos([...photos, ...added]);
      router.refresh();
    }
    const failed = toAdd.length - added.length;
    let summary =
      added.length === 1 ? "Added 1 photo." : added.length > 1 ? `Added ${added.length} photos.` : "";
    if (leftOut > 0) {
      summary += ` You picked ${picked.length}, but the limit is ${MAX_PHOTOS} photos, so only the ones that fit were added.`;
    }
    setNote(summary.trim());
    if (failed > 0) {
      setError(
        (added.length > 0
          ? failed === 1
            ? "1 photo could not be added. "
            : `${failed} photos could not be added. `
          : "") + problem
      );
    }
    setBusy("");
  }

  async function removePhoto(photo: BusinessPhoto) {
    setBusy(photo.id);
    setError("");
    const supabase = createBrowserSupabase();
    const { error: dbErr } = await supabase.from("business_photos").delete().eq("id", photo.id);
    if (dbErr) {
      console.error("Photo remove failed", dbErr);
      setError("That photo couldn't be removed. Please try again.");
    } else {
      setPhotos(photos.filter((p) => p.id !== photo.id));
      const path = storagePathFromUrl(photo.url);
      if (path) await supabase.storage.from(BUCKET).remove([path]);
      router.refresh();
    }
    setBusy("");
  }

  const thumb: React.CSSProperties = {
    width: 84,
    height: 84,
    objectFit: "cover",
    borderRadius: 14,
    border: "1px solid var(--line)",
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}

      <h3 style={{ marginTop: 2 }}>Cover photo</h3>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt="Cover"
          style={{
            width: "100%",
            height: 110,
            objectFit: "cover",
            borderRadius: 14,
            border: "1px solid var(--line)",
            display: "block",
            marginBottom: 10,
          }}
        />
      ) : (
        <div
          style={{
            height: 110,
            borderRadius: 14,
            background: "#dfebdd",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted)",
            fontSize: 13,
            marginBottom: 10,
            padding: 10,
            textAlign: "center",
          }}
        >
          No cover yet — your page shows a plain green space here
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" disabled={busy !== ""} onClick={() => coverInput.current?.click()}>
          {busy === "cover" ? "Working…" : coverUrl ? "Replace cover photo" : "Upload cover photo"}
        </button>
        {coverUrl && (
          <button className="btn" disabled={busy !== ""} onClick={removeCover}>
            Remove
          </button>
        )}
      </div>
      <p className="small">The wide photo across the top of your booking page. JPG, PNG or WebP, up to 5 MB.</p>
      <input
        ref={coverInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onCover(f);
          e.target.value = "";
        }}
      />

      <h3 style={{ marginTop: 18 }}>Logo</h3>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Business logo" style={{ ...thumb, borderRadius: "50%" }} />
        ) : (
          <div
            style={{
              ...thumb,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              fontSize: 12,
              textAlign: "center",
              padding: 6,
            }}
          >
            No logo yet
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" disabled={busy !== ""} onClick={() => logoInput.current?.click()}>
            {busy === "logo" ? "Working…" : logoUrl ? "Replace logo" : "Upload logo"}
          </button>
          {logoUrl && (
            <button className="btn" disabled={busy !== ""} onClick={removeLogo}>
              Remove
            </button>
          )}
        </div>
      </div>
      <p className="small">JPG, PNG or WebP, up to 2 MB. Shown at the top of your booking page.</p>
      <input
        ref={logoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onLogo(f);
          e.target.value = "";
        }}
      />

      <h3 style={{ marginTop: 18 }}>Photos of your work ({photos.length}/{MAX_PHOTOS})</h3>
      {photos.length === 0 ? (
        <p className="small">
          No photos yet — add a few shots of your work and they&apos;ll appear
          in a gallery on your booking page.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          {photos.map((p) => (
            <div key={p.id} style={{ textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="Work sample" style={thumb} />
              <div>
                <button
                  className="btn"
                  style={{ padding: "4px 10px", fontSize: 13, marginTop: 4 }}
                  disabled={busy !== ""}
                  onClick={() => removePhoto(p)}
                >
                  {busy === p.id ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {note && (
        <p className="small" role="status" style={{ marginBottom: 8 }}>
          {note}
        </p>
      )}
      <button
        className="btn"
        disabled={busy !== "" || photos.length >= MAX_PHOTOS}
        onClick={() => photoInput.current?.click()}
      >
        {busy === "photo" ? "Adding…" : "Add photos"}
      </button>
      <p className="small">
        JPG, PNG or WebP, up to 5 MB each, up to {MAX_PHOTOS} photos. You can
        pick more than one at a time.
      </p>
      <input
        ref={photoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          if (files.length) void onPhotos(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
