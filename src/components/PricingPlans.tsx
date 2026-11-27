"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, formatPlanPrice, annualCents } from "@/lib/plans";

/**
 * Homepage pricing: the three plan cards with a Monthly / Yearly
 * pill toggle above them (Frantz, 2026-11-26). Prices come from
 * lib/plans, the single source of truth: Monthly shows the monthly
 * price; Yearly shows the annual price (2 months free already in
 * it) with a plain note saying so. The Start free buttons and the
 * trial flow are unchanged.
 */
export default function PricingPlans() {
  const [yearly, setYearly] = useState(false);
  return (
    <>
      <div className="hp-billing-toggle" role="group" aria-label="Billing period">
        <button
          type="button"
          className={`hp-billing-pill${!yearly ? " on" : ""}`}
          aria-pressed={!yearly}
          onClick={() => setYearly(false)}
        >
          Monthly
        </button>
        <button
          type="button"
          className={`hp-billing-pill${yearly ? " on" : ""}`}
          aria-pressed={yearly}
          onClick={() => setYearly(true)}
        >
          Yearly
        </button>
      </div>
      {yearly && <p className="hp-billing-note">Yearly plans include 2 months free.</p>}
      <div className="pricing-grid">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`price-card${plan.id === "team" ? " featured" : ""}`}>
            {plan.id === "team" && <span className="price-badge">Most popular</span>}
            <div className="price-name">{plan.name}</div>
            <div className="price-amount">
              {yearly ? formatPlanPrice(annualCents(plan)) : formatPlanPrice(plan.monthlyCents)}
              <span>{yearly ? "/yr" : "/mo"}</span>
            </div>
            <ul className="price-features">
              {plan.features.map((f) => (
                <li key={f}><span className="price-check" aria-hidden="true">✓</span>{f}</li>
              ))}
            </ul>
            <Link href="/owner/signup" className={`btn ${plan.id === "team" ? "btn-primary" : ""} btn-block`}>
              Start free
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
