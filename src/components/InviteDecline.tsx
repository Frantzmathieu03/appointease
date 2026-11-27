"use client";

import { useState } from "react";

/** Decline button for /invite/[token]: posts to the decline API
 *  route. Two steps (Decline, then Confirm) so a stray tap never
 *  answers an invite by accident. On success the page swaps to a
 *  plain thank-you; the Team page shows the invite as Declined. */
export default function InviteDecline({ token }: { token: string }) {
  const [stage, setStage] = useState<"idle" | "confirm" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function decline() {
    setStage("busy");
    try {
      const res = await fetch("/api/invite/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && data?.ok) {
        setStage("done");
      } else {
        setMessage(data?.error ?? "Could not save that. Please try again.");
        setStage("error");
      }
    } catch {
      setMessage("Could not save that. Please check your connection and try again.");
      setStage("error");
    }
  }

  if (stage === "done") {
    return (
      <div className="success">
        Thank you. You have declined this invite, and the business has been updated.
      </div>
    );
  }
  return (
    <div style={{ marginTop: 12 }}>
      {stage === "idle" && (
        <button className="btn" onClick={() => setStage("confirm")}>
          Decline
        </button>
      )}
      {stage === "confirm" && (
        <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="small">Decline this invite?</span>
          <button className="btn btn-primary" onClick={decline}>
            Yes, decline
          </button>
          <button className="btn" onClick={() => setStage("idle")}>
            Keep the invite
          </button>
        </span>
      )}
      {stage === "busy" && <button className="btn" disabled>Saving…</button>}
      {stage === "error" && (
        <p className="small" style={{ color: "#b3261e", margin: 0 }}>{message}</p>
      )}
    </div>
  );
}
