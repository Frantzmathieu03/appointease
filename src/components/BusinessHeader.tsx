import Link from "next/link";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { isBusinessMember } from "@/lib/profile";
import { isDemoShop } from "@/lib/demo";

// The slim header on a business's own pages (white label, Frantz
// 2026-11-25): the business's logo and name on the left; on the right,
// the CUSTOMER's account actions for this business. Accounts are per
// business, so "My dashboard" appears ONLY for a signed-in customer
// who is a member of THIS business (a business_customers row) and is
// not the owner. Being signed in to AppointEase alone is not enough:
// the owner testing their own page, and signed-in visitors who have
// not joined this business, see the "Sign up" and "Sign in" buttons
// (Frantz's words — real buttons, not shy text links; both carry
// next=/<slug>?join=1 so the customer lands back on this business
// AND joins it — see the join handling on the business page). Demo
// shops keep their sample behavior (any signed-in visitor sees the
// sample dashboard link). No AppointEase branding here — the only
// platform mention on a business page is the small "Powered by
// AppointEase" line at the very bottom.
export default async function BusinessHeader({
  slug,
  name,
  logoUrl,
  businessId,
  ownerId,
}: {
  slug: string;
  name: string;
  logoUrl: string | null;
  businessId: string;
  ownerId: string;
}) {
  let showDashboard = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        if (isDemoShop(slug)) {
          showDashboard = true;
        } else if (user.id !== ownerId) {
          showDashboard = await isBusinessMember(supabase, businessId, user.id);
        }
      }
    } catch {
      showDashboard = false;
    }
  }

  // Completing sign-up or sign-in from THIS business's page joins the
  // customer to this business (per-business account model): the
  // buttons carry the join marker in their return path, and the
  // business page itself creates the membership when a signed-in
  // non-owner lands back with it — the same ?join=1 mechanism as the
  // booking and message gates. Demo shops keep their plain return.
  const nextPath = isDemoShop(slug) ? `/${slug}` : `/${slug}?join=1`;

  return (
    <header className="biz-header">
      <Link href={`/${slug}`} className="biz-header-brand">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="biz-header-logo" />
        ) : (
          <span className="biz-header-initial" aria-hidden="true">
            {name.trim().charAt(0).toUpperCase() || "?"}
          </span>
        )}
        <span className="biz-header-name">{name}</span>
      </Link>
      <nav className="biz-header-actions">
        {showDashboard ? (
          <Link href={`/${slug}/my`} className="btn btn-primary biz-header-btn">
            My dashboard
          </Link>
        ) : (
          <>
            <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="btn btn-primary biz-header-btn">
              Sign up
            </Link>
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="btn biz-header-btn">
              Sign in
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
