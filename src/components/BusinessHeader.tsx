import Link from "next/link";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// The slim header on a business's own pages (white label, Frantz
// 2026-11-25): the business's logo and name on the left; on the right,
// the CUSTOMER's account actions for this business. Signed out: two
// clear buttons, "Sign up" and "Sign in" (Frantz's words — real
// buttons, not shy text links; both carry next=/<slug> so the customer
// lands back on this business). Signed in: "My dashboard", the
// per-business customer dashboard at /<slug>/my — accounts are per
// business, so the dashboard shows only this business's appointments,
// messages and history. No AppointEase branding here — the only
// platform mention on a business page is the small "Powered by
// AppointEase" line at the very bottom.
export default async function BusinessHeader({
  slug,
  name,
  logoUrl,
}: {
  slug: string;
  name: string;
  logoUrl: string | null;
}) {
  let signedIn = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      signedIn = Boolean(user);
    } catch {
      signedIn = false;
    }
  }

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
        {signedIn ? (
          <Link href={`/${slug}/my`} className="btn btn-primary biz-header-btn">
            My dashboard
          </Link>
        ) : (
          <>
            <Link href={`/signup?next=${encodeURIComponent(`/${slug}`)}`} className="btn btn-primary biz-header-btn">
              Sign up
            </Link>
            <Link href={`/login?next=${encodeURIComponent(`/${slug}`)}`} className="btn biz-header-btn">
              Sign in
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
