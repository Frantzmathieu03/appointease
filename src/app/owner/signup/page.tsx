"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import CreateBusinessForm from "@/components/owner/CreateBusinessForm";

// Owner signup: create the login first, then the business (its link is
// reserved the moment the business row lands). If email confirmation is
// switched on, the business step waits until after the first sign-in —
// the dashboard picks it up there.
export default function OwnerSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
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
      setError("Google sign-in is unavailable right now — please use email and password, or try again shortly.");
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
      options: { data: { full_name: form.name } },
    });
    if (error) {
      setError(error.message);
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
            We sent a confirmation link to {form.email}. Confirm it, sign in,
            and we&apos;ll reserve your business link right away.
          </p>
          <Link href="/owner" className="btn btn-primary">Go to business sign-in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="column">
      <p className="eyebrow">For businesses</p>
      <h1 style={{ fontSize: 30 }}>Create your booking page</h1>
      <p className="lede">
        30 days free, no card required. Your page link is reserved the moment
        you name your business.
      </p>

      {phase === "account" && (
        <div className="card">
          <h2>1 — Your login</h2>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary btn-block" type="button" onClick={google}>
            Continue with Google
          </button>
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
            <button className="btn btn-block" type="submit" disabled={busy}>
              {busy ? "Creating…" : "Continue"}
            </button>
          </form>
          <p className="small center" style={{ marginTop: 14 }}>
            Already have an account? <Link href="/owner">Sign in</Link>
          </p>
        </div>
      )}

      {phase === "business" && (
        <div className="card">
          <h2>2 — Your business</h2>
          <CreateBusinessForm />
        </div>
      )}
    </main>
  );
}
