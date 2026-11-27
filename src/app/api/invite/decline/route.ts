import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";

// POST /api/invite/decline — body { token }.
// Declining a team invite (migration 0019): the token is the
// credential, no sign-in needed, the same trust level as viewing
// the invite. Sets team_invites.declined_at; the Team page then
// shows the invite as Declined and no seat is ever consumed.
// Guards: unknown token 404; already accepted or already declined
// 409; expired 410. Before migration 0019 lands the update errors
// on the missing column and the route answers 501 so the landing
// page can say plainly that declining is not on yet, instead of
// pretending it saved.
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Invites are not on yet." }, { status: 501 });
  }
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const admin = createAdminSupabase();
  const { data: invite } = await admin
    .from("team_invites")
    .select("id, accepted_at, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!invite) return NextResponse.json({ error: "That invite is gone." }, { status: 404 });
  const inv = invite as { id: string; accepted_at: string | null; expires_at: string };
  if (inv.accepted_at) {
    return NextResponse.json({ error: "That invite was already accepted." }, { status: 409 });
  }
  if (new Date(inv.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "That invite has expired." }, { status: 410 });
  }

  const { error } = await admin
    .from("team_invites")
    .update({ declined_at: new Date().toISOString() })
    .eq("id", inv.id)
    .is("declined_at", null);
  if (error) {
    if (/declined_at/.test(error.message)) {
      return NextResponse.json(
        { error: "Declining is not on yet. Please check back soon." },
        { status: 501 }
      );
    }
    return NextResponse.json({ error: "Could not save that. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
