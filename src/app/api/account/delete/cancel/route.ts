import { NextResponse } from "next/server";
import {
  createAdminSupabase,
  createServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { cancelDeletionRequest } from "@/lib/account-deletion";

// POST /api/account/delete/cancel: undo a pending account deletion
// (the 48 hour grace period, Frantz 2026-11-27, migration 0022).
// The session is the only credential: the route cancels the signed
// in user's own pending request and nothing else. Cancelling when
// nothing is pending is a calm no-op that simply says so.
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Demo mode. Accounts turn on with the live database." },
      { status: 400 }
    );
  }
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = createAdminSupabase();
  const { cancelled, tableReady } = await cancelDeletionRequest(admin, user.id);
  if (!tableReady) {
    return NextResponse.json(
      { error: "Account deletion is being set up right now. Please try again later." },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true, cancelled });
}
