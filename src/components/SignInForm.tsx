"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";

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
    const supabase = createBrowserSupabase();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
  }

  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="lede" style={{ marginBottom: 16 }}>{subtitle}</p>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-block" type="button" onClick={google} style={{ marginBottom: 14 }}>
        Continue with Google
      </button>
      <form onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="small center" style={{ marginTop: 14 }}>
        <Link href={signupHref}>{signupText}</Link>
      </p>
    </div>
  );
}
