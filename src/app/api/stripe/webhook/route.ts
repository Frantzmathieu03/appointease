import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { businessIdForSubscription, syncSubscription } from "@/lib/stripe-sync";

// POST /api/stripe/webhook
// Stripe → AppointEase billing sync. The signature is verified against
// STRIPE_WEBHOOK_SECRET before anything is trusted. Handled events:
//   checkout.session.completed          → attach subscription to business
//   customer.subscription.created       → sync plan/status/period end
//   customer.subscription.updated       → sync (incl. past_due, cancels)
//   customer.subscription.deleted       → sync (status becomes canceled)
//   invoice.payment_failed              → sync the subscription (past_due)
// Idempotent two ways: every event id is recorded in stripe_events
// (redeliveries are skipped), and each handler re-reads the
// subscription's current state and writes it wholesale, so replays and
// out-of-order deliveries converge to the same businesses row.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Billing webhook is not configured." }, { status: 503 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Signature verification failed." }, { status: 400 });
  }

  const admin = createAdminSupabase();

  // Dedupe: one row per event id. A conflict means Stripe redelivered.
  const { error: dedupeError } = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (dedupeError) {
    if ((dedupeError as { code?: string }).code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // If the dedupe table itself is unreachable, keep going — the sync
    // below is state-based and safe to repeat.
    console.error("stripe_events insert failed:", dedupeError.message);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId =
          session.metadata?.business_id ?? session.client_reference_id ?? null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (businessId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(admin, businessId, sub);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const businessId = await businessIdForSubscription(admin, sub);
        if (businessId) {
          // Re-read for created/updated so we never write a stale snapshot;
          // for deleted, the event object IS the final state.
          const fresh =
            event.type === "customer.subscription.deleted"
              ? sub
              : await stripe.subscriptions.retrieve(sub.id);
          await syncSubscription(admin, businessId, fresh);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const legacySub = (invoice as unknown as { subscription?: string | null }).subscription;
        const nestedSub = (
          invoice as unknown as {
            parent?: { subscription_details?: { subscription?: string | null } };
          }
        ).parent?.subscription_details?.subscription;
        const subscriptionId = legacySub ?? nestedSub ?? null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const businessId = await businessIdForSubscription(admin, sub);
          if (businessId) await syncSubscription(admin, businessId, sub);
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged and ignored.
        break;
    }
  } catch (err) {
    // Return 500 so Stripe retries — and remove the dedupe row first, so
    // the retry re-enters the handler instead of being skipped as a
    // duplicate. The sync itself is state-based, so reprocessing is safe.
    await admin.from("stripe_events").delete().eq("id", event.id);
    console.error(`Stripe webhook ${event.type} handling failed:`, err);
    return NextResponse.json({ error: "Handler failed; please retry." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
