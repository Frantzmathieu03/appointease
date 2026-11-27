import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getOwnerBusiness, siteUrl } from "@/lib/owner";
import { getStripe, isBillingConfigured, priceIdFor, type BillingInterval } from "@/lib/stripe";
import { PLANS, type PlanId } from "@/lib/plans";

// POST /api/billing/checkout  { plan: "solo"|"team"|"business", interval?: "month"|"year" }
// Starts a Stripe Checkout subscription for the signed-in owner's business.
// Creates the Stripe customer on first use and stores its id on the
// business row; the webhook fills in the subscription fields when the
// checkout completes. If the business already has a live subscription,
// plan changes go through the Billing Portal instead (409 here).
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Demo mode. Billing turns on with the live database." }, { status: 400 });
  }
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const business = await getOwnerBusiness(supabase, user.id);
  if (!business) return NextResponse.json({ error: "No business found." }, { status: 404 });

  if (!isBillingConfigured()) {
    return NextResponse.json(
      {
        error: "billing_not_configured",
        message:
          "Billing isn't switched on yet. Stripe keys and prices are not configured. Your free trial keeps running meanwhile.",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const planId = (body?.plan ?? business.plan) as PlanId;
  if (!PLANS.some((p) => p.id === planId)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }
  const interval: BillingInterval = body?.interval === "year" ? "year" : "month";
  const price = priceIdFor(planId, interval);
  if (!price) {
    return NextResponse.json(
      { error: "That billing period isn't set up in Stripe yet." },
      { status: 400 }
    );
  }

  if (
    business.stripe_subscription_id &&
    ["active", "trialing", "past_due"].includes(business.subscription_status ?? "")
  ) {
    return NextResponse.json(
      {
        error: "already_subscribed",
        message: "You already have a subscription. Use “Manage billing” to change plans.",
      },
      { status: 409 }
    );
  }

  const stripe = getStripe()!;

  // Create (or reuse) the Stripe customer for this business.
  let customerId = business.stripe_customer_id;
  if (customerId) {
    try {
      const existing = await stripe.customers.retrieve(customerId);
      if ((existing as Stripe.DeletedCustomer).deleted) customerId = null;
    } catch {
      customerId = null;
    }
  }
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: business.name,
      email: business.email ?? user.email ?? undefined,
      metadata: { business_id: business.id },
    });
    customerId = customer.id;
    await supabase
      .from("businesses")
      .update({ stripe_customer_id: customerId })
      .eq("id", business.id);
  }

  const base = siteUrl();
  // The app-level 14-day free trial runs first and needs no card; if the
  // owner subscribes mid-trial, Stripe waits until the trial ends to
  // charge: the owner is never double-charged for trial days.
  const trialEndSecs = Math.floor(new Date(business.trial_ends_at).getTime() / 1000);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: business.id,
    metadata: { business_id: business.id },
    subscription_data: {
      metadata: { business_id: business.id },
      ...(trialEndSecs > Math.floor(Date.now() / 1000) ? { trial_end: trialEndSecs } : {}),
    },
    success_url: `${base}/owner/dashboard/settings?billing=success`,
    cancel_url: `${base}/owner/dashboard/settings?billing=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
