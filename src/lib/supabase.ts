import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * True when a real Supabase project is wired up. While the owner creates the
 * AppointEase accounts, the .env ships with placeholder values and the site
 * runs in DEMO MODE: public pages render the seeded demo business from
 * src/lib/demo-data.ts and nothing is persisted.
 * (Implementation lives in supabase-config.ts so middleware can share it.)
 */
export { isSupabaseConfigured } from "./supabase-config";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Parameters<typeof cookieStore.set>[2];
        }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component: middleware refreshes the session.
        }
      },
    },
  });
}

/**
 * Service-role client. SERVER ONLY: bypasses RLS, used by the reminder
 * engine and other trusted jobs. Never import from client components.
 */
export function createAdminSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
