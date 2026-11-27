"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DatePicker from "@/components/DatePicker";
import { BOOKING_WINDOW_DAYS, formatTimeInZone, nextDates } from "@/lib/slots";
import type { Service, StaffMember } from "@/lib/types";

export interface OwnerBookingCustomer {
  id: string;
  name: string;
  detail: string;
}

/**
 * Owner-side "New appointment" (PDF §4): pick an existing customer (or
 * add a new guest), a service, a staff member, and a REAL available
 * time: slots come from the same availability endpoint the public
 * booking page uses, so the calendar can't double-book. Submits to
 * /api/owner/book, which writes the timeline event as a team member.
 */
export default function OwnerBookingForm({
  businessId,
  slug,
  timezone,
  services,
  staff,
  customers,
  lockStaffId,
  initialDate,
  initialTime,
  initialStaffId,
  initialCustomerId,
}: {
  businessId: string;
  slug: string;
  timezone: string;
  services: Service[];
  staff: StaffMember[];
  customers: OwnerBookingCustomer[];
  /** Staff logins book only on their own calendar. */
  lockStaffId: string | null;
  initialDate?: string;
  initialTime?: string;
  initialStaffId?: string;
  /** Pre-picked customer (e.g. "Book for <name>" on the profile). */
  initialCustomerId?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">(customers.length > 0 ? "existing" : "new");
  const [customerId, setCustomerId] = useState(
    initialCustomerId && customers.some((c) => c.id === initialCustomerId)
      ? initialCustomerId
      : (customers[0]?.id ?? "")
  );
  const [search, setSearch] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = useState(lockStaffId ?? initialStaffId ?? "");
  const dates = useMemo(() => nextDates(BOOKING_WINDOW_DAYS, timezone), [timezone]);
  const [date, setDate] = useState(initialDate && dates.includes(initialDate) ? initialDate : dates[0]);
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [doneId, setDoneId] = useState("");

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.detail.toLowerCase().includes(q)
    );
  }, [customers, search]);

  useEffect(() => {
    if (!serviceId || !date) return;
    const q = new URLSearchParams({ serviceId, date });
    if (staffId) q.set("staffId", staffId);
    let live = true;
    fetch(`/api/businesses/${slug}/slots?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        const list = (d.slots ?? []) as string[];
        setSlots(list);
        // Arriving from a calendar-slot click: preselect that exact time.
        if (initialTime) {
          const match = list.find(
            (s) => formatTimeInZone(new Date(s), timezone) === initialTime
          );
          if (match) setSlot(match);
        }
      })
      .catch(() => live && setSlots([]));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, staffId, date, slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slot) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/owner/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          serviceId,
          staffId: staffId || null,
          startsAt: slot,
          ...(mode === "existing"
            ? { customerId }
            : { guest: { name: guestName, phone: guestPhone, email: guestEmail } }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Booking failed. Please try again.");
        setBusy(false);
        return;
      }
      setDoneId(data.appointmentId as string);
      router.refresh();
    } catch {
      setError("Booking failed. Please try again.");
    }
    setBusy(false);
  }

  if (services.length === 0) {
    return (
      <p className="small">
        Add a service first. Appointments need something to book.{" "}
        <Link href="/owner/dashboard/settings#services">Go to Services</Link>
      </p>
    );
  }

  if (doneId) {
    return (
      <div className="success">
        Appointment booked. The customer gets the usual confirmation and reminders.{" "}
        <Link href={`/owner/dashboard/appointments/${doneId}`}>View the appointment</Link> ·{" "}
        <Link href="/owner/dashboard/calendar">Back to calendar</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}

      <div className="tabs" role="tablist" aria-label="Customer">
        <a
          href="#"
          className={mode === "existing" ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            setMode("existing");
          }}
        >
          Existing customer
        </a>
        <a
          href="#"
          className={mode === "new" ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            setMode("new");
          }}
        >
          New customer
        </a>
      </div>

      {mode === "existing" ? (
        <>
          <label className="field">
            <span>Search customers</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or phone" />
          </label>
          <label className="field">
            <span>Customer</span>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              {filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.detail ? ` · ${c.detail}` : ""}
                </option>
              ))}
            </select>
          </label>
          {filteredCustomers.length === 0 && (
            <p className="small">No customer matches. Add them as a new customer instead.</p>
          )}
        </>
      ) : (
        <>
          <label className="field">
            <span>Full name</span>
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} required placeholder="Jordan Reed" />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} required placeholder="jordan@example.com" />
          </label>
          <label className="field">
            <span>Phone (optional)</span>
            <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="(555) 010-1234" />
          </label>
        </>
      )}

      <label className="field">
        <span>Service</span>
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.duration_minutes} min
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Team member</span>
        <select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          disabled={!!lockStaffId}
        >
          <option value="">First available</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {lockStaffId && <span className="small">Staff logins book on their own calendar.</span>}
      </label>

      <div className="field">
        <span>Day</span>
        <DatePicker dates={dates} value={date} onChange={(d) => { setDate(d); setSlot(""); }} timeZone={timezone} />
      </div>

      <div className="field">
        <span>Available times</span>
        {slots.length === 0 ? (
          <p className="small">No open times that day. Try another day or team member.</p>
        ) : (
          <div className="slot-grid">
            {slots.map((s) => (
              <button
                type="button"
                key={s}
                className={s === slot ? "slot selected" : "slot"}
                onClick={() => setSlot(s)}
              >
                {formatTimeInZone(new Date(s), timezone)}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="btn btn-primary btn-block" type="submit" disabled={busy || !slot || (mode === "existing" && !customerId)}>
        {busy ? "Booking…" : "Book appointment"}
      </button>
    </form>
  );
}
