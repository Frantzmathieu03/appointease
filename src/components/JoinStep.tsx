import { joinBusiness } from "@/lib/join-business";

/**
 * The account step for a SIGNED-IN visitor who is not yet a customer
 * of this business (per-business account model, Frantz 2026-11-25).
 * Being signed in to AppointEase does not make you a client of this
 * business: each business keeps its own customers, so booking and
 * messaging here start with joining THIS business. One tap on the
 * join button creates the membership and continues — nothing is
 * asked twice. Owners and active team members never see this step on
 * their own business: the book and message gates auto-join them
 * silently instead (Frantz, 2026-11-26).
 */
export default function JoinStep({
  businessName,
  businessId,
  continuePath,
  actionLabel,
}: {
  slug: string;
  businessName: string;
  businessId: string;
  continuePath: string;
  actionLabel: string;
}) {
  return (
    <div className="card">
      <h2>Create your account or log in</h2>
      <p className="lede" style={{ marginBottom: 16 }}>
        You are not a customer of {businessName} yet — join to continue.
      </p>
      <form action={joinBusiness}>
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="back" value={continuePath} />
        <button className="btn btn-primary btn-block" type="submit">
          {actionLabel}
        </button>
      </form>
    </div>
  );
}
