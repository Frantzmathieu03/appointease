import { redirect } from "next/navigation";
import SignInForm from "@/components/SignInForm";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getOwnerBusiness } from "@/lib/owner";

// Business sign-in. Owners and customers share one Supabase Auth system;
// this door lands owners in their dashboard.
export default async function OwnerSignInPage() {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const business = await getOwnerBusiness(supabase, user.id);
      redirect(business ? "/owner/dashboard" : "/owner/setup");
    }
  }
  return (
    <main className="column">
      {!isSupabaseConfigured() && (
        <div className="notice">
          Demo mode — owner accounts turn on when the live database is connected.
        </div>
      )}
      <p className="eyebrow">For businesses</p>
      <SignInForm
        nextPath="/owner/dashboard"
        title="Business sign-in"
        subtitle="Your dashboard: today's appointments, calendar, customers and inbox."
        signupHref="/owner/signup"
        signupText="New business? Create your booking page"
      />
    </main>
  );
}
