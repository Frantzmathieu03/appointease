import SignupForm from "@/components/SignupForm";
import CustomerAuth from "@/components/CustomerAuth";
import BusinessContextHeader from "@/components/BusinessContextHeader";
import { businessAuthContext } from "@/lib/auth-context";

// Customer sign-up. When the customer arrived from a business's own
// pages (next=/<slug>/…), this is THAT business's sign up screen
// (Customer Side Plan, Frantz 2026-11-26): its logo, its name, the
// account-is-only-with-this-office line, and the texting consent
// box. Without a business in the return path, the platform form
// renders as before.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const { next, email } = await searchParams;
  const business = await businessAuthContext(next);
  if (business && next) {
    return (
      <main className="column">
        <CustomerAuth business={business} nextPath={next} initialMode="signup" />
      </main>
    );
  }
  return (
    <main className="column">
      <BusinessContextHeader next={next} />
      <SignupForm nextPath={next ?? "/my-appointments"} businessName={business?.name} initialEmail={email ?? ""} />
    </main>
  );
}
