import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Make sure a global customer profile row exists for this auth user
 * (one identity across all of AppointEase). Insert-only: booking and
 * checkout flows refresh name/phone/email with the details given there.
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
