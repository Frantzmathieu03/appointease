// Demo shops: public example businesses that anyone can safely try.
//
// A demo shop is a REAL published business row (so its page, services and
// hours render exactly like a customer's would), but its booking flow is
// a simulation end to end:
//   - time slots are generated locally from the shop's weekly hours: 
//     the appointments table is never read and never written;
//   - confirming produces a SAMPLE confirmation screen with reminder
//     previews: /api/book is never called by the client, and the API
//     itself refuses to write for demo slugs (defense in depth);
//   - no email, SMS or push notification ever fires for a demo booking.
//
// Future example shops join by adding their slug here: nothing else
// needs to change.

import { availableSlots } from "./slots";
import type { Availability } from "./types";

// Both slugs are recognized during the rename transition: the live
// database row still carries "jesus-barber-shop" until its slug is
// flipped to "main-street-barbers" at deployment time.
export const DEMO_SLUGS: ReadonlySet<string> = new Set([
  "jesus-barber-shop",
  "main-street-barbers",
  "harbor-family-law",
]);

export function isDemoShop(slug: string | null | undefined): boolean {
  return !!slug && DEMO_SLUGS.has(slug);
}

/**
 * Fallback weekly hours (Mon to Sat, 9 AM to 6 PM) used when a demo shop has
 * few or no availability rows of its own, so the demo always has open
 * times to pick. Mirrors the seeded demo hours.
 */
const FALLBACK_AVAILABILITY: Availability[] = [1, 2, 3, 4, 5, 6].map((weekday) => ({
  id: `demo-fallback-av-${weekday}`,
  business_id: "",
  staff_id: null,
  weekday,
  open_time: "09:00:00",
  close_time: "18:00:00",
}));

/**
 * Open start times (ISO strings) for one day in a demo shop, generated
 * purely from weekly hours with an empty booked list: no database read,
 * no database write.
 */
export function demoSlotsForDay(opts: {
  dateStr: string;
  durationMinutes: number;
  availability: Availability[];
  staffId: string | null;
  timeZone: string;
}): string[] {
  const availability = opts.availability.length > 0 ? opts.availability : FALLBACK_AVAILABILITY;
  return availableSlots({
    dateStr: opts.dateStr,
    durationMinutes: opts.durationMinutes,
    availability,
    booked: [],
    staffId: opts.staffId,
    timeZone: opts.timeZone,
  }).map((d) => d.toISOString());
}

export interface SampleReminderPreview {
  label: string;
  text: string;
}

/**
 * The three messages a customer would receive for a booking, rendered
 * with the sample details. Copy mirrors src/lib/reminders.ts so the
 * preview shows the real wording: only the manage link is a
 * placeholder, because a demo booking has no real appointment.
 */
export function sampleReminderPreviews(opts: {
  customerName: string;
  serviceName: string;
  businessName: string;
  businessAddress: string | null;
  when: string; // "Fri, Nov 27 at 10:00 AM"
  confirmationCode: string;
}): SampleReminderPreview[] {
  const firstName = opts.customerName.trim().split(" ")[0] || "there";
  const addressLine = opts.businessAddress ? `\n${opts.businessAddress}` : "";
  const refLine = `\nConfirmation #: ${opts.confirmationCode}`;
  const manageLine = "Reschedule or cancel here: appointease.io/manage/yourlink";
  const signOff = `We look forward to seeing you.\n${opts.businessName} (via AppointEase)`;

  return [
    {
      label: "Confirmation: sent right away",
      text:
        `Hi ${firstName},\n\n` +
        `Your appointment is confirmed.\n\n` +
        `${opts.serviceName} at ${opts.businessName}\n${opts.when}${addressLine}${refLine}\n\n` +
        `Need to change it? ${manageLine}\n\n` +
        signOff,
    },
    {
      label: "Reminder: 24 hours before",
      text:
        `Hi ${firstName},\n\n` +
        `Just a friendly reminder: you have an appointment tomorrow.\n\n` +
        `${opts.serviceName} at ${opts.businessName}\n${opts.when}${addressLine}${refLine}\n\n` +
        `Please arrive a few minutes early. If something has come up, you can ${manageLine.charAt(0).toLowerCase()}${manageLine.slice(1)}\n\n` +
        signOff,
    },
    {
      label: "Reminder: 2 hours before",
      text:
        `Hi ${firstName},\n\n` +
        `Just a friendly reminder: you have an appointment in about 2 hours.\n\n` +
        `${opts.serviceName} at ${opts.businessName}\n${opts.when}${addressLine}${refLine}\n\n` +
        `Please arrive a few minutes early. If something has come up, you can ${manageLine.charAt(0).toLowerCase()}${manageLine.slice(1)}\n\n` +
        signOff,
    },
  ];
}
