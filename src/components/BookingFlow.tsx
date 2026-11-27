"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import {
  businessCancelNote,
  formatPhone,
  formatServicePrice,
  visitTypeLabel,
  type Availability,
  type Service,
  type StaffMember,
  type StaffService,
} from "@/lib/types";
import { BOOKING_WINDOW_DAYS, formatDateInZone, formatTimeInZone, nextDates } from "@/lib/slots";
import DatePicker, { type DayState } from "@/components/DatePicker";
import { demoSlotsForDay, sampleReminderPreviews } from "@/lib/demo";
import { generateConfirmationCode } from "@/lib/confirmation";

// Optional account claim shown on the confirmation screen when a guest
// booking just created the customer's account. Booking as a guest needs
// no password: the link in the confirmation text/email always works: 
// but a password lets the customer sign in and see everything in one
// place. This only ever SENDS a set-password email; it never blocks or
// delays the confirmation itself.
function ClaimAccountCard({ email, slug }: { email: string; slug: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function claim() {
    setState("sending");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/set-password?to=/${slug}/my`)}`,
    });
    setState(error ? "error" : "sent");
  }

  return (
    <div className="card center" style={{ marginTop: 16 }}>
      <h2>Your booking is saved</h2>
      <p className="lede">
        The link in your confirmation text and email always works to change
        or cancel, no password needed. Want a password too, so you can sign
        in and see your appointments with this business in one place?
      </p>
      {state === "sent" ? (
        <p className="small">Check your email. We sent you a link to set your password.</p>
      ) : (
        <>
          <button className="btn btn-primary" onClick={claim} disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Set a password for my account"}
          </button>
          {state === "error" && (
            <p className="small" style={{ marginTop: 10 }}>
              That didn&apos;t go through. Please try again in a moment.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function tzAbbrev(d: Date, tz: string): string {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? ""
  );
}

function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Calendar legend per the plan's pictures: tiny example day numbers. */
function CalLegend() {
  return (
    <div className="c3-legend" aria-hidden="true">
      <span className="c3-legend-item">
        <span className="c3-legend-day open">5</span> Open
      </span>
      <span className="c3-legend-item">
        <span className="c3-legend-day">9</span> Closed
      </span>
      <span className="c3-legend-item">
        <span className="c3-legend-day">12</span> Fully booked
      </span>
    </div>
  );
}

const STEP_NAMES = ["Service", "Pick a time", "Your details", "Review"];

// Booking flow: service → time → details → review → confirmed.
// ACCOUNT-FIRST (Frantz, 2026-11-25): the book page gates signed-out
// customers into a short account step (AccountGate) before this flow
// ever renders, so a booking from a business's page always belongs to
// the customer's account WITH THIS BUSINESS: details prefill from
// their profile and nothing account-shaped is asked again here. The
// /api/book guest fallback (account created at checkout) remains only
// for a session that expires mid-flow; the confirmation screen then
// offers (never requires) setting a password via the claim card.
// The database makes double-booking impossible.
//
// Customer Side Plan (Frantz, 2026-11-26): segment-bar progress,
// service + person cards on step 1, a calendar that greys closed and
// fully booked days so they never look bookable, sticky bottom
// actions, a Review with the customer's note and the "Pay at the
// office" line, and the "You're booked!" screen with calendar adds.
export default function BookingFlow({
  slug,
  businessName,
  businessAddress,
  timezone,
  services,
  staff,
  staffServices,
  availability,
  demoMode,
  demoShop,
  preselectedServiceId,
  cancellationPolicy,
  prefill,
}: {
  slug: string;
  businessName: string;
  businessAddress?: string | null;
  timezone: string;
  services: Service[];
  staff: StaffMember[];
  /** Who offers each service (staff_services). A service with rows is
      offered only by those people; no rows = everyone offers it. */
  staffServices?: StaffService[];
  availability?: Availability[];
  demoMode: boolean;
  /** Slug-based demo shop: the whole flow is a local simulation: 
   *  no API calls, no database writes, no messages sent. */
  demoShop?: boolean;
  preselectedServiceId?: string;
  /** The business's own cancellation words (migration 0016), shown
      on the Review when set. Absent before the migration lands. */
  cancellationPolicy?: string | null;
  /** The signed-in member's own details, resolved on the server by
      the book page: step 3 starts filled from their account. The
      client-side profile read below stays as a refresh. */
  prefill?: { name: string; email: string; phone: string } | null;
}) {
  const isDemo = !!demoShop;
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(
    preselectedServiceId && services.some((s) => s.id === preselectedServiceId)
      ? preselectedServiceId
      : services[0]?.id ?? ""
  );
  const [staffId, setStaffId] = useState(staff.length === 1 ? staff[0].id : "");
  const dates = useMemo(() => nextDates(BOOKING_WINDOW_DAYS, timezone), [timezone]);
  const [date, setDate] = useState(dates[0]);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState("");
  const [dayStates, setDayStates] = useState<Record<string, DayState> | null>(null);
  const [signedIn, setSignedIn] = useState(!!prefill);
  const [form, setForm] = useState({
    name: prefill?.name ?? "",
    phone: prefill?.phone ?? "",
    email: prefill?.email ?? "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    demoMode: boolean;
    demoShop?: boolean;
    manageToken?: string;
    accountCreated?: boolean;
    confirmationCode?: string;
    intakeFormName?: string | null;
  } | null>(null);

  const service = services.find((s) => s.id === serviceId);
  const person = staff.find((m) => m.id === staffId);
  const cancelNote = businessCancelNote({ cancellation_policy: cancellationPolicy });

  // Team members who offer the selected service. Unrestricted (no rows
  // for the service) = the whole team.
  const offeringStaff = useMemo(() => {
    const rows = (staffServices ?? []).filter((r) => r.service_id === serviceId);
    if (rows.length === 0) return staff;
    const ids = new Set(rows.map((r) => r.staff_id));
    return staff.filter((m) => ids.has(m.id));
  }, [staffServices, serviceId, staff]);

  // If the picked person doesn't offer the newly picked service, fall
  // back to "First available" instead of showing them empty times.
  useEffect(() => {
    if (staffId && offeringStaff.length > 0 && !offeringStaff.some((m) => m.id === staffId)) {
      setStaffId("");
    }
    if (staffId && offeringStaff.length === 0) setStaffId("");
  }, [staffId, offeringStaff]);

  useEffect(() => {
    // Demo shops stay fully local: no auth read, no profile prefill.
    if (isDemo) return;
    (async () => {
      const supabase = createBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setSignedIn(true);
        const { data } = await supabase
          .from("customers")
          .select("full_name, email, phone")
          .eq("id", user.id)
          .maybeSingle();
        setForm((f) => ({
          ...f,
          name: data?.full_name ?? (user.user_metadata?.full_name as string) ?? "",
          email: data?.email ?? user.email ?? "",
          phone: data?.phone ?? "",
        }));
      }
    })();
  }, [isDemo]);

  // Per-day states for the calendar: closed days must never look
  // bookable. Real businesses ask the day-status route; demo shops
  // classify locally from their sample hours.
  useEffect(() => {
    if (!serviceId) return;
    if (isDemo) {
      const svc = services.find((s) => s.id === serviceId);
      const states: Record<string, DayState> = {};
      for (const d of dates) {
        const daySlots = demoSlotsForDay({
          dateStr: d,
          durationMinutes: svc?.duration_minutes ?? 30,
          availability: availability ?? [],
          staffId: staffId || null,
          timeZone: timezone,
        });
        states[d] = daySlots.length > 0 ? "open" : "closed";
      }
      setDayStates(states);
      return;
    }
    let live = true;
    const q = new URLSearchParams({ serviceId });
    if (staffId) q.set("staffId", staffId);
    fetch(`/api/businesses/${slug}/day-status?${q.toString()}`)
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
  }, [slug, serviceId, staffId, isDemo, services, availability, timezone, dates]);

  // If the chosen day just became closed or full (service or person
  // changed), move to the first open day instead of stranding the
  // customer on a day with no times.
  useEffect(() => {
    if (!dayStates || !date) return;
    if (dayStates[date] === "open" || dayStates[date] === undefined) return;
    const firstOpen = dates.find((d) => dayStates[d] === "open");
    if (firstOpen) setDate(firstOpen);
  }, [dayStates, date, dates]);

  useEffect(() => {
    if (!serviceId || !date) return;
    setSlot("");
    // Demo shops: slots are generated locally from the weekly hours: 
    // the slots API (and its appointments read) is never touched.
    if (isDemo) {
      const svc = services.find((s) => s.id === serviceId);
      setSlots(
        demoSlotsForDay({
          dateStr: date,
          durationMinutes: svc?.duration_minutes ?? 30,
          availability: availability ?? [],
          staffId: staffId || null,
          timeZone: timezone,
        })
      );
      setSlotsLoading(false);
      return;
    }
    // Real fetch: guard against stale responses: a slow reply for a
    // previous day must never overwrite the new day's times (it would
    // offer, and book, the wrong day).
    let live = true;
    setSlots([]);
    setSlotsLoading(true);
    const q = new URLSearchParams({ serviceId, date });
    if (staffId) q.set("staffId", staffId);
    fetch(`/api/businesses/${slug}/slots?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (live) setSlots(d.slots ?? []);
      })
      .catch(() => {
        if (live) setSlots([]);
      })
      .finally(() => {
        if (live) setSlotsLoading(false);
      });
    return () => {
      live = false;
    };
  }, [slug, serviceId, staffId, date, isDemo, services, availability, timezone]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function confirm() {
    // Demo shops: pure simulation. No fetch, no booking, no messages: 
    // just a locally drawn sample confirmation code and the previews.
    if (isDemo) {
      setResult({
        demoMode: false,
        demoShop: true,
        confirmationCode: generateConfirmationCode(),
      });
      setStep(5);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          serviceId,
          staffId: staffId || null,
          startsAt: slot,
          name: form.name,
          phone: form.phone,
          email: form.email,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Booking failed. Please try again.");
        if (res.status === 409) setStep(2);
        setBusy(false);
        return;
      }
      setResult({
        demoMode: !!data.demoMode,
        manageToken: data.appointment?.manageToken,
        accountCreated: !!data.accountCreated,
        confirmationCode: data.appointment?.confirmationCode,
        intakeFormName: data.appointment?.intakeFormName ?? null,
      });
      setStep(5);
    } catch {
      setError("Booking failed. Please try again.");
    }
    setBusy(false);
  }

  // Demo shop confirmation: a SAMPLE screen. Nothing was booked, saved
  // or sent: it shows the visitor exactly what a real customer gets,
  // including the three reminder texts rendered with their details.
  if (step === 5 && result?.demoShop) {
    const when = slot
      ? `${formatDateInZone(new Date(slot), timezone)} at ${formatTimeInZone(new Date(slot), timezone)}`
      : "";
    const previews = sampleReminderPreviews({
      customerName: form.name,
      serviceName: service?.name ?? "Appointment",
      businessName,
      businessAddress: businessAddress ?? null,
      when,
      confirmationCode: result.confirmationCode ?? "AE-SAMPLE",
    });
    return (
      <div>
        <div className="notice" role="note">
          <strong>Demo: no real booking was made.</strong> Nothing was saved,
          and no text or email was sent. This is a sample of what your
          customers would see.
        </div>
        <div className="card center">
          <div style={{ fontSize: 40, marginBottom: 6 }}>✓</div>
          <h2>Sample confirmation</h2>
          <p className="lede">
            {service?.name} at {businessName}
            <br />
            {when}
            <br />
            <span className="small">For {form.name}</span>
          </p>
          {result.confirmationCode && (
            <p style={{ fontSize: 18, margin: "4px 0 10px" }}>
              Confirmation #: <strong>{result.confirmationCode}</strong>{" "}
              <span className="sample-tag">Sample</span>
            </p>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn"
              onClick={() => {
                setResult(null);
                setSlot("");
                setStep(1);
              }}
            >
              Try another time
            </button>
            <Link href={`/${slug}`} className="btn btn-primary">Back to {businessName}</Link>
          </div>
        </div>
        <div className="card">
          <h2>Here&apos;s the text your customer would get</h2>
          <p className="small" style={{ marginTop: 0 }}>
            Every real booking sends these three messages, by text and email
            at the same time. Shown here with your sample details; in the demo
            they are never actually sent.
          </p>
          {previews.map((p) => (
            <div key={p.label} style={{ marginTop: 16 }}>
              <p className="msg-preview-label">{p.label}</p>
              <div className="msg-preview">{p.text}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === 5) {
    const start = slot ? new Date(slot) : null;
    const end = start && service ? new Date(start.getTime() + service.duration_minutes * 60000) : null;
    const whenBig = start
      ? `${formatDateInZone(start, timezone)} · ${formatTimeInZone(start, timezone)} ${tzAbbrev(start, timezone)}`
      : "";
    const calTitle = `${service?.name ?? "Appointment"} at ${businessName}`;
    const googleUrl =
      start && end
        ? "https://calendar.google.com/calendar/render?action=TEMPLATE" +
          `&text=${encodeURIComponent(calTitle)}` +
          `&dates=${icsStamp(start)}/${icsStamp(end)}` +
          (businessAddress ? `&location=${encodeURIComponent(businessAddress)}` : "")
        : "";
    const ics =
      start && end
        ? "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\n" +
          `DTSTART:${icsStamp(start)}\r\nDTEND:${icsStamp(end)}\r\n` +
          `SUMMARY:${calTitle.replace(/[\r\n]/g, " ")}\r\n` +
          (businessAddress ? `LOCATION:${businessAddress.replace(/[\r\n]/g, " ")}\r\n` : "") +
          "END:VEVENT\r\nEND:VCALENDAR"
        : "";
    const icsHref = `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
    const outlookUrl =
      start && end
        ? "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent" +
          `&subject=${encodeURIComponent(calTitle)}` +
          `&startdt=${encodeURIComponent(start.toISOString())}` +
          `&enddt=${encodeURIComponent(end.toISOString())}` +
          (businessAddress ? `&location=${encodeURIComponent(businessAddress)}` : "")
        : "";
    const price = service ? formatServicePrice(service) : "";
    return (
      <div>
        <div className="card center">
          <div className="c3-check" aria-hidden="true">✓</div>
          <h2 style={{ marginTop: 10 }}>You&apos;re booked!</h2>
          {result?.demoMode ? (
            <p className="lede">
              Demo mode: this confirmed on sample data. Nothing was saved, and no
              reminder was sent.
            </p>
          ) : (
            <p className="lede">
              We emailed your confirmation. Reminders come 24 hours and 2 hours
              before, when the booking is made far enough ahead.
            </p>
          )}
          <div className="c3-appt-card">
            <p className="c3-appt-label">Confirmed</p>
            <p className="c3-appt-when">{whenBig}</p>
            <p className="c3-appt-meta">
              {service?.name}
              {service ? ` · ${service.duration_minutes} min` : ""} · {person?.name ?? "First available"}
            </p>
            <p className="c3-appt-meta">
              {businessAddress ? `${businessAddress} · ` : ""}Confirmation{" "}
              <strong>{result?.confirmationCode ?? ""}</strong>
            </p>
            {price && <p className="c3-appt-meta">{price} · Pay at the office</p>}
          </div>
          {start && (
            <>
              <p className="small" style={{ margin: "14px 0 8px" }}>Add to your calendar</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <a className="btn" href={googleUrl} target="_blank" rel="noreferrer">Google</a>
                <a className="btn" href={icsHref} download="appointment.ics">Apple</a>
                <a className="btn" href={outlookUrl} target="_blank" rel="noreferrer">Outlook</a>
              </div>
            </>
          )}
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <Link href={`/${slug}/my`} className="btn btn-primary btn-block" style={{ textAlign: "center" }}>
              Go to my dashboard
            </Link>
            {result?.manageToken && (
              <Link href={`/manage/${result.manageToken}`} className="small">
                Manage this appointment
              </Link>
            )}
            <Link href={`/${slug}`} className="c3-underlink">
              Back to {businessName}
            </Link>
          </div>
        </div>
        {!result?.demoMode && result?.manageToken && result?.intakeFormName && (
          <div className="card center">
            <h2>One more step: a short form</h2>
            <p className="small">
              {businessName} asks customers to fill in the{" "}
              <strong>{result.intakeFormName}</strong> form before their
              visit, and it only takes a couple of minutes.
            </p>
            <Link href={`/manage/${result.manageToken}/form`} className="btn btn-primary">
              Fill in the form
            </Link>
          </div>
        )}
        {result?.accountCreated && !result?.demoMode && (
          <ClaimAccountCard email={form.email} slug={slug} />
        )}
      </div>
    );
  }

  // A business with no services of its own still books: page data
  // supplies the generic default appointment as the service choice
  // (lib/default-service), so this flow never renders an empty
  // service step and never dead-ends (Frantz, 2026-11-26).

  const slotDate = slot ? new Date(slot) : null;
  const reviewWhen = slotDate
    ? `${formatDateInZone(slotDate, timezone)} · ${formatTimeInZone(slotDate, timezone)} ${tzAbbrev(slotDate, timezone)}`
    : "";
  const price = service ? formatServicePrice(service) : "";

  // Sticky bottom action bar for the step (plan: the flow's main
  // button stays pinned at the bottom of the screen).
  const actions = (
    <div className="c3-actions">
      {step > 1 && (
        <button className="btn" onClick={() => setStep(step - 1)}>
          Back
        </button>
      )}
      {step === 1 && (
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={!serviceId} onClick={() => setStep(2)}>
          Continue
        </button>
      )}
      {step === 2 && (
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={!slot} onClick={() => setStep(3)}>
          Continue
        </button>
      )}
      {step === 3 && (
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          disabled={!form.name || !form.phone || !form.email}
          onClick={() => setStep(4)}
        >
          Review booking
        </button>
      )}
      {step === 4 && (
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={confirm}>
          {busy ? "Booking…" : isDemo ? "See sample confirmation" : "Confirm booking"}
        </button>
      )}
    </div>
  );

  return (
    <div className="c3-flow">
      <Link href={`/${slug}`} className="c3-backlink">
        ‹ {businessName}
      </Link>
      <h1 style={{ fontSize: 28, marginTop: 6 }}>Book an appointment</h1>
      <div className="c3-progress" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={n <= step ? "c3-seg on" : "c3-seg"} />
        ))}
      </div>
      <p className="small c3-step-line" style={{ marginBottom: 16 }}>
        Step {step} of 4 · {STEP_NAMES[step - 1]}
      </p>
      {isDemo && (
        <div className="notice" role="note">
          <strong>Demo shop.</strong> Try the whole booking flow. Nothing is
          real: no booking is saved and no messages are sent.
        </div>
      )}
      {error && <div className="error">{error}</div>}

      {step === 1 && (
        <>
          <div className="card">
            <h2>What do you need?</h2>
            <div className="c3-service-list">
              {services.map((s) => {
                const meta = [
                  `${s.duration_minutes} min`,
                  formatServicePrice(s),
                  visitTypeLabel(s.visit_type),
                ]
                  .filter(Boolean)
                  .join(" · ");
                const chosen = s.id === serviceId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={chosen ? "c3-service-card sel" : "c3-service-card"}
                    onClick={() => setServiceId(s.id)}
                    aria-pressed={chosen}
                  >
                    <span className="c3-service-main">
                      <span className="service-name">{s.name}</span>
                      <span className="service-meta">{meta}</span>
                    </span>
                    <span className={chosen ? "c3-radio on" : "c3-radio"} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            {staff.length > 1 && (
              <>
                <h3 style={{ margin: "20px 0 10px" }}>Who would you like to see?</h3>
                <div className="c3-people">
                  <button
                    type="button"
                    className={staffId === "" ? "c3-person sel" : "c3-person"}
                    onClick={() => setStaffId("")}
                    aria-pressed={staffId === ""}
                  >
                    <span className="c3-avatar">Any</span>
                    <span className="c3-person-name">First available</span>
                    <span className="c3-person-sub">Fastest</span>
                  </button>
                  {offeringStaff.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={staffId === m.id ? "c3-person sel" : "c3-person"}
                      onClick={() => setStaffId(m.id)}
                      aria-pressed={staffId === m.id}
                    >
                      <span className="c3-avatar">
                        {m.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                      <span className="c3-person-name">{m.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {actions}
        </>
      )}

      {step === 2 && (
        <>
          <div className="card">
            <div className="c3-chosen">
              <p style={{ margin: 0 }}>
                <strong>{service?.name}</strong>
                <span className="small"> · with {person?.name ?? "First available"}</span>
              </p>
              <button type="button" className="c3-underlink" onClick={() => setStep(1)}>
                Change
              </button>
            </div>
            <DatePicker
              dates={dates}
              value={date}
              onChange={setDate}
              timeZone={timezone}
              dayStates={dayStates ?? undefined}
            />
            <CalLegend />
            <p className="small" style={{ margin: "12px 0 8px" }}>
              Times in {date ? tzAbbrev(new Date(`${date}T12:00:00Z`), timezone) : timezone}
            </p>
            {slotsLoading ? (
              <p className="small">Loading times…</p>
            ) : slots.length === 0 ? (
              <p className="small">No open times that day. Try another day.</p>
            ) : (
              <div className="c3-times">
                {slots.map((s) => (
                  <button key={s} className={s === slot ? "slot selected" : "slot"} onClick={() => setSlot(s)}>
                    {formatTimeInZone(new Date(s), timezone)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {actions}
        </>
      )}

      {step === 3 && (
        <>
          <div className="card">
            <h2>Your details</h2>
            {signedIn && !isDemo && (
              <p className="small" style={{ marginTop: -4, marginBottom: 14 }}>
                Filled in from your account. Change anything if needed.
              </p>
            )}
            <label className="field">
              <span>Full name</span>
              <input required value={form.name} onChange={set("name")} autoComplete="name" />
            </label>
            <label className="field">
              <span>Mobile number</span>
              <input type="tel" required value={form.phone} onChange={set("phone")} autoComplete="tel" />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
            </label>
            {isDemo && (
              <p className="small" style={{ fontWeight: 400 }}>
                Demo only. Use any name and number you like. Nothing is saved
                or sent, and no account is created.
              </p>
            )}
            {!signedIn && !isDemo && (
              <p className="small" style={{ fontWeight: 400 }}>
                You&apos;re not signed in.{" "}
                <Link href={`/login?next=/${slug}/book`}>Sign in</Link> so this
                booking lands in your dashboard with {businessName}.
              </p>
            )}
            <label className="field">
              <span>Note for the office (optional)</span>
              <textarea value={form.notes} onChange={set("notes")} style={{ minHeight: 56 }} />
            </label>
          </div>
          {actions}
        </>
      )}

      {step === 4 && (
        <>
          <div className="card">
            <h2>Review</h2>
            <div className="c3-review">
              <div className="c3-review-row">
                <span>Service</span>
                <strong>{service?.name}</strong>
              </div>
              <div className="c3-review-row">
                <span>When</span>
                <strong>{reviewWhen}</strong>
              </div>
              <div className="c3-review-row">
                <span>With</span>
                <strong>{person?.name ?? "First available"}</strong>
              </div>
              <div className="c3-review-row">
                <span>Where</span>
                <strong>{businessAddress || visitTypeLabel(service?.visit_type)}</strong>
              </div>
              {/* No Price row at all when the service has no price
                  (Frantz, 2026-11-26): a bare dash reads as broken,
                  and the "Nothing to pay online" line below covers
                  it. Priced services keep their row exactly as before. */}
              {price ? (
                <div className="c3-review-row">
                  <span>Price</span>
                  <strong>{price}</strong>
                </div>
              ) : null}
              <div className="c3-review-row">
                <span>You</span>
                <strong className="c3-review-stack">
                  <span>{form.name}</span>
                  <span>{formatPhone(form.phone)}</span>
                  <span>{form.email}</span>
                </strong>
              </div>
            </div>
            {form.notes.trim() ? (
              <div className="c3-note-box">
                <div className="c3-note-head">
                  <span>Your note</span>
                  <button type="button" className="c3-underlink" onClick={() => setStep(3)}>
                    Edit note
                  </button>
                </div>
                <p style={{ margin: 0 }}>{form.notes}</p>
              </div>
            ) : (
              <div className="c3-note-box">
                No note for the office.{" "}
                <button type="button" className="c3-underlink" onClick={() => setStep(3)}>
                  Add a note
                </button>
              </div>
            )}
            {isDemo ? (
              <p className="small c3-info-box">
                This is the demo. Nothing will be booked or sent. On the next
                screen you&apos;ll see a sample confirmation and the exact
                reminder texts your customer would get.
              </p>
            ) : (
              <>
                <p className="small c3-info-box">
                  We&apos;ll email a confirmation now, then reminders 24 hours and 2 hours
                  before, when the booking is made far enough ahead, each with a
                  link to reschedule or cancel.
                </p>
                {cancelNote && <p className="small c3-info-box">{cancelNote}</p>}
                <p className="c3-info-box" style={{ fontWeight: 600 }}>
                  Nothing to pay online. You pay at the office.
                </p>
              </>
            )}
          </div>
          {actions}
        </>
      )}

      {demoMode && step < 5 && (
        <p className="small center">Demo business. The flow works end to end on sample data; nothing is saved yet.</p>
      )}
    </div>
  );
}
