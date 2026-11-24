"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateInZone, formatTimeInZone, nextDates } from "@/lib/slots";

// Secure manage page — the link from every confirmation/reminder.
// The token in the URL is the credential; no account needed.
interface ManageData {
  id: string;
  starts_at: string;
  status: string;
  staff_id: string | null;
  service_id: string;
  businesses: { name: string; slug: string; address: string | null; timezone: string };
  services: { name: string; duration_minutes: number };
  customers: { full_name: string } | null;
}

export default function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("");
  const [data, setData] = useState<ManageData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<"view" | "reschedule" | "cancel" | "done">("view");
  const [doneText, setDoneText] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/manage/${token}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Not found");
        setData(d.appointment as ManageData);
      })
      .catch((e) => setLoadError(e.message));
  }, [token]);

  const tz = data?.businesses.timezone ?? "America/New_York";
  const dates = useMemo(() => nextDates(14, tz), [tz]);

  useEffect(() => {
    if (mode !== "reschedule" || !data || !date) return;
    const q = new URLSearchParams({ serviceId: data.service_id, date });
    if (data.staff_id) q.set("staffId", data.staff_id);
    fetch(`/api/businesses/${data.businesses.slug}/slots?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .catch(() => setSlots([]));
  }, [mode, data, date]);

  async function act(body: Record<string, unknown>, done: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/manage/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      setDoneText(done);
      setMode("done");
    } catch {
      setError("Something went wrong.");
    }
    setBusy(false);
  }

  if (loadError) {
    return (
      <main className="column">
        <div className="error">{loadError}</div>
        <p className="small center">
          If this is the demo business, managing turns on when the live database is connected.
        </p>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="column">
        <p className="small center">Loading your appointment…</p>
      </main>
    );
  }

  const when = `${formatDateInZone(new Date(data.starts_at), tz)} at ${formatTimeInZone(new Date(data.starts_at), tz)}`;

  return (
    <main className="column">
      <p className="eyebrow">{data.businesses.name}</p>
      <h1 style={{ fontSize: 27 }}>Manage your appointment</h1>

      <div className="card">
        <h3>{data.services.name}</h3>
        <p className="small" style={{ margin: 0 }}>
          {when}
          {data.businesses.address ? ` · ${data.businesses.address}` : ""}
          {data.status !== "confirmed" ? ` · ${data.status}` : ""}
        </p>
      </div>

      {error && <div className="error">{error}</div>}

      {mode === "done" && <div className="success">{doneText}</div>}

      {mode === "view" && data.status === "confirmed" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => {
              setDate(dates[0]);
              setMode("reschedule");
            }}
          >
            Reschedule
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => setMode("cancel")}>
            Cancel appointment
          </button>
        </div>
      )}

      {mode === "reschedule" && (
        <div className="card">
          <h2>Pick a new time</h2>
          <div className="day-row">
            {dates.map((d) => (
              <button key={d} className={d === date ? "day selected" : "day"} onClick={() => setDate(d)}>
                {new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date(`${d}T12:00:00Z`))}
                <br />
                {new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(new Date(`${d}T12:00:00Z`))}
              </button>
            ))}
          </div>
          {slots.length === 0 ? (
            <p className="small">No open times that day — try another day.</p>
          ) : (
            <div className="slot-grid">
              {slots.map((s) => (
                <button key={s} className={s === slot ? "slot selected" : "slot"} onClick={() => setSlot(s)}>
                  {formatTimeInZone(new Date(s), tz)}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={() => setMode("view")}>Back</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!slot || busy}
              onClick={() =>
                act(
                  { action: "reschedule", startsAt: slot },
                  `Moved — your new time is ${formatDateInZone(new Date(slot), tz)} at ${formatTimeInZone(new Date(slot), tz)}. Reminders were re-timed for the new appointment.`
                )
              }
            >
              {busy ? "Moving…" : "Confirm new time"}
            </button>
          </div>
        </div>
      )}

      {mode === "cancel" && (
        <div className="card">
          <h2>Cancel this appointment?</h2>
          <p className="small">
            The slot reopens for other customers and your remaining reminders stop.
          </p>
          <label className="field">
            <span>Reason (optional)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Something came up" />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setMode("view")}>Keep it</button>
            <button
              className="btn btn-danger"
              style={{ flex: 1 }}
              disabled={busy}
              onClick={() =>
                act(
                  { action: "cancel", reason: reason || undefined },
                  "Cancelled — the slot has reopened and your reminders have stopped. Hope to see you another time."
                )
              }
            >
              {busy ? "Cancelling…" : "Yes, cancel"}
            </button>
          </div>
        </div>
      )}

      <p className="small center" style={{ marginTop: 16 }}>
        <Link href={`/${data.businesses.slug}`}>← Back to {data.businesses.name}</Link> ·{" "}
        <Link href="/my-appointments">My appointments</Link>
      </p>
    </main>
  );
}
