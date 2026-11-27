"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";

/**
 * Privacy and security: one shared section for every signed in
 * person, owners on their Settings page and customers on a
 * business's My page (Frantz, 2026-11-27). Change the password
 * right here on the current session, or ask for a reset email
 * instead. The reset link follows the per lane pattern the sign
 * in forms use: it lands on /set-password with this lane's home
 * in ?to= (the resetTo prop), so an owner lands back on the owner
 * dashboard and a customer lands back on that business's own My
 * page. The Privacy policy and Terms links close the section.
 */
export default function SecuritySettings({ resetTo }: { resetTo: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (password.length < 8) {
      setError("Your new password needs at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match. Try again.");
      return;
    }
    setBusy(true);
    const supabase = createBrowserSupabase();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("That didn't work. Please try again, or use the reset link below.");
      setBusy(false);
      return;
    }
    setPassword("");
    setConfirm("");
    setNotice("Your password is changed.");
    setBusy(false);
  }

  async function emailReset() {
    setResetError("");
    setResetNotice("");
    setResetBusy(true);
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      setResetError("We could not find an email address on your account.");
      setResetBusy(false);
      return;
    }
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        `/set-password?to=${resetTo}`
      )}`,
    });
    if (sendError) {
      setResetError("That email didn't go out. Please try again in a moment.");
      setResetBusy(false);
      return;
    }
    setResetNotice("Check your email. We sent you a reset link.");
    setResetBusy(false);
  }

  return (
    <div className="card">
      <h2>Privacy and security</h2>
      <p className="small" style={{ marginTop: 0 }}>
        Change your password here. Pick one with at least 8 characters.
      </p>
      {error && <div className="error">{error}</div>}
      {notice && <div className="success">{notice}</div>}
      <form onSubmit={savePassword}>
        <label className="field">
          <span>New password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="field">
          <span>New password again</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
      <p className="small" style={{ marginTop: 16 }}>
        Locked out of your current password, or signed up with Google and
        never set one? We can email you a link to set a new password.
      </p>
      {resetError && <div className="error">{resetError}</div>}
      {resetNotice && <div className="success">{resetNotice}</div>}
      <button className="btn" type="button" onClick={emailReset} disabled={resetBusy}>
        {resetBusy ? "Sending…" : "Email me a reset link"}
      </button>
      <p className="small" style={{ marginTop: 16, marginBottom: 0 }}>
        Read our <Link href="/privacy">Privacy policy</Link> and{" "}
        <Link href="/terms">Terms</Link>.
      </p>
    </div>
  );
}
