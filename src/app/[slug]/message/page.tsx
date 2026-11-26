import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBusinessPageDataWithPreview } from "@/lib/data";
import { isDemoShop } from "@/lib/demo";
import { createServerSupabase } from "@/lib/supabase";
import {
  ensureBusinessMembership,
  ensureCustomerProfile,
  isBusinessMember,
} from "@/lib/profile";
import ThreadView from "@/components/ThreadView";
import JoinStep from "@/components/JoinStep";

export default async function MessagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ join?: string }>;
}) {
  const { slug } = await params;
  const { join } = await searchParams;
  const page = await getBusinessPageDataWithPreview(slug);
  if (!page) notFound();
  const { business } = page;

  // Demo shops never open a real thread: messaging is off in the demo.
  if (page.demoMode || isDemoShop(slug)) {
    return (
      <main className="column">
        <div className="notice">
          {isDemoShop(slug)
            ? "Demo shop — messaging is turned off in the demo."
            : "Demo business — messaging turns on when the live database is connected."}
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
          <Link
            href={`/login?next=${encodeURIComponent(`/${slug}/message?join=1`)}`}
            className="btn btn-primary"
          >
            Sign in to message
          </Link>
          <p className="small" style={{ marginTop: 12 }}>
            <Link href={`/${slug}`}>← Back to {business.name}</Link>
          </p>
        </div>
      </main>
    );
  }

  // Per-business accounts (Frantz, 2026-11-25): messaging a business
  // is for ITS customers. A signed-in non-member (the owner included)
  // gets the same join step as booking first — completing sign-in
  // through this business's link (the join marker) or tapping join
  // creates the membership for this business, then the thread opens.
  // Members go straight in.
  const isOwner = user.id === business.owner_id;
  const member =
    !isOwner && (await isBusinessMember(supabase, business.id, user.id));
  if (!member) {
    if (!isOwner && join) {
      await ensureCustomerProfile(supabase, user);
      await ensureBusinessMembership(supabase, business.id, user.id);
      // Joined through this business's sign-in link: land on the
      // customer's own dashboard (their thread lives there too),
      // not back at the storefront (Frantz, 2026-11-26).
      redirect(`/${slug}/my`);
    }
    return (
      <main className="column">
        <p className="eyebrow">{business.name}</p>
        <h1 style={{ fontSize: 27 }}>Messages</h1>
        <JoinStep
          slug={slug}
          businessName={business.name}
          businessId={business.id}
          continuePath={`/${slug}/message`}
          actionLabel={`Join ${business.name} and message`}
          ownerView={isOwner}
        />
        <p className="small center">
          <Link href={`/${slug}`}>← Back to {business.name}</Link>
        </p>
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
        <Link href={`/${slug}/my`}>My dashboard</Link>
      </p>
    </main>
  );
}
