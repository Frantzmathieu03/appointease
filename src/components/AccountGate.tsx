"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import GoogleLogo from "@/components/GoogleLogo";
import AppleSignInButton from "@/components/AppleSignInButton";

/**
 * Account step at the front of booking from a business's page
 * (Frantz, 2026-11-25): booking belongs to the customer's account
 * WITH THIS BUSINESS. No more anonymous guest checkout from the
 * business page. Google first (one tap), or the existing email
 * sign-up / sign-in pages, always with next set back into this
 * booking so nothing is asked twice. The return path carries the
 * join marker (?join=1): completing sign-in or sign-up through THIS
 * business's account step is what joins the customer to this
 * business. The book page sees the marker, creates the membership,
 * and continues into booking. Phone-code sign-in is NOT offered:
 * Supabase reports the phone provider disabled (texting is not
 * connected yet), and a button that cannot send a code is never
 * shipped. Styled as the business's own welcome card (Frantz,
 * 2026-11-26): the business logo and name lead, then Google, then
 * email. (The heading and the "only with" line were removed later
 * the same day at Frantz's order: too much text, and the buttons
 * already say create account and sign in.) Owners and team never see this step on
 * their own business; the book page auto-joins them first.
 */
export default function AccountGate({
  slug,
  businessName,
  logoUrl,
  continuePath,
}: {
  slug: string;
  businessName: string;
  logoUrl?: string | null;
  /** Where the account step returns to (carries the join marker).
   *  Booking by default; the message page passes its own path so
   *  both gates offer the identical card. */
  continuePath?: string;
}) {
  const [error, setError] = useState("");
  const back = continuePath ?? `/${slug}/book?join=1`;

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
        "Google sign in is unavailable right now. Please use email below, or try again shortly."
      );
    }
  }

  return (
    <div className="card gate-card">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="gate-logo" src={logoUrl} alt="" />
      ) : (
        <span className="gate-initial" aria-hidden="true">
          {businessName.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
      <p className="gate-biz">{businessName}</p>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-block btn-google btn-google-white" type="button" onClick={google}>
        <GoogleLogo />
        Continue with Google
      </button>
      <AppleSignInButton nextPath={back} onError={setError} tall />
      <p className="small center gate-or">or use email</p>
      <div className="gate-email-row">
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
          Log in
        </Link>
      </div>
      <p className="small center" style={{ margin: "14px 0 0" }}>
        New here? Creating your account takes a few seconds.
      </p>
    </div>
  );
}
