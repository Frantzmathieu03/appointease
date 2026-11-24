import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { processDueReminders } from "@/lib/reminders";

// GET /api/cron/reminders?key=<CRON_SECRET>
// Sends every due confirmation / 24h / 2h reminder.
// Point a scheduler at it every few minutes: Vercel Cron (see vercel.json —
// Vercel sends the secret as an Authorization: Bearer header), Supabase
// pg_cron, or any external pinger.
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
    const summary = await processDueReminders(createAdminSupabase());
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
