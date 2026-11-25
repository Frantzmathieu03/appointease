"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import GoogleLogo from "@/components/GoogleLogo";

export default function SignInForm({
  nextPath = "/my-appointments",
  title = "Welcome back",
  subtitle = "Sign in to see your appointments and messages.",
  signupHref = "/signup",
  signupText = "New to AppointEase? Create an account",
}: {
  nextPath?: string;
  title?: string;
  subtitle?: string;
  signupHref?: string;
  signupText?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("That email and password did not match. Try again, or create an account below.");
      setBusy(false);
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  async function google() {
    setError("");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (error) {
      setError("Google sign-in is unavailable right now — please use email and password, or try again shortly.");
    }
  }

  // Passwordless option: Supabase emails a sign-in link through the
  // same mailer that already delivers this project's confirmation and
  // password-reset mail, and /auth/callback exchanges it for a
  // session. (Phone-code sign-in is NOT offered anywhere: the
  // project's phone provider is disabled — texting is not connected
  // yet — and a code button that cannot send is never shipped.)
  async function emailLink() {
    setError("");
    if (!email) {
      setNotice("Type your email above first — then we'll send the sign-in link there.");
      return;
    }
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (error) {
      setError("That sign-in link didn't go out — check the email address, or use your password below.");
      return;
    }
    setNotice("Check your email — we sent you a sign-in link. Tap it and you're in, no password needed.");
  }

  async function forgot() {
    setError("");
    if (!email) {
      setNotice("Type your email above first — then we'll send the reset link there.");
      return;
    }
    const supabase = createBrowserSupabase();
    // Same message whether or not the account exists — never reveal which.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/set-password")}`,
    });
    setNotice("If that email has an account, we sent a password reset link.");
  }

  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="lede" style={{ marginBottom: 16 }}>{subtitle}</p>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-primary btn-block" type="button" onClick={google}>
        <GoogleLogo />
        Continue with Google
      </button>
      <p className="small center" style={{ margin: "12px 0 14px" }}>or use email</p>
      <form onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        <button className="btn btn-block" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="small center" style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={emailLink}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            font: "inherit",
            color: "inherit",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Email me a sign-in link instead
        </button>
      </p>
      <p className="small center" style={{ marginTop: 8 }}>
        <button
          type="button"
          onClick={forgot}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            font: "inherit",
            color: "inherit",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Forgot password?
        </button>
      </p>
      {notice && (
        <p className="small center" style={{ marginTop: 10 }}>{notice}</p>
      )}
      <p className="small center" style={{ marginTop: 14 }}>
        <Link href={signupHref}>{signupText}</Link>
      </p>
    </div>
  );
}
