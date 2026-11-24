// Client-safe Supabase configuration check (no server imports).
// The app runs in DEMO MODE until a real project is wired via env vars.
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return (
    url.startsWith("https://") &&
    !url.includes("placeholder") &&
    anonKey.length > 20 &&
    !anonKey.includes("placeholder")
  );
}
