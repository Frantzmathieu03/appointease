// Subscription plans — the single source of truth for AppointEase pricing.
// Owner decision (Frantz, 2026-11-24, FINAL): Solo $29.99/mo ·
// Team $49.99/mo · Business $149.99/mo, priced by team size (staff
// calendars). 30-day free trial, no card upfront. Customers who book
// never pay anything — only businesses subscribe.
// Change prices HERE and every surface (settings UI, gating, checkout)
// follows. Stripe price IDs live in env (see src/lib/stripe.ts).

import type { Business } from "./types";

export type PlanId = "solo" | "team" | "business";

export interface Plan {
  id: PlanId;
  name: string;
  monthlyCents: number;
  staffLimit: number;
  blurb: string;
}

export const PLANS: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    monthlyCents: 2999,
    staffLimit: 1,
    blurb: "Booking page, reminders by text + email, inbox — for a one-person shop.",
  },
  {
    id: "team",
    name: "Team",
    monthlyCents: 4999,
    staffLimit: 5,
    blurb: "Everything in Solo, plus team calendars and per-person services & hours.",
  },
  {
    id: "business",
    name: "Business",
    monthlyCents: 14999,
    staffLimit: 15,
    blurb: "Everything in Team, plus intake forms and priority support — built for big businesses.",
  },
];

export function planById(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

/** Annual billing = 2 months free (pay for 10, get 12). */
export function annualCents(plan: Plan): number {
  return plan.monthlyCents * 10;
}

export function formatPlanPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Billing state — decides whether a business's public booking page is live.
//   • Stripe subscription active/trialing            → live
//   • No subscription yet, still inside free trial   → live
//   • Subscription cancelled / past_due / unpaid     → live for a 3-day
//     grace window (from billing_lapsed_at), then paused
//   • Trial over with no subscription                → paused
// Paused never deletes anything: the owner dashboard stays fully open and
// existing appointments stay manageable; only NEW public booking pauses.
// ---------------------------------------------------------------------------

export type BillingPhase = "trial" | "active" | "grace" | "paused";

export interface BillingState {
  plan: Plan;
  phase: BillingPhase;
  bookingLive: boolean;
  /** Raw Stripe subscription status, when a subscription exists. */
  subscriptionStatus: string | null;
  trialEndsAt: string;
  currentPeriodEnd: string | null;
  /** When the page pauses (or paused), for owner-facing copy. */
  pausesAt: string | null;
}

const GRACE_MS = 3 * 86400000;
const LIVE_SUB_STATUSES = new Set(["active", "trialing"]);
const LAPSED_SUB_STATUSES = new Set(["past_due", "canceled", "cancelled", "unpaid", "incomplete_expired"]);

export function getBillingState(business: Business, now: Date = new Date()): BillingState {
  const plan = planById(business.plan);
  const subStatus = business.subscription_status ?? null;
  const base = {
    plan,
    subscriptionStatus: subStatus,
    trialEndsAt: business.trial_ends_at,
    currentPeriodEnd: business.subscription_current_period_end ?? null,
  };

  if (subStatus && LIVE_SUB_STATUSES.has(subStatus)) {
    return { ...base, phase: "active", bookingLive: true, pausesAt: null };
  }

  if (subStatus && LAPSED_SUB_STATUSES.has(subStatus)) {
    const lapsedAt = business.billing_lapsed_at
      ? new Date(business.billing_lapsed_at)
      : business.subscription_current_period_end
        ? new Date(business.subscription_current_period_end)
        : new Date(business.trial_ends_at);
    const graceEnd = new Date(lapsedAt.getTime() + GRACE_MS);
    if (now < graceEnd) {
      return { ...base, phase: "grace", bookingLive: true, pausesAt: graceEnd.toISOString() };
    }
    return { ...base, phase: "paused", bookingLive: false, pausesAt: graceEnd.toISOString() };
  }

  // No (live) subscription: the free trial decides.
  if (now < new Date(business.trial_ends_at)) {
    return { ...base, phase: "trial", bookingLive: true, pausesAt: business.trial_ends_at };
  }
  return { ...base, phase: "paused", bookingLive: false, pausesAt: business.trial_ends_at };
}
