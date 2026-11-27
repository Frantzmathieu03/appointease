"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";

/**
 * The way out of the wrong account dead end on /invite/[token]
 * (Frantz, 2026-11-26): an invite can only be accepted by the
 * account signed in with the invited email, but a visitor signed in
 * as someone else used to hit a pink message with nowhere to go.
 * This button signs the current account out and lands on the sign
 * in screen with the invited email already filled in and the return
 * path back to this invite, so signing in with the right email
 * drops them right back here, ready to accept.
 *
 * The sign out is belt and suspenders: the Supabase signOut call,
 * then the session cookies expired directly (a failed logout call
 * must never leave the wrong account signed in), then a FULL page
 * load to the sign in screen so the server renders it signed out.
 */
export default function InviteSwitchAccount({
  invitedEmail,
  token,
}: {
  invitedEmail: string;
  token: string;
}) {
  const [busy, setBusy] = useState(false);

  async function switchAccount() {
    setBusy(true);
    const supabase = createBrowserSupabase();
    try {
      await supabase.auth.signOut();
    } catch {
      // The cookie expiry below still signs this browser out.
    }
    for (const part of document.cookie.split(";")) {
      const name = part.split("=")[0].trim();
      if (name.startsWith("sb-") && name.includes("auth-token")) {
        document.cookie = `${name}=; Path=/; Max-Age=0`;
      }
    }
    const next = `/invite/${token}`;
    window.location.href = `/login?next=${encodeURIComponent(next)}&email=${encodeURIComponent(invitedEmail)}`;
  }

  return (
    <button
      className="btn btn-primary btn-block"
      type="button"
      onClick={switchAccount}
      disabled={busy}
    >
      {busy ? "Signing out…" : `Log in as ${invitedEmail}`}
    </button>
  );
}
