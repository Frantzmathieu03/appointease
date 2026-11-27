import type { SupabaseClient } from "@supabase/supabase-js";
import type { Service } from "@/lib/types";

/**
 * The standard pair (Frantz, 2026-11-26): a business must never be
 * blocked from taking bookings because it has not added services, and
 * the owner should never have to add the basics. The system itself
 * provides two services for every business, free, no owner action
 * needed:
 *   1. the category standard: "Consultation" (30 min) for law
 *      offices, "Appointment" (30 min) for every other category;
 *   2. "Follow up appointment" (30 min) for every category.
 *      (It was created as "Follow-up appointment" until 2026-11-26,
 *      when Frantz ordered all dashes out of visible copy. Migration
 *      0021 renames the live rows; detection below accepts BOTH
 *      spellings so the pair works before and after the migration,
 *      and creation always uses the new spelling.)
 * Both are ordinary service rows (price_type "none", active): they
 * are created at business creation, the live data was backfilled with
 * them (skipping any name a business already had), and the owner may
 * rename, deactivate, or add their own in the dashboard: theirs list
 * first in the booking flow, the standard pair after. The helpers
 * below are the belt and suspenders for a business that somehow has
 * zero services anyway: page data presents the pair, and the booking
 * API turns the chosen one into a real row on first use.
 */
export const DEFAULT_SERVICE_ID = "default-service";
export const FOLLOWUP_SERVICE_ID = "default-service-followup";
export const DEFAULT_SERVICE_MINUTES = 30;
export const FOLLOWUP_SERVICE_NAME = "Follow up appointment";
/** The pair's original spelling: still the stored name on rows created before migration 0021 renames them. Detection accepts both. */
export const LEGACY_FOLLOWUP_SERVICE_NAME = "Follow-up appointment";

export function standardServiceName(category: string | null | undefined): string {
  return category === "law-offices" ? "Consultation" : "Appointment";
}

/** The pair's names for a business, standard first. These are the names CREATION uses (the new follow up spelling). */
export function standardServiceNames(category: string | null | undefined): string[] {
  return [standardServiceName(category), FOLLOWUP_SERVICE_NAME];
}

/**
 * Pair rank for detection: 0 for the category standard, 1 for the
 * follow up service under EITHER spelling (new or legacy), -1 for
 * anything else. Detection must accept both spellings during the
 * transition: rows created before migration 0021 still say
 * "Follow-up appointment", rows created after say
 * "Follow up appointment".
 */
export function pairServiceRank(
  name: string,
  category: string | null | undefined
): number {
  const n = name.trim().toLowerCase();
  if (n === standardServiceName(category).toLowerCase()) return 0;
  if (
    n === FOLLOWUP_SERVICE_NAME.toLowerCase() ||
    n === LEGACY_FOLLOWUP_SERVICE_NAME.toLowerCase()
  ) {
    return 1;
  }
  return -1;
}

export function isStandardServiceId(id: string): boolean {
  return id === DEFAULT_SERVICE_ID || id === FOLLOWUP_SERVICE_ID;
}

/**
 * Display order (Frantz fix round, 2026-11-26): the business's OWN
 * services list first, in the order given; the standard pair comes
 * after them (category standard, then Follow up). Pair members are
 * recognized by name, the same way ensureStandardServices detects
 * them, under either follow up spelling. Used everywhere a customer
 * picks a service: the public page and booking Step 1 both read page
 * data assembled in lib/data.ts.
 */
export function orderServicesForDisplay(
  services: Service[],
  category: string | null | undefined
): Service[] {
  const own: Service[] = [];
  const pair: Service[] = [];
  for (const s of services) {
    if (pairServiceRank(s.name, category) >= 0) pair.push(s);
    else own.push(s);
  }
  pair.sort(
    (a, b) =>
      pairServiceRank(a.name, category) - pairServiceRank(b.name, category)
  );
  return [...own, ...pair];
}

export function syntheticStandardServices(
  businessId: string,
  category: string | null | undefined
): Service[] {
  const base = {
    business_id: businessId,
    duration_minutes: DEFAULT_SERVICE_MINUTES,
    price_cents: null,
    price_type: "none" as const,
    active: true,
  };
  return [
    { ...base, id: DEFAULT_SERVICE_ID, name: standardServiceName(category) },
    { ...base, id: FOLLOWUP_SERVICE_ID, name: FOLLOWUP_SERVICE_NAME },
  ];
}

/**
 * Server side: make sure the business's standard pair exists as real
 * rows (any name already present: even deactivated by the owner :
 * is left alone), then return the business's active services. Runs
 * on the admin client (RLS-safe). Returns null only on a database
 * error during creation.
 */
export async function ensureStandardServices(
  admin: SupabaseClient,
  business: { id: string; category?: string | null }
): Promise<Service[] | null> {
  const { data: all } = await admin
    .from("services")
    .select("*")
    .eq("business_id", business.id);
  const rows = (all ?? []) as Service[];
  const haveNames = new Set(rows.map((s) => s.name.trim().toLowerCase()));
  // The standard counts as present under its own name. The follow up
  // counts as present under EITHER spelling, so a pre migration row
  // never triggers a duplicate; when it is truly missing, creation
  // always uses the new spelling.
  const missing: string[] = [];
  const standard = standardServiceName(business.category);
  if (!haveNames.has(standard.toLowerCase())) missing.push(standard);
  if (
    !haveNames.has(FOLLOWUP_SERVICE_NAME.toLowerCase()) &&
    !haveNames.has(LEGACY_FOLLOWUP_SERVICE_NAME.toLowerCase())
  ) {
    missing.push(FOLLOWUP_SERVICE_NAME);
  }
  if (missing.length > 0) {
    const { data: created, error } = await admin
      .from("services")
      .insert(
        missing.map((name) => ({
          business_id: business.id,
          name,
          duration_minutes: DEFAULT_SERVICE_MINUTES,
          price_type: "none",
          price_cents: null,
          active: true,
        }))
      )
      .select("*");
    if (error || !created) {
      console.error("ensureStandardServices failed", error);
      return null;
    }
    rows.push(...(created as Service[]));
  }
  return orderServicesForDisplay(
    rows.filter((s) => s.active),
    business.category
  );
}
