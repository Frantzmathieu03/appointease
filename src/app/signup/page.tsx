import SignupForm from "@/components/SignupForm";
import BusinessContextHeader from "@/components/BusinessContextHeader";
import { createServerSupabase } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase-config";

// Same slug-from-next resolution as BusinessContextHeader: when the
// customer arrived from a business's page (next=/<slug>/book), the
// signup form names that business in its one short line. Anything
// unexpected resolves to no name and the form uses its plain line.
const RESERVED_SEGMENTS = new Set([
  "login",
  "signup",
  "owner",
  "explore",
  "about",
  "terms",
  "privacy",
  "contact",
  "my-appointments",
  "auth",
]);

async function businessNameForNext(next?: string): Promise<string | undefined> {
  if (!next || !isSupabaseConfigured()) return undefined;
  const segment = next.replace(/^\//, "").split("/")[0];
  if (!segment || RESERVED_SEGMENTS.has(segment)) return undefined;
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("businesses")
      .select("name")
      .eq("slug", segment)
      .eq("published", true)
      .maybeSingle();
    return data?.name ?? undefined;
  } catch {
    return undefined;
  }
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const businessName = await businessNameForNext(next);
  return (
    <main className="column">
      <BusinessContextHeader next={next} />
      <SignupForm nextPath={next ?? "/my-appointments"} businessName={businessName} />
    </main>
  );
}
