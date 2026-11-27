import { createServerSupabase } from "./supabase";
import { isSupabaseConfigured } from "./supabase-config";

// Business context for the platform /login and /signup pages
// (Customer Side Plan, Frantz 2026-11-26): when a customer arrives
// from a business's own pages, the return path (next=/<slug>/…)
// names that business, and the auth screen becomes THAT business's
// sign up / log in screen: its logo, its name, and the promise that
// the account lives only with that office. Anything unexpected: no
// next, a reserved path, an unknown or unpublished slug, a database
// error: resolves to null and the pages render their platform
// forms, exactly as before.
const RESERVED_SEGMENTS = new Set([
  "login",
  "signup",
  "owner",
  "explore",
  "about",
  "terms",
  "privacy",
  "contact",
  "my-appointments",
  "auth",
  "manage",
  "invite",
  "set-password",
]);

export interface BusinessAuthContext {
  slug: string;
  name: string;
  logoUrl: string | null;
}

export async function businessAuthContext(
  next?: string
): Promise<BusinessAuthContext | null> {
  if (!next || !isSupabaseConfigured()) return null;
  const segment = next.replace(/^\//, "").split("/")[0].split("?")[0];
  if (!segment || RESERVED_SEGMENTS.has(segment)) return null;
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("businesses")
      .select("name, logo_url")
      .eq("slug", segment)
      .eq("published", true)
      .maybeSingle();
    if (!data) return null;
    return { slug: segment, name: data.name as string, logoUrl: data.logo_url as string | null };
  } catch {
    return null;
  }
}
