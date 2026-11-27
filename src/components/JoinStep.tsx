import { joinBusiness } from "@/lib/join-business";

/**
 * The account step for a SIGNED-IN visitor who is not yet a customer
 * of this business (per-business account model, Frantz 2026-11-25).
 * Being signed in to AppointEase does not make you a client of this
 * business: each business keeps its own customers, so booking and
 * messaging here start with joining THIS business. One tap on the
 * join button creates the membership and continues. Nothing is
 * asked twice. Owners and active team members never see this step on
 * their own business: the book and message gates auto-join them
 * silently instead (Frantz, 2026-11-26). Styled as the business's
 * own welcome card, same as the logged-out account step.
 */
export default function JoinStep({
  businessName,
  businessId,
  continuePath,
  actionLabel,
  logoUrl,
}: {
  slug: string;
  businessName: string;
  businessId: string;
  continuePath: string;
  actionLabel: string;
  logoUrl?: string | null;
}) {
  return (
    <div className="card gate-card">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="gate-logo" src={logoUrl} alt="" />
      ) : (
        <span className="gate-initial" aria-hidden="true">
          {businessName.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
      <p className="gate-biz">{businessName}</p>
      <h2 className="gate-title">Create your account or log in</h2>
      <p className="lede gate-lede">
        You are not a customer of {businessName} yet. Join to continue.
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
