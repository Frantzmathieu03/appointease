import BusinessChrome from "@/components/BusinessChrome";
import { getBusinessPageDataWithPreview } from "@/lib/data";
import { ensureBusinessMembership } from "@/lib/profile";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// The customer dashboard surface keeps the slim business header +
// Powered line it has always worn (BusinessChrome); only the main
// business page changed in Frantz's 2026-11-26 page plan.
//
// First-visit header fix (fix round, 2026-11-26): layouts render
// before the page, so on a customer's very first visit the header's
// membership check ran before the page's own auto-join created the
// membership row, and the header showed Sign up / Sign in next to
// the dashboard's Log out. Ensuring the membership HERE, before
// BusinessChrome renders the header, makes the first render already
// show the member state (My dashboard). The page's ensure stays as
// the backstop.
export default async function MyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const page = await getBusinessPageDataWithPreview(slug);
        if (page && page.business.owner_id !== user.id) {
          await ensureBusinessMembership(supabase, page.business.id, user.id);
        }
      }
    } catch {
      // A failed early join must never take the layout down; the
      // page ensures membership again before rendering.
    }
  }
  return <BusinessChrome slug={slug}>{children}</BusinessChrome>;
}
