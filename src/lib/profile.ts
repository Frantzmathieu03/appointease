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
 * Is this user on the business's own team (an active business_members
 * row — manager or staff)? The owner is checked separately against
 * businesses.owner_id. Owners and team members never hit the customer
 * join wall on their own business (Frantz, 2026-11-26): the gates
 * auto-join them as customers instead, and the business headers show
 * them their owner dashboard link.
 */
export async function isBusinessTeamMember(
  supabase: SupabaseClient,
  businessId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("business_members")
      .select("id")
      .eq("business_id", businessId)
      .eq("user_id", userId)
      .eq("status", "active")
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
  userId: string,
  opts?: { smsConsent?: boolean }
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
  if (opts?.smsConsent) {
    await recordSmsConsent(supabase, businessId, userId);
  }
}

/**
 * Record the customer's texting consent for THIS business (Customer
 * Side Plan, Frantz 2026-11-26): the "Text me reminders and replies.
 * Reply STOP anytime." box on the business's sign-up screen starts
 * unchecked; when it is ticked, the join that follows carries the
 * consent marker and the moment is stamped on the membership row
 * (business_customers.sms_consent_at, migration 0016). Only the
 * first stamp is kept — re-joining never moves it. Feature-detected:
 * before the migration lands the update errors and is quietly
 * ignored, like every other membership write. Never throws.
 */
export async function recordSmsConsent(
  supabase: SupabaseClient,
  businessId: string,
  userId: string
) {
  try {
    const { error } = await supabase
      .from("business_customers")
      .update({ sms_consent_at: new Date().toISOString() })
      .eq("business_id", businessId)
      .eq("customer_id", userId)
      .is("sms_consent_at", null);
    if (error) {
      // Column missing (pre-0016) or policy refusal — consent is
      // additive; the join itself already succeeded.
      return;
    }
  } catch {
    // Never break the page over a consent stamp.
  }
}
