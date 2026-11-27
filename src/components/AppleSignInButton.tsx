"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { fetchEnabledProviders } from "@/lib/auth-providers";
import AppleLogo from "@/components/AppleLogo";

/**
 * Sign in with Apple, sitting beside Continue with Google at every
 * place Google is offered (App Store prep, guideline 4.8). The
 * button renders ONLY when the Supabase project answers that the
 * Apple provider is switched on (see src/lib/auth-providers.ts):
 * while the provider is off, this component renders nothing at all,
 * so no dead button can ever ship. The day the provider is switched
 * on in Supabase, the button appears everywhere with no code change.
 *
 * The call site passes the same next path its Google button uses,
 * and the button builds the same /auth/callback redirect Google
 * builds, so Apple lands the person in exactly the same place.
 */
export default function AppleSignInButton({
  nextPath,
  onError,
  tall = false,
}: {
  nextPath: string;
  onError?: (message: string) => void;
  /** Match the taller white Google button on customer auth surfaces. */
  tall?: boolean;
}) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let live = true;
    fetchEnabledProviders().then((providers) => {
      if (live) setEnabled(providers.apple);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!enabled) return null;

  async function apple() {
    onError?.("");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (error) {
      onError?.(
        "Apple sign in is unavailable right now. Please use email and password, or try again shortly."
      );
    }
  }

  return (
    <button
      className={`btn btn-block btn-google btn-apple${tall ? " btn-apple-tall" : ""}`}
      type="button"
      onClick={apple}
      style={{ marginTop: 10 }}
    >
      <AppleLogo />
      Continue with Apple
    </button>
  );
}
