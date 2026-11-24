// Supabase Edge Function: reminders trigger.
//
// The reminder engine itself lives in the Next.js app (src/lib/reminders.ts)
// and is exposed at GET /api/cron/reminders. This function is the
// Supabase-side scheduling hook: invoke it on a schedule (pg_cron + pg_net,
// or any external pinger) and it calls the app endpoint with the shared
// secret. Set these Edge Function secrets first:
//   APP_URL      — e.g. https://appointease.io
//   CRON_SECRET  — must match the app's CRON_SECRET env var
//
// (Vercel Cron can also call the app endpoint directly — see vercel.json.
// Use one scheduler, not both, or reminders would be processed twice per
// window; the processor is idempotent per reminder row, so a double call
// is harmless but wasteful.)

Deno.serve(async () => {
  const appUrl = Deno.env.get("APP_URL");
  const secret = Deno.env.get("CRON_SECRET");
  if (!appUrl || !secret) {
    return new Response(
      JSON.stringify({ ok: false, error: "APP_URL / CRON_SECRET secrets not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const res = await fetch(`${appUrl}/api/cron/reminders`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});
