"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase";
import { ensureBusinessMembership, ensureCustomerProfile } from "@/lib/profile";

/**
 * The deliberate join behind the JoinStep card (per-business account
 * model, Frantz 2026-11-25): a signed-in visitor who is not yet a
 * customer of this business joins THIS business only: the
 * business_customers row is created through the existing membership
 * path: and lands right back where they were headed (the booking
 * flow or the message thread), with nothing re-asked. The owner
 * never joins their own business as a customer. Best-effort: the
 * destination page re-checks membership and shows the join step
 * again if anything failed.
 */
export async function joinBusiness(formData: FormData) {
  const businessId = String(formData.get("businessId") ?? "");
  const rawBack = String(formData.get("back") ?? "/");
  const back =
    rawBack.startsWith("/") && !rawBack.startsWith("//") ? rawBack : "/";

  if (businessId) {
    try {
      const supabase = await createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("owner_id")
          .eq("id", businessId)
          .maybeSingle();
        // An unreadable row still joins (the owner can always read
        // their own business, so a null here is not the owner).
        if (!biz || biz.owner_id !== user.id) {
          await ensureCustomerProfile(supabase, user);
          await ensureBusinessMembership(supabase, businessId, user.id);
        }
      }
    } catch {
      // Fall through to the redirect: the destination re-checks.
    }
  }
  redirect(back);
}
