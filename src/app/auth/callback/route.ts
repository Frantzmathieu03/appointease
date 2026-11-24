import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// OAuth (Google) + email-confirmation landing: exchange the code for a
// session cookie, then send the user where they were headed.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "/my-appointments";
  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, req.url));
}
