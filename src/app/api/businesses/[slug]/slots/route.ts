import { NextRequest, NextResponse } from "next/server";
import { getBusinessPageData } from "@/lib/data";
import { createAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { availableSlots, type BookedRange } from "@/lib/slots";

// GET /api/businesses/<slug>/slots?serviceId=..&staffId=..&date=yyyy-mm-dd
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const q = req.nextUrl.searchParams;
  const serviceId = q.get("serviceId");
  const staffId = q.get("staffId");
  const date = q.get("date");
  if (!serviceId || !date) {
    return NextResponse.json({ error: "serviceId and date are required" }, { status: 400 });
  }

  const page = await getBusinessPageData(slug);
  if (!page) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const service = page.services.find((s) => s.id === serviceId);
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  let booked: BookedRange[] = [];
  if (!page.demoMode && isSupabaseConfigured()) {
    const admin = createAdminSupabase();
    const dayStart = new Date(`${date}T00:00:00Z`).getTime() - 86400000;
    const dayEnd = dayStart + 3 * 86400000;
    const { data } = await admin
      .from("appointments")
      .select("starts_at, ends_at, staff_id")
      .eq("business_id", page.business.id)
      .eq("status", "confirmed")
      .gte("starts_at", new Date(dayStart).toISOString())
      .lte("starts_at", new Date(dayEnd).toISOString());
    booked = (data ?? []) as BookedRange[];
  }

  const slots = availableSlots({
    dateStr: date,
    durationMinutes: service.duration_minutes,
    availability: page.availability,
    booked,
    staffId: staffId || null,
    timeZone: page.business.timezone,
  });

  return NextResponse.json({
    slots: slots.map((s) => s.toISOString()),
    demoMode: page.demoMode,
  });
}
