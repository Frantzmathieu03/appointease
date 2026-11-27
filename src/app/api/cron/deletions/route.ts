import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { processDueDeletionRequests } from "@/lib/account-deletion";

// GET /api/cron/deletions?key=<CRON_SECRET>
// Carries out account deletions whose 48 hour grace period has run
// out (Frantz, 2026-11-27; migration 0022). Each due request runs
// the exact deletion steps in lib/account-deletion.ts. A request
// whose deletion stops stays pending and is counted as failed, so
// the next sweep tries it again.
// Point a scheduler at it every few minutes, the same pattern as
// /api/cron/reminders: Vercel Cron (the secret arrives as an
// Authorization: Bearer header), Supabase pg_cron, or any external
// pinger.
// Until migration 0022 lands, the sweep simply reports that the
// table is not there yet and processes nothing.
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const key =
    req.nextUrl.searchParams.get("key") ?? req.headers.get("x-cron-secret") ?? bearer;
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demoMode: true, processed: 0 });
  }
  try {
    const summary = await processDueDeletionRequests(createAdminSupabase());
    return NextResponse.json({
      ok: true,
      processed: summary.processed,
      failed: summary.failed,
      ...(summary.tableReady ? {} : { pendingMigration: true }),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
