// Stripe server client + configuration checks. SERVER ONLY: never import
// from a client component (the secret key must never reach the browser).
//
// BILLING-NOT-CONFIGURED MODE (same honesty pattern as demo mode): until
// STRIPE_SECRET_KEY and the three monthly price IDs are set in env, the
// app runs normally: trials keep running, booking stays live: and the
// owner Billing UI shows subscribe buttons disabled with a plain note
// that billing isn't switched on yet. Nothing pretends to charge anyone.

import Stripe from "stripe";
import type { PlanId } from "./plans";

export type BillingInterval = "month" | "year";

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** True only when checkout can actually run: secret key + all 3 prices. */
export function isBillingConfigured(): boolean {
  return (
    env("STRIPE_SECRET_KEY").length > 0 &&
    env("STRIPE_PRICE_SOLO").length > 0 &&
    env("STRIPE_PRICE_TEAM").length > 0 &&
    env("STRIPE_PRICE_BUSINESS").length > 0
  );
}

/** Annual prices are optional; the annual toggle appears only when set. */
export function isAnnualBillingConfigured(): boolean {
  return (
    env("STRIPE_PRICE_SOLO_ANNUAL").length > 0 &&
    env("STRIPE_PRICE_TEAM_ANNUAL").length > 0 &&
    env("STRIPE_PRICE_BUSINESS_ANNUAL").length > 0
  );
}

let cached: Stripe | null | undefined;
export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = env("STRIPE_SECRET_KEY");
  cached = key ? new Stripe(key) : null;
  return cached;
}

const PRICE_ENV: Record<PlanId, Record<BillingInterval, string>> = {
  solo: { month: "STRIPE_PRICE_SOLO", year: "STRIPE_PRICE_SOLO_ANNUAL" },
  team: { month: "STRIPE_PRICE_TEAM", year: "STRIPE_PRICE_TEAM_ANNUAL" },
  business: { month: "STRIPE_PRICE_BUSINESS", year: "STRIPE_PRICE_BUSINESS_ANNUAL" },
};

export function priceIdFor(planId: PlanId, interval: BillingInterval): string | null {
  const v = env(PRICE_ENV[planId][interval]);
  return v ? v : null;
}

/** Reverse lookup: which plan (if any) a Stripe price ID belongs to. */
export function planIdForPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const planId of Object.keys(PRICE_ENV) as PlanId[]) {
    for (const interval of ["month", "year"] as BillingInterval[]) {
      if (env(PRICE_ENV[planId][interval]) === priceId) return planId;
    }
  }
  return null;
}
