"use client";

import { useEffect, useState } from "react";

/**
 * Delete my account, with a 48 hour grace period (Frantz,
 * 2026-11-27; App Store guideline 5.1.1(v) for the in app ask).
 * The first tap explains in plain words what deletion does and
 * that it is scheduled, not instant: the account is deleted 48
 * hours after the ask, it keeps working normally until then, and
 * the ask can be undone at any time before the 48 hours are up.
 * The second step asks once more, with Keep my account sitting
 * right there, before anything is sent.
 *
 * Asking sends POST /api/account/delete, which records the ask;
 * the deletion itself happens later, when the time runs out.
 * While an ask is pending, this same spot shows a clear banner
 * with the exact deletion date and time and a Keep my account
 * button that cancels the ask (POST /api/account/delete/cancel).
 * The pending state is read on mount from GET /api/account/delete,
 * so the banner is there on every visit during the 48 hours.
 */
export default function DeleteAccountButton({
  intro,
  confirmPrompt,
  confirmLabel,
}: {
  intro: string;
  confirmPrompt: string;
  confirmLabel: string;
}) {
  const [step, setStep] = useState<"checking" | "idle" | "confirm" | "scheduled">("checking");
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch("/api/account/delete");
        const data = (await res.json().catch(() => null)) as
          | { pending?: boolean; dueAt?: string | null }
          | null;
        if (!live) return;
        if (data?.pending && data.dueAt) {
          setDueAt(data.dueAt);
          setStep("scheduled");
        } else {
          setStep("idle");
        }
      } catch {
        if (live) setStep("idle");
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  async function doSchedule() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; dueAt?: string }
        | null;
      if (!res.ok) {
        setError(data?.error ?? "Scheduling the deletion failed. Please try again in a moment.");
        setBusy(false);
        return;
      }
      setDueAt(data?.dueAt ?? null);
      setNotice("");
      setStep("scheduled");
    } catch {
      setError("Scheduling the deletion failed. Please try again in a moment.");
    }
    setBusy(false);
  }

  async function doCancel() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/delete/cancel", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Keeping your account failed. Please try again in a moment.");
        setBusy(false);
        return;
      }
      setDueAt(null);
      setNotice("Done. Your account will not be deleted.");
      setStep("idle");
    } catch {
      setError("Keeping your account failed. Please try again in a moment.");
    }
    setBusy(false);
  }

  if (step === "checking") {
    return (
      <div>
        <p className="small" style={{ marginTop: 0 }}>{intro}</p>
        <p className="small">Checking your account…</p>
      </div>
    );
  }

  if (step === "scheduled") {
    const when = dueAt
      ? new Intl.DateTimeFormat(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(dueAt))
      : "";
    return (
      <div>
        <div className="notice" role="status">
          <p style={{ margin: 0, fontWeight: 600 }}>
            Your account will be deleted on {when}.
          </p>
          <p style={{ margin: "6px 0 0" }}>
            Until then your account works as normal. Changed your mind? Keep
            your account and nothing will be deleted.
          </p>
        </div>
        {error && <div className="error">{error}</div>}
        <button
          className="btn btn-primary"
          type="button"
          onClick={doCancel}
          disabled={busy}
          style={{ marginTop: 10 }}
        >
          {busy ? "Keeping…" : "Keep my account"}
        </button>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div>
        <p style={{ marginTop: 0, fontWeight: 600 }}>{confirmPrompt}</p>
        {error && <div className="error">{error}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-danger" type="button" onClick={doSchedule} disabled={busy}>
            {busy ? "Scheduling…" : confirmLabel}
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

  return (
    <div>
      <p className="small" style={{ marginTop: 0 }}>{intro}</p>
      <p className="small">
        Deletion is not instant. Your account will be deleted 48 hours after
        you ask, it keeps working normally until then, and you can undo the
        ask at any time before the 48 hours are up.
      </p>
      {notice && <div className="success">{notice}</div>}
      {error && <div className="error">{error}</div>}
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
