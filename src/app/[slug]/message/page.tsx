import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusinessPageData } from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase";
import { ensureCustomerProfile } from "@/lib/profile";
import ThreadView from "@/components/ThreadView";

export default async function MessagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getBusinessPageData(slug);
  if (!page) notFound();
  const { business } = page;

  if (page.demoMode) {
    return (
      <main className="column">
        <div className="notice">
          Demo business — messaging turns on when the live database is connected.
        </div>
        <div className="card">
          <h2>Message {business.name}</h2>
          <p className="lede" style={{ marginBottom: 0 }}>
            Customers will chat with the business right here, and the business
            gets an email, text and push alert the moment a message lands —
            no message sits unseen.
          </p>
        </div>
        <p className="small center">
          <Link href={`/${slug}`}>← Back to {business.name}</Link>
        </p>
      </main>
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="column">
        <div className="card center">
          <h2>Message {business.name}</h2>
          <p className="lede">
            Sign in (or create your free account) to message the business —
            your conversation stays saved here, and we alert you the moment
            they reply.
          </p>
          <Link href={`/login?next=/${slug}/message`} className="btn btn-primary">
            Sign in to message
          </Link>
          <p className="small" style={{ marginTop: 12 }}>
            <Link href={`/${slug}`}>← Back to {business.name}</Link>
          </p>
        </div>
      </main>
    );
  }

  await ensureCustomerProfile(supabase, user);

  return (
    <main className="column">
      <p className="eyebrow">{business.name}</p>
      <h1 style={{ fontSize: 27 }}>Messages</h1>
      <div className="card">
        <ThreadView businessId={business.id} customerId={user.id} viewer="customer" />
      </div>
      <p className="small center">
        <Link href={`/${slug}`}>← Back to {business.name}</Link> ·{" "}
        <Link href="/my-appointments">My appointments</Link>
      </p>
    </main>
  );
}
