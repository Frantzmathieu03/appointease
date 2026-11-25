import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Make sure the customer profile row exists for this auth user.
 * The profile is only the person's name/contact basics. The ACCOUNT
 * MODEL (Frantz, 2026-11-25) is per business: a customer joins each
 * business separately (see ensureBusinessMembership), and their
 * appointments, messages and history live inside that business's
 * world — nothing mixes across businesses. Insert-only here: booking
 * flows refresh name/phone/email with the details given there.
 */
export async function ensureCustomerProfile(supabase: SupabaseClient, user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  await supabase.from("customers").upsert(
    {
      id: user.id,
      full_name: (meta.full_name as string) ?? (meta.name as string) ?? "",
      email: user.email ?? null,
      phone: (meta.phone as string) ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
}

/**
 * Is this user a customer member of THIS business? Being signed in
 * to AppointEase alone does NOT make someone a client of a business
 * (Frantz, 2026-11-25) — only the business_customers row does. The
 * business header, the booking gate and the message gate all key off
 * this check, never off the bare session. RLS lets a customer read
 * their own membership rows. Never throws.
 */
export async function isBusinessMember(
  supabase: SupabaseClient,
  businessId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("business_customers")
      .select("business_id")
      .eq("business_id", businessId)
      .eq("customer_id", userId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Join this customer to ONE business (per-business account model,
 * Frantz 2026-11-25): the business_customers row is the membership —
 * the account's home at that business. Signing up from a business's
 * page, opening its customer dashboard, messaging it, or booking with
 * it creates the membership for THAT business only. RLS lets a
 * customer insert their own membership row (customer_id = auth.uid()).
 * Never throws — membership must not break the page it rides on.
 */
export async function ensureBusinessMembership(
  supabase: SupabaseClient,
  businessId: string,
  userId: string
) {
  try {
    await supabase.from("business_customers").upsert(
      { business_id: businessId, customer_id: userId },
      { onConflict: "business_id,customer_id", ignoreDuplicates: true }
    );
  } catch {
    // Membership is created at booking time as well (via /api/book) —
    // a failed join here must never take the page down.
  }
}
