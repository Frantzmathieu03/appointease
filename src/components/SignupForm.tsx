"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import GoogleLogo from "@/components/GoogleLogo";

// Per-business customer accounts (Frantz, 2026-11-25): a customer
// signs up WITH a business, on that business's page — the membership,
// dashboard, messages and history live inside that business's world
// and never mix with any other business. The same email can join
// another business on its own page. Continue with Google first, or
// email + password below.
export default function SignupForm({
  nextPath = "/my-appointments",
  businessName,
}: {
  nextPath?: string;
  businessName?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name, phone: form.phone } },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    if (data.user && data.session) {
      await supabase.from("customers").upsert(
        { id: data.user.id, full_name: form.name, email: form.email, phone: form.phone },
        { onConflict: "id", ignoreDuplicates: true }
      );
      router.push(nextPath);
      router.refresh();
      return;
    }
    // Email confirmation is on — the profile is created on first sign-in.
    setCheckEmail(true);
    setBusy(false);
  }

  if (checkEmail) {
    return (
      <div className="card center">
        <h2>Check your email</h2>
        <p className="lede">
          We sent a confirmation link to {form.email}. Click it, then sign in —
          you&apos;ll land right back where you were.
        </p>
        <Link href="/login" className="btn btn-primary">Go to sign in</Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Create your account</h2>
      <p className="lede" style={{ marginBottom: 16 }}>
        {businessName
          ? `Your account is only with ${businessName}.`
          : "Your account is only with this business."}
      </p>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-primary btn-block" type="button" onClick={google}>
        <GoogleLogo />
        Continue with Google
      </button>
      <p className="small center" style={{ margin: "12px 0 14px" }}>or use email</p>
      <form onSubmit={onSubmit}>
        <label className="field">
          <span>Full name</span>
          <input required value={form.name} onChange={set("name")} autoComplete="name" />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
        </label>
        <label className="field">
          <span>Phone (for text reminders)</span>
          <input type="tel" required value={form.phone} onChange={set("phone")} autoComplete="tel" />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" required minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" />
        </label>
        <button className="btn btn-block" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="small center" style={{ marginTop: 14 }}>
        Already have an account?{" "}
        <Link href={nextPath !== "/my-appointments" ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
