import SignInForm from "@/components/SignInForm";
import BusinessContextHeader from "@/components/BusinessContextHeader";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="column">
      {!isSupabaseConfigured() && (
        <div className="notice">
          Demo mode — accounts turn on when the live database is connected.
          You can still browse the sample business and try the booking flow.
        </div>
      )}
      <BusinessContextHeader next={next} />
      <SignInForm
        nextPath={next ?? "/my-appointments"}
        signupHref={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
      />
    </main>
  );
}
