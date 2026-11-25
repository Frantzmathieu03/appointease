import Link from "next/link";
import { createAdminSupabase, createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import InviteAccept from "@/components/InviteAccept";

// Team invite landing: /invite/<token>. The token is the credential for
// VIEWING the invite; accepting requires signing in with the invited
// email address (enforced again in /api/invite/accept).
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <main className="column">
        <div className="notice">Team invites turn on when the live database is connected.</div>
      </main>
    );
  }

  const admin = createAdminSupabase();
  const { data: invite } = await admin
    .from("team_invites")
    .select("id, email, role, expires_at, accepted_at, businesses:business_id ( name )")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return (
      <main className="column">
        <h1 style={{ fontSize: 27 }}>Invite not found</h1>
        <p className="lede">This invite link isn&apos;t valid. Ask the business to send a new one.</p>
      </main>
    );
  }
  const inv = invite as unknown as {
    email: string;
    role: string;
    expires_at: string;
    accepted_at: string | null;
    businesses: { name: string } | null;
  };
  const businessName = inv.businesses?.name ?? "a business";
  const expired = new Date(inv.expires_at).getTime() < Date.now();

  const session = await createServerSupabase();
  const {
    data: { user },
  } = await session.auth.getUser();
  const next = `/invite/${token}`;

  return (
    <main className="column">
      <p className="eyebrow">{businessName}</p>
      <h1 style={{ fontSize: 27 }}>You&apos;re invited to join the team</h1>
      <p className="lede">
        {businessName} invited <strong>{inv.email}</strong> to join as{" "}
        {inv.role === "manager" ? "a manager" : "a staff member"} on AppointEase.
        {inv.role === "staff" &&
          " You'll see the customers assigned to you — your calendar, their appointments and your message threads."}
      </p>

      {inv.accepted_at ? (
        <div className="success">
          This invite was already accepted.{" "}
          <Link href="/owner/dashboard">Open the dashboard</Link>.
        </div>
      ) : expired ? (
        <div className="error">This invite has expired — ask {businessName} to send a new one.</div>
      ) : !user ? (
        <div className="card">
          <p className="small" style={{ marginTop: 0 }}>
            Sign in or create your account with <strong>{inv.email}</strong> to accept.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(next)}`}>
              Sign in
            </Link>
            <Link className="btn" href={`/signup?next=${encodeURIComponent(next)}`}>
              Create account
            </Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="small" style={{ marginTop: 0 }}>
            Signed in as {user.email}.
          </p>
          <InviteAccept token={token} />
        </div>
      )}
      <p className="small center" style={{ marginTop: 16 }}>
        Powered by AppointEase
      </p>
    </main>
  );
}
