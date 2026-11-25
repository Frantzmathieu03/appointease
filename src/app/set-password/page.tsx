"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";

// Landing page for password reset / account-claim emails. The email link
// goes through /auth/callback, which exchanges the code for a session and
// redirects here — so a valid session means the link was real. Setting
// the password is just an updateUser on that session.
export default function SetPasswordPage() {
  // null = still checking the link's session.
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createBrowserSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setHasSession(!!session);
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Those passwords don't match — try again.");
      return;
    }
    setBusy(true);
    setError("");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError("That didn't work — the link may have expired. Request a new one from the sign-in page.");
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  }

  if (hasSession === null) {
    return (
      <main className="column">
        <div className="card center">
          <p className="lede">Checking your link…</p>
        </div>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="column">
        <div className="card center">
          <h2>This link has expired</h2>
          <p className="lede">
            Password links only work once, and only for a short time.
            Request a new one from the sign-in page.
          </p>
          <Link href="/login" className="btn btn-primary">Go to sign in</Link>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="column">
        <div className="card center">
          <div style={{ fontSize: 40, marginBottom: 6 }}>✓</div>
          <h2>Your password is set</h2>
          <p className="lede">
            You can now sign in with your email and this password at every
            business on AppointEase.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/my-appointments" className="btn btn-primary">My appointments</Link>
            <Link href="/login" className="btn">Sign in</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="column">
      <div className="card">
        <h2>Set your password</h2>
        <p className="lede" style={{ marginBottom: 16 }}>
          Pick a password for your AppointEase account — it works at every
          business here.
        </p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={onSubmit}>
          <label className="field">
            <span>New password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Set password"}
          </button>
        </form>
      </div>
    </main>
  );
}
