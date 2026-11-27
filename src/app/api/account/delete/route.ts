import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSupabase,
  createServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase";
import {
  createDeletionRequest,
  getPendingDeletionRequest,
} from "@/lib/account-deletion";

// Account deletion with a 48 hour grace period (Frantz, 2026-11-27;
// migration 0022; App Store guideline 5.1.1(v) still applies: the
// ask happens inside the app, with no support email in the loop).
//
// POST schedules the deletion instead of running it: the session is
// the only credential, the route only ever acts on the signed in
// user's own account, and the body must carry { confirm: true } so
// a stray request can never schedule anything by accident. The two
// confirm steps live in the UI (DeleteAccountButton).
//
// The account keeps working normally during the 48 hours. The
// person can undo the ask through POST /api/account/delete/cancel,
// and GET on this same route tells the Settings and My pages
// whether an ask is pending and when it falls due. When the time
// comes, the cron processor (/api/cron/deletions) runs the deletion
// itself through the exact steps in lib/account-deletion.ts:
// subscriptions cancelled first (stopping if Stripe refuses),
// future appointments cancelled, messages and form submissions
// deleted, then the auth user deleted with the schema cascades
// carrying the rest.
//
// Until migration 0022 lands, the request table does not exist:
// POST answers that deletion is being set up and schedules nothing,
// and GET simply reports no pending request, so the pages render
// exactly as before.
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Demo mode. Accounts turn on with the live database." },
      { status: 400 }
    );
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || body.confirm !== true) {
    return NextResponse.json(
      { error: "Deletion was not confirmed." },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = createAdminSupabase();
  const { request, tableReady } = await createDeletionRequest(admin, user);
  if (!tableReady) {
    return NextResponse.json(
      { error: "Account deletion is being set up right now. Please try again later." },
      { status: 503 }
    );
  }
  if (!request) {
    return NextResponse.json(
      { error: "Scheduling the deletion failed. Please try again in a moment." },
      { status: 500 }
    );
  }
  return NextResponse.json({
    ok: true,
    scheduled: true,
    requestedAt: request.requested_at,
    dueAt: request.due_at,
  });
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ pending: false, dueAt: null, demoMode: true });
  }
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = createAdminSupabase();
  const { request } = await getPendingDeletionRequest(admin, user.id);
  return NextResponse.json({
    pending: !!request,
    requestedAt: request?.requested_at ?? null,
    dueAt: request?.due_at ?? null,
  });
}
