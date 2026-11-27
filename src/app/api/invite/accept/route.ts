import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// POST /api/invite/accept  { token }
// The invite token is the credential; the signed-in user's email must
// match the invite address. Acceptance writes the business_members row
// with the service role (migration 0011): no client insert policy is
// relied on, and a token can be accepted exactly once.
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Invites aren't available yet." }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const token = body?.token ? String(body.token) : "";
  if (!token) return NextResponse.json({ error: "Missing invite token." }, { status: 400 });

  const session = await createServerSupabase();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: invite } = await admin
    .from("team_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!invite) return NextResponse.json({ error: "This invite link isn't valid." }, { status: 404 });
  if (invite.accepted_at) {
    return NextResponse.json({ error: "This invite was already accepted." }, { status: 409 });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This invite has expired. Ask the business to send a new one." }, { status: 410 });
  }
  if (!user.email || user.email.toLowerCase() !== String(invite.email).toLowerCase()) {
    return NextResponse.json(
      {
        error: `This invite was sent to ${invite.email}. Sign in with that email address to accept it.`,
      },
      { status: 403 }
    );
  }

  const { error: insErr } = await admin.from("business_members").insert({
    business_id: invite.business_id,
    user_id: user.id,
    email: user.email,
    role: invite.role,
    staff_id: invite.staff_id,
    status: "active",
  });
  if (insErr) {
    // Unique violation = already a member of this business.
    if ((insErr as { code?: string }).code === "23505") {
      return NextResponse.json({ ok: true, alreadyMember: true });
    }
    return NextResponse.json({ error: "Could not accept the invite. Please try again." }, { status: 500 });
  }
  await admin
    .from("team_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
