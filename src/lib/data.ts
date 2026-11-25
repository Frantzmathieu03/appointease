// Data access for public business pages — Supabase when configured,
// demo data (mirroring supabase/seed.sql) while the project is a placeholder.
import { createServerSupabase, isSupabaseConfigured } from "./supabase";
import { DEMO_AVAILABILITY, DEMO_BUSINESS, DEMO_SERVICES, DEMO_STAFF } from "./demo-data";
import type {
  Availability,
  Business,
  BusinessPhoto,
  Location,
  Service,
  StaffMember,
  StaffService,
} from "./types";

/** Demo businesses: published so their pages work, but never listed in
 *  the public directory — they are examples, not real businesses. */
export const DIRECTORY_EXCLUDED_SLUGS: string[] = [DEMO_BUSINESS.slug, "harbor-family-law"];

export interface BusinessPageData {
  business: Business;
  services: Service[];
  staff: StaffMember[];
  availability: Availability[];
  photos: BusinessPhoto[];
  /** Who offers each service (staff_services). Empty = everyone offers
      everything, as before. */
  staffServices: StaffService[];
  /** Branches (migration 0013). Empty for most businesses. */
  locations: Location[];
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
      staffServices: [],
      locations: [],
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

  // Who offers what (staff_services, 0001): used to keep the booking
  // flow from offering a team member for a service they don't do.
  const staffIds = ((staff ?? []) as StaffMember[]).map((s) => s.id);
  let staffServices: StaffService[] = [];
  if (staffIds.length > 0) {
    const { data: ss } = await supabase
      .from("staff_services")
      .select("staff_id, service_id")
      .in("staff_id", staffIds);
    staffServices = (ss ?? []) as StaffService[];
  }

  // Branches (migration 0013). Defensive: before the migration lands
  // the table doesn't exist — the page simply has no locations.
  let locations: Location[] = [];
  const locRes = await supabase
    .from("locations")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });
  if (!locRes.error) locations = (locRes.data ?? []) as Location[];

  return {
    business: business as Business,
    services: (services ?? []) as Service[],
    staff: (staff ?? []) as StaffMember[],
    availability: (availability ?? []) as Availability[],
    photos: (photos ?? []) as BusinessPhoto[],
    staffServices,
    locations,
    demoMode: false,
  };
}

/** Hours summary like "Mon–Sat · 9:00 AM–6:00 PM" for page headers. */export function hoursSummary(availability: Availability[]): string {
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

export interface OpenStatus {
  /** "open" when now falls inside one of today's rows, else "closed". */
  state: "open" | "closed";
  /** Today's hours, e.g. "9 AM – 5 PM" — null when closed today. */
  todayLabel: string | null;
  /** Truthful note, e.g. "Open now · closes 5 PM" / "Closed · opens Sat 9 AM". */
  note: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmtClock = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hr} ${ampm}` : `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
};

/**
 * Open/closed status for the business page's contact card, computed
 * from the real availability rows in the business's own timezone.
 * Business-wide rows (staff_id null) define the hours; when a day has
 * only per-staff rows, any of them counts. Returns null when the
 * business has no availability rows at all (nothing truthful to say).
 */
