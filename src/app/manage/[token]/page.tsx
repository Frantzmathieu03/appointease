"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BOOKING_WINDOW_DAYS, formatDateInZone, formatTimeInZone, nextDates } from "@/lib/slots";
import { DEFAULT_CANCEL_NOTE, formatPhone } from "@/lib/types";
import DatePicker, { type DayState } from "@/components/DatePicker";

// Secure manage page — the link from every confirmation/reminder.
// The token in the URL is the credential; no account needed.
// Branding (PDF §5): this page carries the BUSINESS's logo, name and
// phone only — no AppointEase menu (the root chrome hides itself here)
// and just a small "Powered by AppointEase" line at the bottom. The
// cancel flow keeps [Keep appointment] as the primary action, and no
// copy anywhere mentions deposits or refunds — AppointEase never holds
// client money.
//
// Customer Side Plan (Frantz, 2026-11-26): the reschedule and cancel
// screens follow the Book / Reschedule / Cancel plan — a NOW strip
// with the current time struck through, the business's cut-off rule,
// reason chips and a friendly policy note on cancel, and "All set!" /
// "Appointment cancelled" endings. After a reschedule the page's own
// summary shows the NEW time immediately (the appointment state is
// updated in place — no refresh needed). The same screens serve the
// My dashboard buttons, which link here.
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

interface ManageSettings {
  cancellationPolicy: string | null;
  rescheduleCutoffHours: number;
  cancelWindowHours: number;
}

const REASONS = ["Schedule conflict", "Feeling sick", "No longer needed", "Other"];

function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function dateStrInZone(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function tzAbbrev(d: Date, tz: string): string {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? ""
  );
}

