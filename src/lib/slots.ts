// Slot math: turn weekly opening hours + already-booked appointments into
// the list of start times a customer can actually pick. All instants are
// computed in the business's own timezone.

import type { Availability } from "./types";

/** Convert a wall-clock date/time in an IANA timezone to a UTC Date. */
export function zonedTimeToUtc(
  dateStr: string, // "2026-11-26"
  timeStr: string, // "09:00" or "09:00:00"
  timeZone: string
): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  // Guess UTC, then correct by the zone offset at that instant.
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(guess)).map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return new Date(guess - (asUtc - guess));
}

/** Weekday (0=Sunday…6=Saturday) of a yyyy-mm-dd date in the given zone. */
export function weekdayOf(dateStr: string, timeZone: string): number {
  const noon = zonedTimeToUtc(dateStr, "12:00", timeZone);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(noon);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

export interface BookedRange {
  starts_at: string;
  ends_at: string;
  staff_id: string | null;
}

const SLOT_STEP_MINUTES = 30;

/**
 * Available start times (as UTC Dates) for one day.
 * - staffId given: uses that staff member's hours if set, else business hours;
 *   conflicts checked against that staff member's appointments only.
 * - staffId null: business hours; conflicts checked against staff-less
 *   appointments (matches the DB exclusion constraints).
 */
export function availableSlots(opts: {
  dateStr: string;
  durationMinutes: number;
  availability: Availability[];
  booked: BookedRange[];
  staffId: string | null;
  timeZone: string;
  now?: Date;
}): Date[] {
  const { dateStr, durationMinutes, availability, booked, staffId, timeZone } = opts;
  const now = opts.now ?? new Date();
  const weekday = weekdayOf(dateStr, timeZone);

  const rows = availability.filter((a) => a.weekday === weekday);
  const own = rows.filter((a) => a.staff_id === staffId);
  const businessWide = rows.filter((a) => a.staff_id === null);
  const effective = staffId && own.length > 0 ? own : businessWide;

  const conflicts = booked
    .filter((b) => (staffId ? b.staff_id === staffId : b.staff_id === null))
    .map((b) => ({ start: new Date(b.starts_at).getTime(), end: new Date(b.ends_at).getTime() }));

  const slots: Date[] = [];
  for (const row of effective) {
    const open = zonedTimeToUtc(dateStr, row.open_time, timeZone).getTime();
    const close = zonedTimeToUtc(dateStr, row.close_time, timeZone).getTime();
    for (
      let t = open;
      t + durationMinutes * 60000 <= close;
      t += SLOT_STEP_MINUTES * 60000
    ) {
      const end = t + durationMinutes * 60000;
      if (t <= now.getTime()) continue; // no booking in the past
      const overlaps = conflicts.some((c) => t < c.end && end > c.start);
      if (!overlaps) slots.push(new Date(t));
    }
  }
  return slots.sort((a, b) => a.getTime() - b.getTime());
}

export function formatTimeInZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatDateInZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * How far ahead customers can book, in days (today + 59 more).
 * One source of truth: the booking flow and the reschedule page both
 * build their pickable date lists from this.
 */
export const BOOKING_WINDOW_DAYS = 60;

/** Next N dates (yyyy-mm-dd, business zone) starting today. */
export function nextDates(count: number, timeZone: string, from = new Date()): string[] {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(fmt.format(new Date(from.getTime() + i * 86400000)));
  }
  return out;
}
