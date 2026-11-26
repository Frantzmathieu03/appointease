"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface PaidMark {
  /** Display date, already formatted by the server page. */
  dateLabel: string;
  amountCents: number;
}

const money = (cents: number) =>
  `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

// The appointment page's pay-at-the-office block (revised Dashboard
// Changes PDF, 2026-11-26): a price line ("$250 · Pay at the office")
// plus the front desk's optional Mark paid control. Marking writes a
// 'marked_paid' timeline event through /api/appointments/mark-paid —
// offline bookkeeping only; AppointEase never collects the money.
// Once marked, the paid line shows and the form steps aside; a small
// "Mark another payment" link brings it back (a second mark is a
// second event — there is no undo).
export default function MarkPaid({
  appointmentId,
  priceLine,
  prefillCents,
  marks,
}: {
  appointmentId: string;
  /** e.g. "$250 · Pay at the office", or just "Pay at the office". */
  priceLine: string;
  /** Service price to prefill the amount with; null = blank. */
  prefillCents: number | null;
  marks: PaidMark[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(marks.length === 0);
  const [amount, setAmount] = useState(
    prefillCents !== null ? (prefillCents / 100).toFixed(2) : ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mark() {
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter the amount they paid at the office.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          amountCents: Math.round(dollars * 100),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save that. Please try again.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ margin: "4px 0" }}>
        <strong>{priceLine}</strong>
      </p>
      {marks.map((m, i) => (
        <p key={i} className="small" style={{ margin: "2px 0" }}>
          Paid at the office · {m.dateLabel} · {money(m.amountCents)}
        </p>
      ))}
      {open ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            flexWrap: "wrap",
            marginTop: 8,
          }}
        >
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="mark-paid-amount">Amount paid ($)</label>
            <input
              id="mark-paid-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: 140 }}
            />
          </div>
          <button className="btn btn-primary" onClick={mark} disabled={busy}>
            {busy ? "Saving…" : "Mark paid"}
          </button>
          {marks.length > 0 && (
            <button className="btn" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
          )}
        </div>
      ) : (
        <button
          className="btn"
          style={{ marginTop: 6, padding: "4px 10px", minHeight: 32 }}
          onClick={() => setOpen(true)}
        >
          Mark another payment
        </button>
      )}
      {error && (
        <p className="small" style={{ color: "#b3261e", margin: "6px 0 0" }}>
          {error}
        </p>
      )}
    </div>
  );
}
