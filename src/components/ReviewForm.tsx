"use client";

import { useState } from "react";

export default function ReviewForm({ appointmentId }: { appointmentId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  if (state === "done") return <p className="small">Thanks — your review was submitted ✓</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, rating, comment }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }} aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={n <= rating ? "btn btn-primary" : "btn"}
            style={{ padding: "6px 11px" }}
          >
            {n}★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How was it? (optional)"
        style={{ minHeight: 56 }}
      />
      <button className="btn" type="submit" disabled={state === "busy"} style={{ marginTop: 8 }}>
        {state === "busy" ? "Sending…" : "Leave a review"}
      </button>
      {state === "error" && <p className="small">That did not go through — please try again.</p>}
    </form>
  );
}