export function openStatus(availability: Availability[], timeZone: string): OpenStatus | null {
  if (availability.length === 0) return null;
  const byDay = new Map<number, Availability[]>();
  for (const a of availability) {
    const rows = byDay.get(a.weekday) ?? [];
    rows.push(a);
    byDay.set(a.weekday, rows);
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const today = DAY_NAMES.indexOf(get("weekday"));
  const nowMinutes = Number(get("hour")) * 60 + Number(get("minute"));
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const daySpan = (weekday: number) => {
    const rows = byDay.get(weekday) ?? [];
    if (rows.length === 0) return null;
    const wide = rows.filter((r) => r.staff_id === null);
    const use = wide.length > 0 ? wide : rows;
    return {
      open: Math.min(...use.map((r) => toMinutes(r.open_time))),
      close: Math.max(...use.map((r) => toMinutes(r.close_time))),
      openRaw: use.reduce((a, b) => (toMinutes(a.open_time) <= toMinutes(b.open_time) ? a : b)).open_time,
      closeRaw: use.reduce((a, b) => (toMinutes(a.close_time) >= toMinutes(b.close_time) ? a : b)).close_time,
      rows: use,
    };
  };

  const span = daySpan(today);
  if (span) {
    const inside = span.rows.some(
      (r) => nowMinutes >= toMinutes(r.open_time) && nowMinutes < toMinutes(r.close_time)
    );
    const todayLabel = `${fmtClock(span.openRaw)} – ${fmtClock(span.closeRaw)}`;
    if (inside) {
      const current = span.rows.find(
        (r) => nowMinutes >= toMinutes(r.open_time) && nowMinutes < toMinutes(r.close_time)
      )!;
      return { state: "open", todayLabel, note: `Open now · closes ${fmtClock(current.close_time)}` };
    }
    if (nowMinutes < span.open) {
      return { state: "closed", todayLabel, note: `Closed · opens ${fmtClock(span.openRaw)} today` };
    }
    // After today's close: fall through to the next open day.
    for (let d = 1; d <= 7; d++) {
      const wd = (today + d) % 7;
      const s = daySpan(wd);
      if (s) {
        return {
          state: "closed",
          todayLabel,
          note: `Closed · opens ${DAY_NAMES[wd]} ${fmtClock(s.openRaw)}`,
        };
      }
    }
    return { state: "closed", todayLabel, note: "Closed" };
  }
  for (let d = 1; d <= 7; d++) {
    const wd = (today + d) % 7;
    const s = daySpan(wd);
    if (s) {
      return {
        state: "closed",
        todayLabel: null,
        note: `Closed today · opens ${DAY_NAMES[wd]} ${fmtClock(s.openRaw)}`,
      };
    }
  }
  return null;
}

/** One row of the /explore marketplace directory. */
export interface DirectoryBusiness {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  category: string;
  photoUrl: string | null;
}

/**
 * All published businesses for /explore, with each business's first
 * gallery photo. Defensive about migration 0007: if the category column
 * doesn't exist yet, the select errors and we retry without it, listing
 * every business as uncategorized ("other") instead of failing the page.
 */
export async function getPublishedBusinesses(): Promise<{
  businesses: DirectoryBusiness[];
  demoMode: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return {
      businesses: [
        {
          id: DEMO_BUSINESS.id,
          slug: DEMO_BUSINESS.slug,
          name: DEMO_BUSINESS.name,
          address: DEMO_BUSINESS.address,
          logo_url: DEMO_BUSINESS.logo_url,
          category: "barbershops",
          photoUrl: null,
        },
      ],
      demoMode: true,
    };
  }

  const supabase = await createServerSupabase();
  const baseCols = "id, slug, name, address, logo_url";
  type Row = Record<string, unknown>;
  let rows: Row[] = [];
  // The demo businesses stay published so their demo pages keep working,
  // but they are not real businesses — never list them in the directory.
  const withCategory = await supabase
    .from("businesses")
    .select(`${baseCols}, category`)
    .eq("published", true)
    .not("slug", "in", `(${DIRECTORY_EXCLUDED_SLUGS.join(",")})`)
    .order("name", { ascending: true });
  if (withCategory.error) {
    const fallback = await supabase
      .from("businesses")
      .select(baseCols)
      .eq("published", true)
      .not("slug", "in", `(${DIRECTORY_EXCLUDED_SLUGS.join(",")})`)
      .order("name", { ascending: true });
    rows = ((fallback.data ?? []) as Row[]).map((r) => ({ ...r, category: "other" }));
  } else {
    rows = (withCategory.data ?? []) as Row[];
  }

  const ids = rows.map((r) => r.id as string);
  const firstPhoto = new Map<string, string>();
  if (ids.length > 0) {
    const { data: photos } = await supabase
      .from("business_photos")
      .select("business_id, url")
      .in("business_id", ids)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    for (const p of photos ?? []) {
      if (!firstPhoto.has(p.business_id)) firstPhoto.set(p.business_id, p.url);
    }
  }

  return {
    businesses: rows.map((r) => ({
      id: r.id as string,
      slug: r.slug as string,
      name: r.name as string,
      address: (r.address as string | null) ?? null,
      logo_url: (r.logo_url as string | null) ?? null,
      category: (r.category as string | null) ?? "other",
      photoUrl: firstPhoto.get(r.id as string) ?? null,
    })),
    demoMode: false,
  };
}
