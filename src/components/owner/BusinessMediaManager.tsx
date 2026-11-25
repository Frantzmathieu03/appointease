"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { BusinessPhoto } from "@/lib/types";

// Owner media manager: one logo + up to 4 work photos, stored in the
// public "business-media" Supabase Storage bucket under <business_id>/.
// Writes are owner-only (RLS + storage policies, migration 0006); the
// public business page reads the URLs. Validation is honest and plain:
// JPEG/PNG/WebP only, logo ≤ 2 MB, photos ≤ 5 MB each.

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
  initialPhotos,
}: {
  businessId: string;
  initialLogoUrl: string | null;
  initialPhotos: BusinessPhoto[];
}) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [photos, setPhotos] = useState(initialPhotos);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  async function upload(file: File, kind: "logo" | "photo"): Promise<string | null> {
    const problem = validate(file, kind === "logo" ? LOGO_MAX_BYTES : PHOTO_MAX_BYTES);
    if (problem) {
      setError(problem);
      return null;
    }
    const supabase = createBrowserSupabase();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${businessId}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type });
    if (upErr) {
      console.error("Media upload failed", upErr);
      setError("That upload didn't go through. Check your connection and try again.");
      return null;
    }
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function onLogo(file: File) {
    setBusy("logo");
    setError("");
    const url = await upload(file, "logo");
    if (url) {
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

  async function onPhoto(file: File) {
    if (photos.length >= MAX_PHOTOS) {
      setError(`You can show up to ${MAX_PHOTOS} photos. Remove one first.`);
      return;
    }
    setBusy("photo");
    setError("");
    const url = await upload(file, "photo");
    if (url) {
      const supabase = createBrowserSupabase();
      const { data, error: dbErr } = await supabase
        .from("business_photos")
        .insert({ business_id: businessId, url, position: photos.length })
        .select("*")
        .single();
      if (dbErr || !data) {
        console.error("Photo save failed", dbErr);
        setError("That photo couldn't be saved. Please try again.");
        const path = storagePathFromUrl(url);
        if (path) await supabase.storage.from(BUCKET).remove([path]);
      } else {
        setPhotos([...photos, data as BusinessPhoto]);
        router.refresh();
      }
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

      <h3 style={{ marginTop: 2 }}>Logo</h3>
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
          in an “Our work” gallery on your booking page.
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
      <button
        className="btn"
        disabled={busy !== "" || photos.length >= MAX_PHOTOS}
        onClick={() => photoInput.current?.click()}
      >
        {busy === "photo" ? "Uploading…" : "Add a photo"}
      </button>
      <p className="small">JPG, PNG or WebP, up to 5 MB each, up to {MAX_PHOTOS} photos.</p>
      <input
        ref={photoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPhoto(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
