import { NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getOwnerBusiness, siteUrl } from "@/lib/owner";
import { getStripe, isBillingConfigured } from "@/lib/stripe";

// POST /api/billing/portal
// Opens the Stripe Customer Portal for the signed-in owner's business:
// update card, change plan, cancel. Requires the business to already
// have a Stripe customer (created at first checkout). The portal itself
// must be activated once in the Stripe dashboard (Settings → Billing →
// Customer portal): if it isn't, Stripe errors and we say so plainly.
export async function POST() {
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
      { error: "billing_not_configured", message: "Billing isn't switched on yet." },
      { status: 503 }
    );
  }
  if (!business.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account yet. Subscribe first, then you can manage it here." },
      { status: 409 }
    );
  }

  const stripe = getStripe()!;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: business.stripe_customer_id,
      return_url: `${siteUrl()}/owner/dashboard/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      {
        error: "portal_unavailable",
        message:
          "Stripe's billing portal isn't available yet. It needs a one time activation in the Stripe dashboard (Settings → Billing → Customer portal).",
        detail: String(err),
      },
      { status: 502 }
    );
  }
}
