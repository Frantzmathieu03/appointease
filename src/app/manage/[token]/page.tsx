"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BOOKING_WINDOW_DAYS, formatDateInZone, formatTimeInZone, nextDates } from "@/lib/slots";
import DatePicker from "@/components/DatePicker";

// Secure manage page — the link from every confirmation/reminder.
// The token in the URL is the credential; no account needed.
// Branding (PDF §5): this page carries the BUSINESS's logo, name and
// phone only — no AppointEase menu (the root chrome hides itself here)
// and just a small "Powered by AppointEase" line at the bottom. The
// cancel flow keeps [Keep appointment] as the primary action, and no
// copy anywhere mentions deposits or refunds — AppointEase never holds
// client money.
interface ManageData {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  staff_id: string | null;
  service_id: string;
  confirmation_code: string | null;
  businesses: {
    name: string;
    slug: string;
    address: string | null;
    timezone: string;
    logo_url: string | null;
    phone: string | null;
  };
  services: { name: string; duration_minutes: number };
  customers: { full_name: string } | null;
  staff: { name: string } | null;
}

function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export default function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("");
  const [data, setData] = useState<ManageData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<"view" | "reschedule" | "cancel" | "done">("view");
  const [doneKind, setDoneKind] = useState<"cancelled" | "rescheduled">("rescheduled");
  const [newStart, setNewStart] = useState("");
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
  const dates = useMemo(() => nextDates(BOOKING_WINDOW_DAYS, tz), [tz]);

  useEffect(() => {
    if (mode !== "reschedule" || !data || !date) return;
    const q = new URLSearchParams({ serviceId: data.service_id, date });
    if (data.staff_id) q.set("staffId", data.staff_id);
    fetch(`/api/businesses/${data.businesses.slug}/slots?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .catch(() => setSlots([]));
  }, [mode, data, date]);

  async function act(body: Record<string, unknown>, kind: "cancelled" | "rescheduled") {
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
      setDoneKind(kind);
      if (kind === "rescheduled") setNewStart(slot);
      setMode("done");
    } catch {
      setError("Something went wrong.");
    }
    setBusy(false);
  }

  const poweredBy = (
    <p className="small center" style={{ marginTop: 22, color: "var(--muted)" }}>
      Powered by AppointEase
    </p>
  );

  if (loadError) {
    return (
      <main className="column">
        <div className="error">{loadError}</div>
        {poweredBy}
      </main>
    );
  }
  if (!data) {
    return (
      <main className="column">
        <p className="small center">Loading your appointment…</p>
        {poweredBy}
      </main>
    );
  }

  const biz = data.businesses;
  const when = `${formatDateInZone(new Date(data.starts_at), tz)} at ${formatTimeInZone(new Date(data.starts_at), tz)}`;
  const withWhom = data.staff?.name ?? "First available";
  const tzLabel = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(new Date(data.starts_at))
    .find((p) => p.type === "timeZoneName")?.value ?? tz;

  // Add-to-calendar links for the (possibly new) appointment time.
  const calStart = new Date(mode === "done" && doneKind === "rescheduled" && newStart ? newStart : data.starts_at);
  const calEnd = new Date(calStart.getTime() + data.services.duration_minutes * 60000);
  const calTitle = `${data.services.name} at ${biz.name}`;
  const googleUrl =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(calTitle)}` +
    `&dates=${icsStamp(calStart)}/${icsStamp(calEnd)}` +
    (biz.address ? `&location=${encodeURIComponent(biz.address)}` : "");
  const ics =
    "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\n" +
    `DTSTART:${icsStamp(calStart)}\r\nDTEND:${icsStamp(calEnd)}\r\n` +
    `SUMMARY:${calTitle.replace(/[\r\n]/g, " ")}\r\n` +
    (biz.address ? `LOCATION:${biz.address.replace(/[\r\n]/g, " ")}\r\n` : "") +
    "END:VEVENT\r\nEND:VCALENDAR";
  const icsHref = `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;

  const sameSlot = slot !== "" && new Date(slot).getTime() === new Date(data.starts_at).getTime();

  return (
    <main className="column">
      {/* Business branding header — logo, name, phone (PDF §5). */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        {biz.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={biz.logo_url}
            alt={`${biz.name} logo`}
            width={48}
            height={48}
            style={{ borderRadius: 12, objectFit: "cover" }}
          />
        )}
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>{biz.name}</p>
          {biz.phone && (
            <p className="small" style={{ margin: 0 }}>
              <a href={`tel:${biz.phone}`}>{biz.phone}</a>
            </p>
          )}
        </div>
      </div>
      <h1 style={{ fontSize: 27 }}>Manage your appointment</h1>
      {data.confirmation_code && (
        <p className="small" style={{ marginTop: -6 }}>
          Confirmation #: <strong>{data.confirmation_code}</strong> — this is
          the booking you&apos;re changing.
        </p>
      )}

      <div className="card">
        <h3>{data.services.name}</h3>
        <p className="small" style={{ margin: 0 }}>
          {when} ({tzLabel}) · with {withWhom}
          {biz.address ? ` · ${biz.address}` : ""}
          {data.status !== "confirmed" ? ` · ${data.status}` : ""}
        </p>
      </div>

      {error && <div className="error">{error}</div>}

      {mode === "done" && doneKind === "rescheduled" && (
        <div className="card">
          <div className="success" style={{ marginBottom: 10 }}>
            You&apos;re all set for{" "}
            {formatDateInZone(calStart, tz)} at {formatTimeInZone(calStart, tz)}. Reminders
            were re-timed for the new appointment.
          </div>
          <p className="small" style={{ margin: "0 0 8px" }}>Add it to your calendar:</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="btn" href={googleUrl} target="_blank" rel="noreferrer">
              Google Calendar
            </a>
            <a className="btn" href={icsHref} download="appointment.ics">
              Apple Calendar
            </a>
            <a className="btn" href={icsHref} download="appointment.ics">
              Outlook
            </a>
          </div>
        </div>
      )}

      {mode === "done" && doneKind === "cancelled" && (
        <div className="card">
          <div className="success" style={{ marginBottom: 10 }}>
            Cancelled — the slot has reopened and your reminders have stopped.
            Hope to see you another time.
          </div>
          <Link href={`/${biz.slug}`} className="btn btn-primary">
            Book a new time
          </Link>
        </div>
      )}

      {mode === "view" && data.status === "confirmed" && (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => {
                setDate(dates[0]);
                setSlot("");
                setMode("reschedule");
              }}
            >
              Reschedule
            </button>
            <button className="btn btn-outline-danger" style={{ flex: 1 }} onClick={() => setMode("cancel")}>
              Cancel appointment
            </button>
          </div>
          <p className="small center" style={{ marginTop: 10 }}>
            Need a different time instead?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setDate(dates[0]);
                setSlot("");
                setMode("reschedule");
              }}
            >
              Reschedule
            </a>{" "}
            keeps your spot with {biz.name}.
          </p>
        </>
      )}

      {mode === "reschedule" && (
        <div className="card">
          <h2>Pick a new time</h2>
          <p className="small">
            With {withWhom} · times shown in {tzLabel}. You can reschedule any
            time before your appointment — just pick a different time below.
          </p>
          <DatePicker dates={dates} value={date} onChange={(d) => { setDate(d); setSlot(""); }} timeZone={tz} />
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
          {sameSlot && (
            <p className="small">That&apos;s your current time — pick a different one to move the appointment.</p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={() => setMode("view")}>Back</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!slot || sameSlot || busy}
              onClick={() => act({ action: "reschedule", startsAt: slot }, "rescheduled")}
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
            Your time slot reopens for other customers and your remaining
            reminders stop. Need a different time instead?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setDate(dates[0]);
                setSlot("");
                setMode("reschedule");
              }}
            >
              Reschedule instead
            </a>
            .
          </p>
          <label className="field">
            <span>Reason (optional)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Something came up" />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setMode("view")}>
              Keep appointment
            </button>
            <button
              className="btn btn-outline-danger"
              style={{ flex: 1 }}
              disabled={busy}
              onClick={() => act({ action: "cancel", reason: reason || undefined }, "cancelled")}
            >
              {busy ? "Cancelling…" : "Yes, cancel"}
            </button>
          </div>
        </div>
      )}

      <p className="small center" style={{ marginTop: 16 }}>
        <Link href={`/${biz.slug}`}>← Back to {biz.name}</Link>
      </p>
      {poweredBy}
    </main>
  );
}
