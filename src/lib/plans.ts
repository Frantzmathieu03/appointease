// Subscription plans: the single source of truth for AppointEase pricing.
// Owner decision (Frantz, 2026-11-24, FINAL): Solo $29.99/mo ·
// Team $49.99/mo · Business $149.99/mo. 14-day free trial, no card
// upfront. Customers who book never pay anything: only businesses
// subscribe.
// Team-size bands (Frantz, 2026-11-26, his own numbers: these
// supersede the revised PDF's bands): Solo 1 · Team 5 · Business 15
// people with a calendar, owner included, counted as active staff
// calendars. Prices unchanged. At the cap, adding a person stops
// with an upgrade prompt (see seatLimitMessage + the invite route).
// Trial length: 14 days (Frantz, 2026-11-26: was 30). New signups
// only; existing businesses keep the trial_ends_at they already have.
// Change prices HERE and every surface (settings UI, gating, checkout)
// follows. Stripe price IDs live in env (see src/lib/stripe.ts).

import type { Business } from "./types";

/** Free trial length for NEW businesses, in days (Frantz, 2026-11-26). */
export const TRIAL_DAYS = 14;

export type PlanId = "solo" | "team" | "business";

export interface Plan {
  id: PlanId;
  name: string;
  monthlyCents: number;
  staffLimit: number;
  blurb: string;
  /** Concrete, checkable card bullets: only what the product delivers. */
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    monthlyCents: 2999,
    staffLimit: 1,
    blurb: "For a one person shop that runs on appointments.",
    features: [
      "1 person",
      "Booking page",
      "Reminders",
      "Messaging",
      "Client history",
      "Forms + file uploads",
    ],
  },
  {
    id: "team",
    name: "Team",
    monthlyCents: 4999,
    staffLimit: 5,
    blurb: "For a small team sharing one booking page.",
    features: [
      "2 to 5 people",
      "Everything in Solo",
      "Team logins",
      "Assign clients to each person",
      "Roles",
      "2 locations",
    ],
  },
  {
    id: "business",
    name: "Business",
    monthlyCents: 14999,
    staffLimit: 15,
    blurb: "For bigger teams that need more calendars and faster support.",
    features: [
      "6 to 15 people",
      "Everything in Team",
      "Unlimited locations",
      "Priority support",
    ],
  },
];

/** The team-size label for plan cards: "1", "5", or "15". */
export function staffLimitLabel(plan: Plan): string {
  return String(plan.staffLimit);
}

/**
 * The team size range for plan cards, written out in plain words
 * (Frantz, 2026-11-27: ranges instead of "up to" wording): Solo is
 * "1 person", Team is "2 to 5 people", Business is "6 to 15 people".
 * The Business limit stays 15; bigger teams contact us instead.
 */
export function planRangeLabel(plan: Plan): string {
  if (plan.id === "solo") return "1 person";
  if (plan.id === "team") return "2 to 5 people";
  return "6 to 15 people";
}

/** The next plan up, or null on the top plan. */
export function nextPlan(plan: Plan): Plan | null {
  const idx = PLANS.findIndex((p) => p.id === plan.id);
  return idx >= 0 && idx < PLANS.length - 1 ? PLANS[idx + 1] : null;
}

/**
 * The at-the-cap sentence (Frantz's wording, 2026-11-26): name the
 * current plan's cover, then the upgrade: or, on Business, just the
 * cover. Shown when adding a person would pass the plan's limit.
 */
export function seatLimitMessage(plan: Plan): string {
  const cover = `Your ${plan.name} plan covers ${planRangeLabel(plan)}.`;
  const next = nextPlan(plan);
  if (!next) return cover;
  return `${cover} Upgrade to ${next.name} (${formatPlanPrice(next.monthlyCents)}/mo) to add more people.`;
}

export function planById(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

/** Annual billing = 2 months free (pay for 10, get 12). */
export function annualCents(plan: Plan): number {
  return plan.monthlyCents * 10;
}

export function formatPlanPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Billing state: decides whether a business's public booking page is live.
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
