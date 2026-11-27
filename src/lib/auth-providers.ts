// Which social sign in providers the Supabase project actually has
// switched on, asked from the project itself. The auth settings
// endpoint is public on purpose: it answers with the anon key and
// lists every external provider as on or off. The Apple button
// renders only when this probe says Apple is on, so the button can
// never sit on a page dead while the provider is still off in
// Supabase (App Store prep, guideline 4.8: Sign in with Apple ships
// beside Google the day the provider is switched on, with no code
// change needed then). Client side only.

export interface EnabledProviders {
  google: boolean;
  apple: boolean;
}

let cached: Promise<EnabledProviders> | null = null;

export function fetchEnabledProviders(): Promise<EnabledProviders> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  cached = (async (): Promise<EnabledProviders> => {
    try {
      const res = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: anonKey },
      });
      if (!res.ok) return { google: true, apple: false };
      const data = (await res.json()) as {
        external?: Record<string, boolean>;
      };
      const external = data.external ?? {};
      return {
        google: external.google === true,
        apple: external.apple === true,
      };
    } catch {
      // A failed probe must never break the sign in page: Google
      // keeps its long standing always rendered path, and Apple
      // simply stays hidden until a probe succeeds.
      return { google: true, apple: false };
    }
  })();
  return cached;
}
