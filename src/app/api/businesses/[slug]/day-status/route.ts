import { NextRequest, NextResponse } from "next/server";
import { getBusinessPageDataWithPreview } from "@/lib/data";
import { createAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { availableSlots, nextDates, weekdayOf, type BookedRange } from "@/lib/slots";

// GET /api/businesses/<slug>/day-status?serviceId=..&staffId=..&days=60
// Per-day calendar states for the booking + reschedule pickers
// (Customer Side Plan, Frantz 2026-11-26): "closed" = the business
// (or the picked person) has no hours that weekday; "full" = hours
// exist but every slot is taken or past; "open" = at least one real
// slot can still be picked. The picker renders open days outlined in
// green and closed/full days as plain grey numbers, so a closed day
// never looks bookable. Slots for a single day still come from the
// slots route — this route only classifies days.
//
// Same insider rule as the slots route: published businesses serve
// everyone; an unpublished business serves only its insiders.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const q = req.nextUrl.searchParams;
  const serviceId = q.get("serviceId");
  const staffId = q.get("staffId");
  const days = Math.min(Math.max(Number(q.get("days") ?? 60) || 60, 1), 62);
  if (!serviceId) {
    return NextResponse.json({ error: "serviceId is required" }, { status: 400 });
  }

  const page = await getBusinessPageDataWithPreview(slug);
  if (!page) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const service = page.services.find((s) => s.id === serviceId);
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  // Who offers this service (staff_services): a named person who
  // doesn't offer it has no open days for it.
  if (staffId) {
    const offering = page.staffServices.filter((r) => r.service_id === serviceId);
    if (offering.length > 0 && !offering.some((r) => r.staff_id === staffId)) {
      const dates = nextDates(days, page.business.timezone);
      const states: Record<string, string> = {};
      for (const d of dates) states[d] = "closed";
      return NextResponse.json({ states, demoMode: page.demoMode });
    }
  }

  const tz = page.business.timezone;
  const dates = nextDates(days, tz);

  // Does the effective schedule (the picked person's own rows when
  // they have any, else the business-wide rows — the same rule
  // availableSlots applies) cover this weekday at all?
  const hasHours = (dateStr: string): boolean => {
    const weekday = weekdayOf(dateStr, tz);
    const rows = page.availability.filter((a) => a.weekday === weekday);
    const own = rows.filter((a) => a.staff_id === (staffId || null));
    const wide = rows.filter((a) => a.staff_id === null);
    const effective = staffId && own.length > 0 ? own : wide;
    return effective.length > 0;
  };

  const states: Record<string, string> = {};

  if (page.demoMode || !isSupabaseConfigured()) {
    // Demo mode has no real bookings: a day with hours is open.
    for (const d of dates) states[d] = hasHours(d) ? "open" : "closed";
    return NextResponse.json({ states, demoMode: true });
  }

  // One read of the window's confirmed appointments, then classify
  // each day with the same slot math the picker itself uses.
  const admin = createAdminSupabase();
  const from = new Date(`${dates[0]}T00:00:00Z`).getTime() - 86400000;
  const to = from + (days + 2) * 86400000;
  const { data } = await admin
    .from("appointments")
    .select("starts_at, ends_at, staff_id")
    .eq("business_id", page.business.id)
    .eq("status", "confirmed")
    .gte("starts_at", new Date(from).toISOString())
    .lte("starts_at", new Date(to).toISOString());
  const booked = (data ?? []) as BookedRange[];

  for (const d of dates) {
    if (!hasHours(d)) {
      states[d] = "closed";
      continue;
    }
    const slots = availableSlots({
      dateStr: d,
      durationMinutes: service.duration_minutes,
      availability: page.availability,
      booked,
      staffId: staffId || null,
      timeZone: tz,
    });
    states[d] = slots.length > 0 ? "open" : "full";
  }

  return NextResponse.json({ states, demoMode: false });
}
