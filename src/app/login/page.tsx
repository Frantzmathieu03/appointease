import SignInForm from "@/components/SignInForm";
import CustomerAuth from "@/components/CustomerAuth";
import BusinessContextHeader from "@/components/BusinessContextHeader";
import { businessAuthContext } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase-config";

// Customer log in. From a business's own pages (next=/<slug>/…) this
// is that business's log in screen: the same screen as its sign up,
// flipped (Customer Side Plan, Frantz 2026-11-26). Otherwise the
// platform form renders as before.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const { next, email } = await searchParams;
  const business = await businessAuthContext(next);
  if (business && next) {
    return (
      <main className="column">
        <CustomerAuth business={business} nextPath={next} initialMode="login" />
      </main>
    );
  }
  return (
    <main className="column">
      {!isSupabaseConfigured() && (
        <div className="notice">
          Demo mode. Accounts turn on when the live database is connected.
          You can still browse the sample business and try the booking flow.
        </div>
      )}
      <BusinessContextHeader next={next} />
      <SignInForm
        nextPath={next ?? "/my-appointments"}
        signupHref={next ? `/signup?next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email)}` : ""}` : "/signup"}
        initialEmail={email ?? ""}
      />
    </main>
  );
}
