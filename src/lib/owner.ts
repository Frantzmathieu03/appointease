import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabase } from "./supabase";
import type { Business } from "./types";

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

/** For owner pages: signed-in user + their business, or redirect away. */
export async function requireUser(): Promise<{ supabase: SupabaseClient; user: User }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/owner");
  return { supabase, user };
}

export async function requireBusiness(): Promise<{
  supabase: SupabaseClient;
  user: User;
  business: Business;
}> {
  const { supabase, user } = await requireUser();
  const business = await getOwnerBusiness(supabase, user.id);
  if (!business) redirect("/owner/setup");
  return { supabase, user, business };
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://appointease.io";
}
