"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import GoogleLogo from "@/components/GoogleLogo";
import AppleSignInButton from "@/components/AppleSignInButton";
import type { BusinessAuthContext } from "@/lib/auth-context";

// The per-business sign up / log in screen (Customer Side Plan,
// Frantz 2026-11-26): reached from a business's own pages, it wears
// that business: a back link to its page, its round logo, "with
// <Business>. Your account is only with this office.": and nothing
// of the platform around it. One screen flips between Create your
// account and Log in. Working methods are Google and email +
// password; code-by-text is NOT offered (texting is not connected
// yet: a button that cannot send a code is never shipped). The
// texting consent box starts unchecked; ticking it rides along the
// return path (&consent=1) and is stamped on the membership when the
// join lands (business_customers.sms_consent_at, migration 0016).
export default function CustomerAuth({
  business,
  nextPath,
  initialMode,
}: {
  business: BusinessAuthContext;
  nextPath: string;
  initialMode: "signup" | "login";
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">(initialMode);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  // The return path with the consent marker appended when the box is
  // ticked (the join handlers on the business's pages read it).
  const returnPath = (withConsent: boolean) => {
    if (!withConsent) return nextPath;
    return `${nextPath}${nextPath.includes("?") ? "&" : "?"}consent=1`;
  };

  async function google() {
    setError("");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          returnPath(mode === "signup" && consent)
        )}`,
      },
    });
    if (error) {
      setError("Google sign in is unavailable right now. Please use email and password, or try again shortly.");
    }
  }

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createBrowserSupabase();
    const dest = returnPath(consent);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name, phone: form.phone },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest)}`,
      },
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
      router.push(dest);
      router.refresh();
      return;
    }
    // Email confirmation is on: the profile is created on first sign-in.
    setCheckEmail(true);
    setBusy(false);
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (error) {
      setError("That email and password did not match. Try again, or create an account below.");
      setBusy(false);
      return;
    }
    router.push(returnPath(false));
    router.refresh();
  }

  async function emailLink() {
    setError("");
    if (!form.email) {
      setNotice("Type your email above first. Then we'll send the sign in link there.");
      return;
    }
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email: form.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnPath(false))}`,
      },
    });
    if (error) {
      setError("That sign in link didn't go out. Check the email address, or use your password below.");
      return;
    }
    setNotice("Check your email. We sent you a sign in link. Tap it and you're in, no password needed.");
  }

  async function forgot() {
    setError("");
    if (!form.email) {
      setNotice("Type your email above first. Then we'll send the reset link there.");
      return;
    }
    const supabase = createBrowserSupabase();
    // The reset keeps the customer inside THIS business's world:
    // after setting the password they land on this business's own
    // My dashboard, never anywhere global.
    await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/set-password?to=/${business.slug}/my`)}`,
    });
    setNotice("If that email has an account, we sent a password reset link.");
  }

  if (checkEmail) {
    return (
      <div className="card center">
        <h2>Check your email</h2>
        <p className="lede">
          We sent a confirmation link to {form.email}. Click it, then sign in and
          you&apos;ll land right back at {business.name}.
        </p>
        <button className="btn btn-primary" onClick={() => setCheckEmail(false)}>
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <div>
      <Link href={`/${business.slug}`} className="c3-backlink">
        ‹ Back to {business.name}
      </Link>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="center">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoUrl} alt="" className="c3-auth-logo" />
          ) : (
            <span className="c3-auth-logo c3-auth-initial" aria-hidden="true">
              {business.name.trim()[0]?.toUpperCase() ?? "A"}
            </span>
          )}
          <h2 style={{ marginTop: 10 }}>
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h2>
          <p className="lede" style={{ marginBottom: 16 }}>
            with {business.name}. Your account is only with this office.
          </p>
        </div>
        {error && <div className="error">{error}</div>}
        <button
          className="btn btn-block btn-google btn-google-white"
          type="button"
          onClick={google}
        >
          <GoogleLogo />
          Continue with Google
        </button>
        <AppleSignInButton
          nextPath={returnPath(mode === "signup" && consent)}
          onError={setError}
          tall
        />
        <div className="c3-divider" aria-hidden="true">
          <span>or</span>
        </div>
        {mode === "signup" ? (
          <form onSubmit={signup}>
            <label className="field">
              <span>Full name</span>
              <input required value={form.name} onChange={set("name")} autoComplete="name" />
            </label>
            <label className="field">
              <span>Mobile number</span>
              <input type="tel" required value={form.phone} onChange={set("phone")} autoComplete="tel" />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={set("password")}
                autoComplete="new-password"
              />
            </label>
            <label className="c3-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>Text me reminders and replies. Reply STOP anytime.</span>
            </label>
            <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ minHeight: 50 }}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
        ) : (
          <form onSubmit={login}>
            <label className="field">
              <span>Email</span>
              <input type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                required
                value={form.password}
                onChange={set("password")}
                autoComplete="current-password"
              />
            </label>
            <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ minHeight: 50 }}>
              {busy ? "Signing in…" : "Log in"}
            </button>
          </form>
        )}
        {mode === "login" && (
          <p className="small center" style={{ marginTop: 12 }}>
            <button type="button" className="c3-underlink" onClick={emailLink}>
              Email me a sign in link instead
            </button>
            {" · "}
            <button type="button" className="c3-underlink" onClick={forgot}>
              Forgot password?
            </button>
          </p>
        )}
        {notice && (
          <p className="small center" style={{ marginTop: 10 }}>{notice}</p>
        )}
        <p className="small center" style={{ marginTop: 16 }}>
          {mode === "signup" ? (
            <>
              Already a client?{" "}
              <button type="button" className="c3-underlink" onClick={() => { setMode("login"); setError(""); }}>
                Log in
              </button>
            </>
          ) : (
            <>
              New to {business.name}?{" "}
              <button type="button" className="c3-underlink" onClick={() => { setMode("signup"); setError(""); }}>
                Create your account
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
