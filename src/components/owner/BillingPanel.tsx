"use client";

import { useState } from "react";
import {
  PLANS,
  annualCents,
  formatPlanPrice,
  staffLimitLabel,
  type BillingPhase,
  type PlanId,
} from "@/lib/plans";

// Owner Settings → Plan & billing. All money movement happens on Stripe's
// hosted pages: Subscribe opens Stripe Checkout; Manage billing opens the
// Stripe Customer Portal (change plan, update card, cancel there). This
// component only starts those sessions via /api/billing/*.
//
// When Stripe isn't configured yet (no keys/prices in env), the panel is
// honest about it: prices are shown, buttons are disabled, and the trial
// simply keeps running: nobody is charged and nothing pretends to be.

interface Props {
  billingConfigured: boolean;
  annualConfigured: boolean;
  currentPlanId: PlanId;
  phase: BillingPhase;
  subscriptionStatus: string | null;
  hasStripeCustomer: boolean;
  trialEndLabel: string;
  periodEndLabel: string | null;
  pausesAtLabel: string | null;
}

export default function BillingPanel(props: Props) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [selected, setSelected] = useState<PlanId>(props.currentPlanId);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const hasLiveSubscription =
    props.hasStripeCustomer &&
    ["active", "trialing", "past_due"].includes(props.subscriptionStatus ?? "");

  async function go(path: string, body?: Record<string, unknown>, key = "go") {
    setBusy(key);
    setError("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.message ?? data.error ?? "Something went wrong. Please try again.");
        setBusy("");
        return;
      }
      window.location.href = data.url as string;
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy("");
    }
  }

  const statusLine = (() => {
    switch (props.phase) {
      case "trial":
        return (
          <p className="lede" style={{ marginBottom: 6 }}>
            Free trial until <strong>{props.trialEndLabel}</strong>. No card
            required, and your booking page is live.
          </p>
        );
      case "active":
        return (
          <p className="lede" style={{ marginBottom: 6 }}>
            <strong>{PLANS.find((p) => p.id === props.currentPlanId)?.name} plan</strong>.
            Subscription active.
            {props.periodEndLabel && <> Current period ends {props.periodEndLabel}.</>}
          </p>
        );
      case "grace":
        return (
          <p className="lede" style={{ marginBottom: 6 }}>
            There&apos;s a problem with your subscription payment. Your booking
            page stays live until <strong>{props.pausesAtLabel}</strong>. Update
            your payment method before then to keep it running.
          </p>
        );
      case "paused":
        return (
          <p className="lede" style={{ marginBottom: 6 }}>
            Your free trial has ended and your booking page is{" "}
            <strong>paused</strong>. Subscribe below to reactivate it. Your
            services, customers and appointments are all still here.
          </p>
        );
    }
  })();

  return (
    <div>
      {statusLine}
      {error && <div className="error">{error}</div>}

      {props.annualConfigured && props.billingConfigured && !hasLiveSubscription && (
        <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
          <button
            className={interval === "month" ? "btn btn-primary" : "btn"}
            onClick={() => setInterval("month")}
          >
            Monthly
          </button>
          <button
            className={interval === "year" ? "btn btn-primary" : "btn"}
            onClick={() => setInterval("year")}
          >
            Annual: 2 months free
          </button>
        </div>
      )}

      <div style={{ display: "grid", gap: 8, margin: "10px 0" }}>
        {PLANS.map((plan) => {
          const price =
            interval === "year" ? formatPlanPrice(annualCents(plan)) : formatPlanPrice(plan.monthlyCents);
          const isCurrent = plan.id === props.currentPlanId;
          return (
            <label
              key={plan.id}
              className="card"
              style={{
                margin: 0,
                cursor: props.billingConfigured && !hasLiveSubscription ? "pointer" : "default",
                outline: selected === plan.id && !hasLiveSubscription ? "2px solid var(--green)" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>
                    {plan.name}
                    {isCurrent ? " · your plan" : ""}
                  </strong>
                  <div className="small">
                    {plan.staffLimit === 1
                      ? "1 team member"
                      : `Up to ${staffLimitLabel(plan)} team members`}{" "}
                    · {plan.blurb}
                  </div>
                </div>
                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <strong>{price}</strong>
                  <div className="small">{interval === "year" ? "/ year" : "/ month"}</div>
                </div>
              </div>
              {!hasLiveSubscription && (
                <input
                  type="radio"
                  name="plan"
                  value={plan.id}
                  checked={selected === plan.id}
                  onChange={() => setSelected(plan.id)}
                  disabled={!props.billingConfigured}
                  style={{ marginTop: 8 }}
                />
              )}
            </label>
          );
        })}
      </div>

      {!props.billingConfigured ? (
        <>
          <button className="btn btn-primary btn-block" disabled>
            Subscribe (coming soon)
          </button>
          <p className="small" style={{ marginTop: 8 }}>
            Online billing isn&apos;t switched on yet. When AppointEase&apos;s
            Stripe account is connected, you&apos;ll subscribe right here.
            Until then your page keeps running, with no charge, ever, without you
            checking out first.
          </p>
        </>
      ) : hasLiveSubscription ? (
        <>
          <button
            className="btn btn-primary btn-block"
            disabled={busy !== ""}
            onClick={() => go("/api/billing/portal", undefined, "portal")}
          >
            {busy === "portal" ? "Opening…" : "Manage billing: change plan, update card, cancel"}
          </button>
          <p className="small" style={{ marginTop: 8 }}>
            Plan changes, payment methods and cancellation live in Stripe&apos;s
            secure billing portal.
          </p>
        </>
      ) : (
        <button
          className="btn btn-primary btn-block"
          disabled={busy !== ""}
          onClick={() => go("/api/billing/checkout", { plan: selected, interval }, "checkout")}
        >
          {busy === "checkout"
            ? "Opening secure checkout…"
            : props.phase === "paused"
              ? "Subscribe to reactivate"
              : "Subscribe"}
        </button>
      )}
    </div>
  );
}
