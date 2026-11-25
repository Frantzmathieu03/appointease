import Link from "next/link";
import { joinBusiness } from "@/lib/join-business";

/**
 * The account step for a SIGNED-IN visitor who is not yet a customer
 * of this business (per-business account model, Frantz 2026-11-25).
 * Being signed in to AppointEase does not make you a client of this
 * business: each business keeps its own customers, so booking and
 * messaging here start with joining THIS business. One tap on the
 * join button creates the membership and continues — nothing is
 * asked twice. The owner sees the same step (it is what their
 * customers see) with a note instead of a join button: owners never
 * join their own business as a customer.
 */
export default function JoinStep({
  slug,
  businessName,
  businessId,
  continuePath,
  actionLabel,
  ownerView = false,
}: {
  slug: string;
  businessName: string;
  businessId: string;
  continuePath: string;
  actionLabel: string;
  ownerView?: boolean;
}) {
  return (
    <div className="card">
      <h2>Create your account or log in</h2>
      <p className="lede" style={{ marginBottom: 16 }}>
        You are not a customer of {businessName} yet — join to continue.
      </p>
      {ownerView ? (
        <p className="small" style={{ marginBottom: 0 }}>
          You are signed in as the owner of {businessName}, so there is
          nothing for you to join — this is the account step your
          customers see before they continue.{" "}
          <Link href={`/${slug}`}>Back to your page</Link>
        </p>
      ) : (
        <form action={joinBusiness}>
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="back" value={continuePath} />
          <button className="btn btn-primary btn-block" type="submit">
            {actionLabel}
          </button>
        </form>
      )}
    </div>
  );
}
