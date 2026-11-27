import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

// POST /api/reviews { appointmentId, rating, comment? }
// Carried over from the old app: one review per appointment, written only
// by that appointment's customer (enforced again by RLS on insert).
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Demo mode. Reviews are not saved yet." }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const appointmentId: string = body?.appointmentId ?? "";
  const rating: number = Number(body?.rating);
  const comment: string | null = body?.comment?.trim() ? String(body.comment).trim() : null;
  if (!appointmentId || !(rating >= 1 && rating <= 5)) {
    return NextResponse.json({ error: "appointmentId and a rating from 1 to 5 are required" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, business_id, customer_id")
    .eq("id", appointmentId)
    .single();
  if (!appt || appt.customer_id !== user.id) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const { error } = await supabase.from("reviews").insert({
    business_id: appt.business_id,
    customer_id: user.id,
    appointment_id: appointmentId,
    rating,
    comment,
  });
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "You already reviewed this appointment." }, { status: 409 });
    }
    return NextResponse.json({ error: "Review failed. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
