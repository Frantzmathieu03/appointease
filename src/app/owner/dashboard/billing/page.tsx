import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/owner";
import BillingPanel from "@/components/owner/BillingPanel";
import { formatPlanPrice, getBillingState, planById, staffLimitLabel } from "@/lib/plans";
import { isAnnualBillingConfigured, isBillingConfigured } from "@/lib/stripe";

// Billing: the owner's own AppointEase subscription — the ONLY money
// on this page, and the only money AppointEase ever touches. What
// customers pay the business happens between them and the business,
// outside AppointEase, and never appears here.
export default async function DashboardBillingPage() {
  const { supabase, business, role } = await requireBusiness();
  // Billing is the owner's alone — managers see everything at the
  // business EXCEPT billing and team management (2026-11-26 plan).
  if (role !== "owner") redirect("/owner/dashboard");

  const billing = getBillingState(business);
  const plan = planById(business.plan);
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });

  const trialDaysLeft =
    billing.phase === "trial"
      ? Math.max(0, Math.ceil((new Date(business.trial_ends_at).getTime() - Date.now()) / 86400000))
      : null;

  // Seats: staff calendars in use vs the plan's limit, and team logins
  // (you + invited members). business_members arrives with migration
  // 0011 — counted defensively.
  const { count: staffCount } = await supabase
    .from("staff")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("active", true);
  let memberCount: number | null = null;
  const membersRes = await supabase
    .from("business_members")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("status", "active");
  if (!membersRes.error) memberCount = membersRes.count ?? 0;

  // Texts sent this month: counted from the reminder records — only
  // rows actually marked sent. If the records can't be read, the page
  // says texting isn't connected instead of inventing a number.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const smsRes = await supabase
    .from("reminders")
    .select("id, appointments!inner ( business_id )", { count: "exact", head: true })
    .eq("channel", "sms")
    .eq("status", "sent")
    .gte("sent_at", monthStart.toISOString())
    .eq("appointments.business_id", business.id);
  const textsSent = smsRes.error ? null : (smsRes.count ?? 0);

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Billing</h1>
      <p className="small" style={{ marginTop: 0 }}>
        This is your AppointEase plan — what you pay us for the booking
        page. Money from your customers is always between you and them;
        AppointEase never touches it.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div className="card" style={{ margin: 0 }}>
          <p className="eyebrow">Your plan</p>
          <p className="lede" style={{ margin: "4px 0" }}>
            {plan.name} — {formatPlanPrice(plan.monthlyCents)}/month
          </p>
          <p className="small" style={{ margin: 0 }}>
            {billing.phase === "trial" && trialDaysLeft !== null
              ? `Free trial — ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left (ends ${fmtDate(business.trial_ends_at)})`
              : billing.phase === "active"
                ? "Subscription active"
                : billing.phase === "grace"
                  ? "Payment problem — fix it below to keep your page live"
                  : "Trial ended — subscribe below to turn your page back on"}
          </p>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <p className="eyebrow">Team seats</p>
          <p className="lede" style={{ margin: "4px 0" }}>
            {Number.isFinite(plan.staffLimit)
              ? `${staffCount ?? 0} of ${plan.staffLimit} staff calendars used`
              : `${staffCount ?? 0} staff calendars used · ${staffLimitLabel(plan)} on this plan, no cap`}
          </p>
          <p className="small" style={{ margin: 0 }}>
            {memberCount !== null
              ? `${memberCount + 1} team login${memberCount + 1 === 1 ? "" : "s"} (you${memberCount > 0 ? ` + ${memberCount} invited` : ""})`
              : "Team logins show here once your team is set up"}
          </p>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <p className="eyebrow">Text reminders</p>
          <p className="lede" style={{ margin: "4px 0" }}>
            {textsSent === null ? "Not connected yet" : `${textsSent} sent this month`}
          </p>
          <p className="small" style={{ margin: 0 }}>
            {textsSent === null
              ? "Text reminders turn on when texting is connected — email reminders already work."
              : "Counted from reminders actually sent — confirmations, 24-hour and 2-hour reminders."}
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Change plan or payment</h2>
        <BillingPanel
          billingConfigured={isBillingConfigured()}
          annualConfigured={isAnnualBillingConfigured()}
          currentPlanId={plan.id}
          phase={billing.phase}
          subscriptionStatus={billing.subscriptionStatus}
          hasStripeCustomer={!!business.stripe_customer_id}
          trialEndLabel={fmtDate(business.trial_ends_at)}
          periodEndLabel={billing.currentPeriodEnd ? fmtDate(billing.currentPeriodEnd) : null}
          pausesAtLabel={billing.pausesAt ? fmtDate(billing.pausesAt) : null}
        />
      </div>
    </div>
  );
}
