import SignupForm from "@/components/SignupForm";
import BusinessContextHeader from "@/components/BusinessContextHeader";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="column">
      <BusinessContextHeader next={next} />
      <SignupForm nextPath={next ?? "/my-appointments"} />
    </main>
  );
}