export default function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("");
  const [data, setData] = useState<ManageData | null>(null);
  const [settings, setSettings] = useState<ManageSettings | null>(null);
  const [intake, setIntake] = useState<{ formName: string; submitted: boolean } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<"view" | "reschedule" | "cancel" | "done">("view");
  const [doneKind, setDoneKind] = useState<"cancelled" | "rescheduled">("rescheduled");
  const [newStart, setNewStart] = useState("");
  const [oldStart, setOldStart] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [dayStates, setDayStates] = useState<Record<string, DayState> | null>(null);

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
        setIntake(d.intake ?? null);
        setSettings((d.settings as ManageSettings | null) ?? null);
      })
      .catch((e) => setLoadError(e.message));
  }, [token]);

  const tz = data?.businesses.timezone ?? "America/New_York";
  const dates = useMemo(() => nextDates(BOOKING_WINDOW_DAYS, tz), [tz]);

  useEffect(() => {
    if (mode !== "reschedule" || !data || !date) return;
    // Same stale-response guard as the booking flow: a slow reply for
    // a previous day must never overwrite the new day's times.
    let live = true;
    setSlots([]);
    const q = new URLSearchParams({ serviceId: data.service_id, date });
    if (data.staff_id) q.set("staffId", data.staff_id);
    fetch(`/api/businesses/${data.businesses.slug}/slots?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (live) setSlots(d.slots ?? []);
      })
      .catch(() => {
        if (live) setSlots([]);
      });
    return () => {
      live = false;
    };
  }, [mode, data, date]);

  // Day states for the reschedule calendar (closed days grey, the
  // appointment's current day dashed).
  useEffect(() => {
    if (mode !== "reschedule" || !data) return;
    const q = new URLSearchParams({ serviceId: data.service_id });
    if (data.staff_id) q.set("staffId", data.staff_id);
    let live = true;
    fetch(`/api/businesses/${data.businesses.slug}/day-status?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (live && d.states) setDayStates(d.states as Record<string, DayState>);
      })
      .catch(() => {
        if (live) setDayStates(null);
      });
    return () => {
      live = false;
    };
  }, [mode, data]);

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
      if (kind === "rescheduled") {
        setNewStart(slot);
        // Remember the old time for the "All set!" screen's struck
        // line before the appointment state moves to the new time.
        setOldStart(data?.starts_at ?? "");
        // The summary must show the NEW time without a refresh (the
        // share-link test caught the old time lingering): update the
        // appointment in place.
        setData((prev) =>
          prev
            ? {
                ...prev,
                starts_at: slot,
                ends_at: new Date(
                  new Date(slot).getTime() + prev.services.duration_minutes * 60000
                ).toISOString(),
              }
            : prev
        );
      }
      if (kind === "cancelled") {
        setData((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
      }
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
        <div className="card center" style={{ marginTop: 24 }}>
          <h2>We couldn&apos;t find that appointment</h2>
          <p className="lede" style={{ marginBottom: 0 }}>
            This page doesn&apos;t exist. Check the link, or contact the business.
          </p>
        </div>
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
  const startDate = new Date(data.starts_at);
  const when = `${formatDateInZone(startDate, tz)} at ${formatTimeInZone(startDate, tz)}`;
  const whenShort = `${formatDateInZone(startDate, tz)} · ${formatTimeInZone(startDate, tz)} ${tzAbbrev(startDate, tz)}`;
  const withWhom = data.staff?.name ?? "First available";
  const staffFirst = data.staff?.name?.trim().split(/\s+/)[0] ?? "";
  const tzLabel = tzAbbrev(startDate, tz);
  const currentDay = dateStrInZone(startDate, tz);

  const cutoffHours = settings?.rescheduleCutoffHours ?? 12;
  const insideCutoff =
    data.status === "confirmed" &&
    startDate.getTime() - Date.now() < cutoffHours * 3600000;
  const policyWords = (settings?.cancellationPolicy ?? "").trim();
  const policyText = policyWords || DEFAULT_CANCEL_NOTE;

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
  const outlookUrl =
    "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent" +
    `&subject=${encodeURIComponent(calTitle)}` +
    `&startdt=${encodeURIComponent(calStart.toISOString())}` +
    `&enddt=${encodeURIComponent(calEnd.toISOString())}` +
    (biz.address ? `&location=${encodeURIComponent(biz.address)}` : "");

  const calendarButtons = (label: string) => (
    <>
      <p className="small" style={{ margin: "14px 0 8px" }}>{label}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <a className="btn" href={googleUrl} target="_blank" rel="noreferrer">
          Google
        </a>
        <a className="btn" href={icsHref} download="appointment.ics">
          Apple
        </a>
        <a className="btn" href={outlookUrl} target="_blank" rel="noreferrer">
          Outlook
        </a>
      </div>
    </>
  );

  const sameSlot = slot !== "" && new Date(slot).getTime() === new Date(data.starts_at).getTime();
  const newWhen = slot
    ? `${formatDateInZone(new Date(slot), tz)} · ${formatTimeInZone(new Date(slot), tz)}`
    : "";

  const openReschedule = () => {
    setDate(dates[0]);
    setSlot("");
    setError("");
    setMode("reschedule");
  };

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
              <a href={`tel:${biz.phone}`}>{formatPhone(biz.phone)}</a>
            </p>
          )}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {mode === "done" && doneKind === "rescheduled" && (
        <div className="card center">
          <div className="c3-check" aria-hidden="true">✓</div>
          <h2 style={{ marginTop: 10 }}>All set!</h2>
          <p className="lede">
            Your appointment moved. We updated your reminders
            {staffFirst ? <> and let {staffFirst} know</> : <> and let the office know</>}.
          </p>
          <p className="c3-moved-line">
            <span className="strike">
              {oldStart
                ? `${formatDateInZone(new Date(oldStart), tz)} at ${formatTimeInZone(new Date(oldStart), tz)}`
                : when}
            </span>{" "}
            <span aria-hidden="true">→</span>
          </p>
          <div className="c3-appt-card">
            <p className="c3-appt-label">New time</p>
            <p className="c3-appt-when">
              {formatDateInZone(calStart, tz)} · {formatTimeInZone(calStart, tz)} {tzAbbrev(calStart, tz)}
            </p>
            <p className="c3-appt-meta">
              {data.services.name} · with {withWhom}
              {biz.address ? ` · ${biz.address}` : ""}
            </p>
          </div>
          {calendarButtons("Update your calendar")}
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <Link href={`/${biz.slug}/my`} className="btn btn-primary btn-block" style={{ textAlign: "center" }}>
              Back to my dashboard
            </Link>
            <Link href={`/${biz.slug}`} className="c3-underlink">
              Back to {biz.name}
            </Link>
          </div>
        </div>
      )}

      {mode === "done" && doneKind === "cancelled" && (
        <div className="card center">
          <div className="c3-check grey" aria-hidden="true">×</div>
          <h2 style={{ marginTop: 10 }}>Appointment cancelled</h2>
          <p className="lede">
            Your reminders are stopped and the office has been told.
          </p>
          <div className="c3-appt-card">
            <p className="c3-appt-label">Cancelled</p>
            <p className="c3-appt-when strike">{whenShort}</p>
            <p className="c3-appt-meta">
              {data.services.name} · with {withWhom}
            </p>
          </div>
          <p style={{ margin: "16px 0 10px", fontWeight: 600 }}>Need a different time?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <Link href={`/${biz.slug}/book`} className="btn btn-primary btn-block" style={{ textAlign: "center" }}>
              Book a new time
            </Link>
            <Link href={`/${biz.slug}/my`} className="btn btn-block" style={{ textAlign: "center" }}>
              Back to my dashboard
            </Link>
          </div>
        </div>
      )}

      {mode !== "done" && (
        <>
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
        </>
      )}

      {mode === "view" && intake && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{intake.formName}</h3>
          {intake.submitted ? (
            <p className="small" style={{ margin: 0 }}>
              ✓ You&apos;ve sent your form — {biz.name} has your answers.
            </p>
          ) : (
            <>
              <p className="small" style={{ margin: "0 0 10px" }}>
                {biz.name} asks you to fill in this short form before your
                visit.
              </p>
              <Link href={`/manage/${token}/form`} className="btn btn-primary">
                Fill in the form
              </Link>
            </>
          )}
        </div>
      )}

      {mode === "view" && data.status === "confirmed" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={openReschedule}>
            Reschedule
          </button>
          <button className="btn btn-outline-danger" style={{ flex: 1 }} onClick={() => setMode("cancel")}>
            Cancel appointment
          </button>
        </div>
      )}

      {mode === "reschedule" && (
        <div className="card">
          <h2>Pick a new time</h2>
          <div className="c3-now">
            <span className="c3-now-label">Now</span>
            <span className="strike" style={{ fontWeight: 600 }}>{when}</span>
            <span className="small" style={{ marginLeft: "auto" }}>{withWhom}</span>
          </div>
          {insideCutoff ? (
            <>
              <p className="small" style={{ marginTop: 14 }}>
                Your appointment is inside {cutoffHours} hours, so times can&apos;t
                be changed online anymore.
              </p>
              {biz.phone ? (
                <a href={`tel:${biz.phone}`} className="btn btn-primary btn-block" style={{ textAlign: "center", marginTop: 6 }}>
                  Call the office to reschedule
                </a>
              ) : (
                <p style={{ fontWeight: 600, marginTop: 6 }}>Call the office to reschedule</p>
              )}
              <p className="center" style={{ marginTop: 14 }}>
                <button type="button" className="c3-underlink" onClick={() => setMode("view")}>
                  Keep current time
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="small">
                Free to reschedule up to {cutoffHours} hours before. Your reminders move with it.
              </p>
              <DatePicker
                dates={dates}
                value={date}
                onChange={(d) => {
                  setDate(d);
                  setSlot("");
                }}
                timeZone={tz}
                dayStates={dayStates ?? undefined}
                markedDate={currentDay}
              />
              <p className="small" style={{ margin: "4px 0 8px" }}>
                Times in {tzLabel}
              </p>
              {slots.length === 0 ? (
                <p className="small">No open times that day — try another day.</p>
              ) : (
                <div className="c3-times">
                  {slots.map((s) => (
                    <button key={s} className={s === slot ? "slot selected" : "slot"} onClick={() => setSlot(s)}>
                      {formatTimeInZone(new Date(s), tz)}
                    </button>
                  ))}
                </div>
              )}
              {slot && !sameSlot && (
                <div className="c3-newtime-strip">New time: {newWhen}</div>
              )}
              {sameSlot && (
                <p className="small" style={{ marginTop: 10 }}>
                  That&apos;s your current time — pick a different one to move the appointment.
                </p>
              )}
              <div className="c3-actions" style={{ marginTop: 16 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={!slot || sameSlot || busy}
                  onClick={() => act({ action: "reschedule", startsAt: slot }, "rescheduled")}
                >
                  {busy ? "Moving…" : "Confirm new time"}
                </button>
              </div>
              <p className="center" style={{ marginTop: 12, marginBottom: 0 }}>
                <button type="button" className="c3-underlink" onClick={() => setMode("view")}>
                  Keep current time
                </button>
              </p>
            </>
          )}
        </div>
      )}

      {mode === "cancel" && (
        <div className="card">
          <h2>Cancel this appointment?</h2>
          <div className="c3-appt-card" style={{ textAlign: "left" }}>
            <p className="c3-appt-label">Your appointment</p>
            <p className="c3-appt-when" style={{ fontSize: 19 }}>{whenShort}</p>
            <p className="c3-appt-meta">
              {data.services.name} · with {withWhom}
              {biz.address ? ` · ${biz.address}` : ""}
            </p>
          </div>
          <div className="c3-policy">
            {policyWords && <p className="c3-policy-head">A note from {biz.name}</p>}
            <p style={{ margin: 0 }}>{policyText}</p>
          </div>
          <p className="small" style={{ fontWeight: 600, margin: "16px 0 8px" }}>
            Reason (optional)
          </p>
          <div className="c3-chips">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                className={reason === r ? "c3-chip sel" : "c3-chip"}
                onClick={() => setReason(reason === r ? "" : r)}
                aria-pressed={reason === r}
              >
                {r}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            <button className="btn btn-primary btn-block" onClick={() => setMode("view")}>
              Keep appointment
            </button>
            <button className="btn btn-block" onClick={openReschedule}>
              Reschedule instead
            </button>
            <button
              className="btn btn-block c3-btn-cancel"
              disabled={busy}
              onClick={() => act({ action: "cancel", reason: reason || undefined }, "cancelled")}
            >
              {busy ? "Cancelling…" : "Yes, cancel"}
            </button>
          </div>
        </div>
      )}

      {mode !== "done" && (
        <p className="small center" style={{ marginTop: 16 }}>
          <Link href={`/${biz.slug}`}>← Back to {biz.name}</Link>
        </p>
      )}
      {poweredBy}
    </main>
  );
}
