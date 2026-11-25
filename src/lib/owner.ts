import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabase } from "./supabase";
import type { Business, BusinessMember, MemberRole } from "./types";

export { BUSINESS_TYPES } from "./owner-shared";

/** The signed-in owner's business (first created), or null. */
export async function getOwnerBusiness(
  supabase: SupabaseClient,
  userId: string
): Promise<Business | null> {
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Business) ?? null;
}

/**
 * For owner pages: signed-in user + their business, or redirect away.
 * Wrapped in React cache() so the layout and the page share one
 * auth.getUser call per request instead of resolving it twice.
 */
export const requireUser = cache(
  async (): Promise<{ supabase: SupabaseClient; user: User }> => {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/owner");
    return { supabase, user };
  }
);

/**
 * The user's team membership (migration 0011), or null. Before the
 * migration is applied the table doesn't exist and this returns null —
 * callers fall back to plain owner behavior, exactly as before.
 */
export async function getMembership(
  supabase: SupabaseClient,
  userId: string
): Promise<BusinessMember | null> {
  try {
    const { data, error } = await supabase
      .from("business_members")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return (data as BusinessMember) ?? null;
  } catch {
    return null;
  }
}

export interface BusinessAccess {
  supabase: SupabaseClient;
  user: User;
  business: Business;
  /** 'owner' for the business owner (implicit), else the member's role. */
  role: MemberRole;
  /** For staff logins: the staff row their view is scoped to. */
  memberStaffId: string | null;
  member: BusinessMember | null;
}

/**
 * Wrapped in React cache(): the dashboard layout and each page both
 * call this, and per request they now share one resolution (one auth
 * call, one businesses query) instead of running the chain twice.
 */
export const requireBusiness = cache(async (): Promise<BusinessAccess> => {
  const { supabase, user } = await requireUser();
  const owned = await getOwnerBusiness(supabase, user.id);
  if (owned) {
    return { supabase, user, business: owned, role: "owner", memberStaffId: null, member: null };
  }
  // Team login (migration 0011): no business of their own, but an active
  // membership in someone else's. RLS (businesses_member_read) lets the
  // member read that business row once the migration is applied.
  const member = await getMembership(supabase, user.id);
  if (member) {
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", member.business_id)
      .maybeSingle();
    if (data) {
      return {
        supabase,
        user,
        business: data as Business,
        role: member.role,
        memberStaffId: member.staff_id,
        member,
      };
    }
  }
  redirect("/owner/setup");
});

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://appointease.io";
}
