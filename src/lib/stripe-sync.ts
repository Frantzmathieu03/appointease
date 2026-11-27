// Writes Stripe subscription state onto the businesses row (migration
// 0004 columns). Used by the webhook; every write is a full sync from the
// subscription's current state, so handling the same event twice: or
// events arriving out of order: converges to the same row. That is what
// makes the webhook idempotent beyond the stripe_events dedupe table.

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planIdForPriceId } from "./stripe";

const LIVE = new Set(["active", "trialing"]);
const LAPSED = new Set(["past_due", "canceled", "cancelled", "unpaid", "incomplete_expired"]);

function periodEndIso(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  const secs = item?.current_period_end ?? legacy;
  return secs ? new Date(secs * 1000).toISOString() : null;
}

export async function syncSubscription(
  admin: SupabaseClient,
  businessId: string,
  sub: Stripe.Subscription
): Promise<void> {
  const { data: current } = await admin
    .from("businesses")
    .select("plan, billing_lapsed_at")
    .eq("id", businessId)
    .maybeSingle();

  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const plan = planIdForPriceId(priceId);

  let lapsedAt = (current?.billing_lapsed_at as string | null) ?? null;
  if (LIVE.has(sub.status)) lapsedAt = null;
  else if (LAPSED.has(sub.status) && !lapsedAt) lapsedAt = new Date().toISOString();

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  await admin
    .from("businesses")
    .update({
      stripe_customer_id: customerId ?? undefined,
      stripe_subscription_id: sub.id,
      subscription_status: sub.status,
      subscription_current_period_end: periodEndIso(sub),
      billing_lapsed_at: lapsedAt,
      ...(plan ? { plan } : {}),
    })
    .eq("id", businessId);
}

/** Which business a subscription belongs to: metadata first, then the
 *  stored Stripe ids. Returns null when nothing matches (foreign event). */
export async function businessIdForSubscription(
  admin: SupabaseClient,
  sub: Stripe.Subscription
): Promise<string | null> {
  if (sub.metadata?.business_id) return sub.metadata.business_id;

  const { data: bySub } = await admin
    .from("businesses")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (bySub) return bySub.id as string;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (customerId) {
    const { data: byCust } = await admin
      .from("businesses")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (byCust) return byCust.id as string;
  }
  return null;
}
