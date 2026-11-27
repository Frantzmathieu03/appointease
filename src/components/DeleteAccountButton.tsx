"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";

/**
 * Delete my account, in two clear steps (App Store guideline
 * 5.1.1(v)): the first tap explains in plain words what deletion
 * does and offers the button; the second step asks once more, with
 * Keep my account sitting right there, before anything is sent.
 * The work itself happens in POST /api/account/delete, which
 * cancels subscriptions and upcoming appointments before removing
 * the account. On success the person is signed out locally and
 * lands on the page the caller names (the platform home for an
 * owner, the business's own page for a customer).
 */
export default function DeleteAccountButton({
  intro,
  confirmPrompt,
  confirmLabel,
  afterPath,
}: {
  intro: string;
  confirmPrompt: string;
  confirmLabel: string;
  afterPath: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm">("idle");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function doDelete() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Deleting the account failed. Please try again in a moment.");
        setBusy(false);
        return;
      }
    } catch {
      setError("Deleting the account failed. Please try again in a moment.");
      setBusy(false);
      return;
    }
    // The account is gone. Clear the local session and land where
    // the caller asked, as a signed out visitor.
    try {
      await createBrowserSupabase().auth.signOut();
    } catch {
      // The session died with the account; nothing to clear.
    }
    router.push(afterPath);
    router.refresh();
  }

  if (step === "idle") {
    return (
      <div>
        <p className="small" style={{ marginTop: 0 }}>{intro}</p>
        <button
          className="btn btn-outline-danger"
          type="button"
          onClick={() => setStep("confirm")}
        >
          Delete my account
        </button>
      </div>
    );
  }

  return (
    <div>
      <p style={{ marginTop: 0, fontWeight: 600 }}>{confirmPrompt}</p>
      {error && <div className="error">{error}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-danger" type="button" onClick={doDelete} disabled={busy}>
          {busy ? "Deleting…" : confirmLabel}
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => { setStep("idle"); setError(""); }}
          disabled={busy}
        >
          Keep my account
        </button>
      </div>
    </div>
  );
}
