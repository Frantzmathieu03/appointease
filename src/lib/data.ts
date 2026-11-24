// Data access for public business pages — Supabase when configured,
// demo data (mirroring supabase/seed.sql) while the project is a placeholder.
import { createServerSupabase, isSupabaseConfigured } from "./supabase";
import { DEMO_AVAILABILITY, DEMO_BUSINESS, DEMO_SERVICES, DEMO_STAFF } from "./demo-data";
import type { Availability, Business, BusinessPhoto, Service, StaffMember } from "./types";

export interface BusinessPageData {
  business: Business;
  services: Service[];
  staff: StaffMember[];
  availability: Availability[];
  photos: BusinessPhoto[];
  demoMode: boolean;
}

export async function getBusinessPageData(slug: string): Promise<BusinessPageData | null> {
  if (!isSupabaseConfigured()) {
    if (slug !== DEMO_BUSINESS.slug) return null;
    return {
      business: DEMO_BUSINESS,
      services: DEMO_SERVICES,
      staff: DEMO_STAFF,
      availability: DEMO_AVAILABILITY,
      photos: [],
      demoMode: true,
    };
  }

  const supabase = await createServerSupabase();
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (!business) return null;

  const [{ data: services }, { data: staff }, { data: availability }, { data: photos }] =
    await Promise.all([
      supabase.from("services").select("*").eq("business_id", business.id).eq("active", true),
      supabase.from("staff").select("*").eq("business_id", business.id).eq("active", true),
      supabase.from("availability").select("*").eq("business_id", business.id),
      supabase
        .from("business_photos")
        .select("*")
        .eq("business_id", business.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  return {
    business: business as Business,
    services: (services ?? []) as Service[],
    staff: (staff ?? []) as StaffMember[],
    availability: (availability ?? []) as Availability[],
    photos: (photos ?? []) as BusinessPhoto[],
    demoMode: false,
  };
}

/** Hours summary like "Mon–Sat · 9:00 AM–6:00 PM" for page headers. */
export function hoursSummary(availability: Availability[]): string {
  const byDay = new Map<number, Availability>();
  for (const a of availability) {
    if (a.staff_id === null && !byDay.has(a.weekday)) byDay.set(a.weekday, a);
  }
  if (byDay.size === 0) return "Hours by appointment";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = [...byDay.keys()].sort((x, y) => x - y);
  const first = byDay.get(days[0])!;
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${hr} ${ampm}` : `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
  };
  const range =
    days.length > 1 && days[days.length - 1] - days[0] === days.length - 1
      ? `${names[days[0]]}–${names[days[days.length - 1]]}`
      : days.map((d) => names[d]).join(", ");
  return `${range} · ${fmt(first.open_time)}–${fmt(first.close_time)}`;
}
