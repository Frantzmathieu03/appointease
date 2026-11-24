import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
