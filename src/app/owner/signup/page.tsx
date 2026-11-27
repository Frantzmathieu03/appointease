"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import CreateBusinessForm from "@/components/owner/CreateBusinessForm";
import GoogleLogo from "@/components/GoogleLogo";
import AppleSignInButton from "@/components/AppleSignInButton";

// Owner signup: create the login first, then the business (its link is
// reserved the moment the business row lands). If email confirmation is
// switched on, the business step waits until after the first sign-in: 
// the dashboard picks it up there.
export default function OwnerSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", promo: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"account" | "business" | "checkEmail">("account");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function google() {
    setError("");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/owner/setup")}`,
      },
    });
    if (error) {
      setError("Google sign in is unavailable right now. Please use email and password, or try again shortly.");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        // A promo code typed here is saved on the account; the code
        // itself is redeemed at Stripe checkout, where promotion
        // codes are turned on. A ?ref= on the signup link is saved
        // the same way so a referring partner can be credited.
        data: {
          full_name: form.name,
          ...(form.promo.trim() ? { promo_code: form.promo.trim() } : {}),
          ...(typeof window !== "undefined" && new URLSearchParams(window.location.search).get("ref")
            ? { referral_ref: new URLSearchParams(window.location.search).get("ref") }
            : {}),
        },
        // Confirming the email lands the owner straight in "Name
        // your business" (/owner/setup shows exactly that when no
        // business exists yet): no confirm-then-sign-in-again loop
        // (Customer Side Plan friction fix, Frantz 2026-11-26).
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/owner/setup")}`,
      },
    });
    if (error) {
      // Plain words for the common case (fix guide, 2026-11-27): an
      // email that already has an account points at log in.
      if (/already/i.test(error.message)) {
        setError("That email already has an account. Log in instead.");
      } else {
        setError(error.message);
      }
      setBusy(false);
      return;
    }
    setBusy(false);
    if (data.session) {
      setPhase("business");
    } else if (data.user) {
      setPhase("checkEmail");
    } else {
      router.push("/owner");
    }
  }

  if (phase === "checkEmail") {
    return (
      <main className="column">
        <div className="card center">
          <h2>Check your email</h2>
          <p className="lede">
            We sent a confirmation link to {form.email}. Click it and
            you&apos;ll go straight to naming your business, with no extra
            sign in needed.
          </p>
          <Link href="/owner" className="btn btn-primary">Go to log in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="column signup-page">
      <p className="eyebrow center">For businesses</p>
      <h1 className="center" style={{ fontSize: 30 }}>Create your booking page</h1>
      <p className="lede center">
        14 days free, no card needed. After that, plans start at
        $29.99/month. Cancel anytime. Your page link is reserved the moment
        you name your business.
      </p>

      {phase === "account" && (
        <div className="card">
          <h2 className="center">Create your account</h2>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary btn-block btn-google" type="button" onClick={google}>
            <GoogleLogo />
            Continue with Google
          </button>
          <AppleSignInButton nextPath="/owner/setup" onError={setError} />
          <p className="small center" style={{ margin: "12px 0 14px" }}>or use email</p>
          <form onSubmit={onSubmit}>
            <label className="field">
              <span>Your name</span>
              <input required value={form.name} onChange={set("name")} autoComplete="name" />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" required minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" />
            </label>
            <p className="small" style={{ marginTop: -6 }}>At least 8 characters.</p>
            <label className="field">
              <span>Promo code (optional)</span>
              <input value={form.promo} onChange={set("promo")} autoComplete="off" placeholder="Have a promo code?" />
            </label>
            <button className="btn btn-block" type="submit" disabled={busy}>
              {busy ? "Creating…" : "Continue"}
            </button>
          </form>
          <p className="small center" style={{ marginTop: 14 }}>
            By continuing, you agree to our <Link href="/terms">Terms of Service</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
          <p className="small center" style={{ marginTop: 14 }}>
            Already have an account? <Link href="/owner">Log in</Link>
          </p>
        </div>
      )}

      {phase === "business" && (
        <div className="card">
          <h2 className="center">Your business</h2>
          <CreateBusinessForm />
        </div>
      )}
    </main>
  );
}
