"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import GoogleLogo from "@/components/GoogleLogo";

/**
 * Account step at the front of booking from a business's page
 * (Frantz, 2026-11-25): booking belongs to the customer's account
 * WITH THIS BUSINESS — no more anonymous guest checkout from the
 * business page. Google first (one tap), or the existing email
 * sign-up / sign-in pages, always with next set back into this
 * booking so nothing is asked twice. The return path carries the
 * join marker (?join=1): completing sign-in or sign-up through THIS
 * business's account step is what joins the customer to this
 * business — the book page sees the marker, creates the membership,
 * and continues into booking. Phone-code sign-in is NOT offered:
 * Supabase reports the phone provider disabled (texting is not
 * connected yet), and a button that cannot send a code is never
 * shipped.
 */
export default function AccountGate({
  slug,
  businessName,
}: {
  slug: string;
  businessName: string;
}) {
  const [error, setError] = useState("");
  const back = `/${slug}/book?join=1`;

  async function google() {
    setError("");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(back)}`,
      },
    });
    if (error) {
      setError(
        "Google sign-in is unavailable right now — please use email below, or try again shortly."
      );
    }
  }

  return (
    <div className="card">
      <h2>Create your account or log in</h2>
      <p className="lede" style={{ marginBottom: 16 }}>
        Your account is only with {businessName}.
      </p>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-primary btn-block" type="button" onClick={google}>
        <GoogleLogo />
        Continue with Google
      </button>
      <p className="small center" style={{ margin: "12px 0 14px" }}>
        or use email
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <Link
          href={`/signup?next=${encodeURIComponent(back)}`}
          className="btn btn-block"
          style={{ flex: 1, textAlign: "center" }}
        >
          Create account
        </Link>
        <Link
          href={`/login?next=${encodeURIComponent(back)}`}
          className="btn btn-block"
          style={{ flex: 1, textAlign: "center" }}
        >
          Sign in
        </Link>
      </div>
      <p className="small center" style={{ marginTop: 14 }}>
        New here? Creating your account takes a few seconds.
      </p>
    </div>
  );
}
