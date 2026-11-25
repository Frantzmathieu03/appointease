"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import {
  formatPhone,
  formatPrice,
  visitTypeLabel,
  type Availability,
  type Service,
  type StaffMember,
  type StaffService,
} from "@/lib/types";
import { BOOKING_WINDOW_DAYS, formatDateInZone, formatTimeInZone, nextDates } from "@/lib/slots";
import DatePicker from "@/components/DatePicker";
import { demoSlotsForDay, sampleReminderPreviews } from "@/lib/demo";
import { generateConfirmationCode } from "@/lib/confirmation";

// Optional account claim shown on the confirmation screen when a guest
// booking just created the customer's account. Booking as a guest needs
// no password — the link in the confirmation text/email always works —
// but a password lets the customer sign in and see everything in one
// place. This only ever SENDS a set-password email; it never blocks or
// delays the confirmation itself.
function ClaimAccountCard({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function claim() {
    setState("sending");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/set-password")}`,
    });
    setState(error ? "error" : "sent");
  }

  return (
    <div className="card center" style={{ marginTop: 16 }}>
      <h2>Your booking is saved</h2>
      <p className="lede">
        The link in your confirmation text and email always works to change
        or cancel — no password needed. Want a password too, so you can sign
        in and see all your appointments in one place?
      </p>
      {state === "sent" ? (
        <p className="small">Check your email — we sent you a link to set your password.</p>
      ) : (
        <>
          <button className="btn btn-primary" onClick={claim} disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Set a password for my account"}
          </button>
          {state === "error" && (
            <p className="small" style={{ marginTop: 10 }}>
              That didn&apos;t go through — please try again in a moment.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// Booking flow: service → time → details → review → confirmed.
// Signed-in customers skip the account fields; new customers book as
// guests — no password is ever asked for. The /api/book route creates
// their one AppointEase account behind the scenes, they manage the
// booking through the link in their confirmation text/email, and the
// confirmation screen offers (never requires) setting a password.
// The database makes double-booking impossible.
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
  /** Slug-based demo shop: the whole flow is a local simulation —
   *  no API calls, no database writes, no messages sent. */
  demoShop?: boolean;
  preselectedServiceId?: string;
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
  const [signedIn, setSignedIn] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
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

  useEffect(() => {
    if (!serviceId || !date) return;
    setSlot("");
    // Demo shops: slots are generated locally from the weekly hours —
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
    setSlotsLoading(true);
    const q = new URLSearchParams({ serviceId, date });
    if (staffId) q.set("staffId", staffId);
    fetch(`/api/businesses/${slug}/slots?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [slug, serviceId, staffId, date, isDemo, services, availability, timezone]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function confirm() {
    // Demo shops: pure simulation. No fetch, no booking, no messages —
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
        setError(data.error ?? "Booking failed — please try again.");
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
      setError("Booking failed — please try again.");
    }
    setBusy(false);
  }

  // Demo shop confirmation: a SAMPLE screen. Nothing was booked, saved
  // or sent — it shows the visitor exactly what a real customer gets,
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
          <strong>Demo — no real booking was made.</strong> Nothing was saved,
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
            Every real booking sends these three messages — by text and email
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
    return (
      <div>
        <div className="card center">
          <div style={{ fontSize: 40, marginBottom: 6 }}>✓</div>
          <h2>You&apos;re booked!</h2>
          <p className="lede">
            {service?.name} at {businessName}
            <br />
            {slot && (
              <>
                {formatDateInZone(new Date(slot), timezone)} at {formatTimeInZone(new Date(slot), timezone)}
              </>
            )}
          </p>
          {result?.confirmationCode && (
            <p style={{ fontSize: 18, margin: "4px 0 10px" }}>
              Confirmation #: <strong>{result.confirmationCode}</strong>
              <br />
              <span className="small">Keep it handy — quote it if you call the business.</span>
            </p>
          )}
          {result?.demoMode ? (
            <p className="small">
              Demo mode: this confirmed on sample data — nothing was saved, and no
              reminder was sent. Once the live database is connected, bookings save
              for real and the confirmation + 24 h + 2 h reminders (when the
              booking is made far enough ahead) go out by text and email.
            </p>
          ) : (
            <p className="small">
              A confirmation is on its way, with reminders 24 hours and 2 hours
              before (when the booking is made far enough ahead) — each with a
              link to reschedule or cancel.
            </p>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {result?.manageToken && (
              <Link href={`/manage/${result.manageToken}`} className="btn">Manage this appointment</Link>
            )}
            <Link href="/my-appointments" className="btn btn-primary">My appointments</Link>
            <Link href={`/${slug}`} className="btn">Back to {businessName}</Link>
          </div>
        </div>
        {!result?.demoMode && result?.manageToken && result?.intakeFormName && (
          <div className="card center">
            <h2>One more step: a short form</h2>
            <p className="small">
              {businessName} asks customers to fill in the{" "}
              <strong>{result.intakeFormName}</strong> form before their
              visit — it only takes a couple of minutes.
            </p>
            <Link href={`/manage/${result.manageToken}/form`} className="btn btn-primary">
              Fill in the form
            </Link>
          </div>
        )}
        {result?.accountCreated && !result?.demoMode && (
          <ClaimAccountCard email={form.email} />
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow">{businessName}</p>
      <h1 style={{ fontSize: 28 }}>Book an appointment</h1>
      <p className="small" style={{ marginBottom: 16 }}>
        Step {step} of 4 — {["Choose a service", "Pick a time", "Your details", "Review"][step - 1]}
      </p>
      {isDemo && (
        <div className="notice" role="note">
          <strong>Demo shop</strong> — try the whole booking flow. Nothing is
          real: no booking is saved and no messages are sent.
        </div>
      )}
      {error && <div className="error">{error}</div>}

      {step === 1 && (
        <div className="card">
          <h2>Service</h2>
          {services.map((s) => (
            <div key={s.id} className="service-row">
              <div>
                <div className="service-name">{s.name}</div>
                <div className="service-meta">
                  {s.duration_minutes} min · {formatPrice(s.price_cents)} · {visitTypeLabel(s.visit_type)}
                </div>
              </div>
              <button
                className={s.id === serviceId ? "btn btn-primary" : "btn"}
                style={{ padding: "8px 14px" }}
                onClick={() => setServiceId(s.id)}
              >
                {s.id === serviceId ? "Selected" : "Select"}
              </button>
            </div>
          ))}
          {staff.length > 1 && (
            <label className="field" style={{ marginTop: 14 }}>
              <span>With</span>
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">First available</option>
                {offeringStaff.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
          )}
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={!serviceId} onClick={() => setStep(2)}>
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2>Pick a time</h2>
          <DatePicker dates={dates} value={date} onChange={setDate} timeZone={timezone} />
          {slotsLoading ? (
            <p className="small">Loading times…</p>
          ) : slots.length === 0 ? (
            <p className="small">No open times that day — try another day.</p>
          ) : (
            <div className="slot-grid">
              {slots.map((s) => (
                <button key={s} className={s === slot ? "slot selected" : "slot"} onClick={() => setSlot(s)}>
                  {formatTimeInZone(new Date(s), timezone)}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={!slot} onClick={() => setStep(3)}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h2>Your details</h2>
          <label className="field">
            <span>Full name</span>
            <input required value={form.name} onChange={set("name")} autoComplete="name" />
          </label>
          <label className="field">
            <span>Phone (for text reminders)</span>
            <input type="tel" required value={form.phone} onChange={set("phone")} autoComplete="tel" />
          </label>
          <label className="field">
            <span>Email (for email reminders)</span>
            <input type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
          </label>
          {isDemo && (
            <p className="small" style={{ fontWeight: 400 }}>
              Demo only — use any name and number you like. Nothing is saved
              or sent, and no account is created.
            </p>
          )}
          {!signedIn && !isDemo && (
            <p className="small" style={{ fontWeight: 400 }}>
              No password needed — we text and email your confirmation with a
              link to change or cancel anytime. Already have one?{" "}
              <Link href={`/login?next=/${slug}/book`}>Sign in instead</Link>.
            </p>
          )}
          <label className="field">
            <span>Notes for the business (optional)</span>
            <textarea value={form.notes} onChange={set("notes")} style={{ minHeight: 56 }} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setStep(2)}>Back</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!form.name || !form.phone || !form.email}
              onClick={() => setStep(4)}
            >
              Review booking
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <h2>Review</h2>
          <p className="lede" style={{ marginBottom: 6 }}>
            {service?.name} at {businessName}
          </p>
          <p className="small">
            {slot && `${formatDateInZone(new Date(slot), timezone)} at ${formatTimeInZone(new Date(slot), timezone)}`}
            {service && ` · ${service.duration_minutes} min · ${formatPrice(service.price_cents)}`}
          </p>
          <p className="small">
            {form.name} · {formatPhone(form.phone)} · {form.email}
          </p>
          {isDemo ? (
            <p className="small">
              This is the demo — nothing will be booked or sent. On the next
              screen you&apos;ll see a sample confirmation and the exact
              reminder texts your customer would get.
            </p>
          ) : (
            <p className="small">
              You&apos;ll get a confirmation, then a text and email 24 hours and 2 hours
              before (when the booking is made far enough ahead) — each with a
              link to reschedule or cancel.
            </p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn" onClick={() => setStep(3)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={confirm}>
              {busy ? "Booking…" : isDemo ? "See sample confirmation" : "Confirm booking"}
            </button>
          </div>
        </div>
      )}

      {demoMode && step < 5 && (
        <p className="small center">Demo business — the flow works end to end on sample data; nothing is saved yet.</p>
      )}
    </div>
  );
}
