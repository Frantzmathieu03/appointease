"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import {
  biometricSessionSaved,
  biometricsAvailable,
  isNativeApp,
  saveBiometricSession,
  wipeBiometricSession,
} from "@/lib/native";

// App settings (AppointEase App Pieces spec, Frantz 2026-11-26):
// the two rows that only make sense with the mobile app — the four
// notification toggles (stored per user in public.notification_prefs,
// migration 0017; the send path reads them before pushing) and the
// Face ID toggle (device-local: the token lives in the phone's secure
// vault, turning the toggle off wipes it). On the plain website both
// explain themselves honestly instead of pretending to work.

interface Prefs {
  new_booking: boolean;
  new_message: boolean;
  cancelled: boolean;
  morning_summary: boolean;
}

const DEFAULT_PREFS: Prefs = {
  new_booking: true,
  new_message: true,
  cancelled: true,
  morning_summary: true,
};

const PREF_ROWS: { key: keyof Prefs; label: string; hint: string }[] = [
  { key: "new_booking", label: "New booking", hint: "A customer books an appointment." },
  { key: "new_message", label: "New message", hint: "A customer messages your business." },
  { key: "cancelled", label: "Appointment cancelled", hint: "A customer cancels an appointment." },
  { key: "morning_summary", label: "Morning summary", hint: "Your day at a glance, at 7:30 AM." },
];

export function NotificationPrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [state, setState] = useState<"loading" | "ready" | "pending" | "saved">("loading");

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured()) {
        setState("pending");
        return;
      }
      const supabase = createBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setState("pending");
        return;
      }
      const { data, error } = await supabase
        .from("notification_prefs")
        .select("new_booking, new_message, cancelled, morning_summary")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        // Table arrives with migration 0017 — until then the toggles
        // show the defaults and nothing is stored yet.
        setState("pending");
        return;
      }
      if (data) setPrefs(data as Prefs);
      setState("ready");
    })();
  }, []);

  async function toggle(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("notification_prefs")
      .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setState(error ? "pending" : "saved");
  }

  if (state === "loading") {
    return <p className="small" style={{ margin: 0 }}>Loading your notification choices…</p>;
  }

  return (
    <div>
      {PREF_ROWS.map((row) => (
        <label
          key={row.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 0",
            borderBottom: "1px solid #eef2ee",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={prefs[row.key]}
            onChange={(e) => toggle(row.key, e.target.checked)}
            style={{ width: 20, height: 20, flex: "0 0 auto" }}
          />
          <span>
            <strong style={{ display: "block" }}>{row.label}</strong>
            <span className="small">{row.hint}</span>
          </span>
        </label>
      ))}
      <p className="small" style={{ marginTop: 12, marginBottom: 0 }}>
        These are for the AppointEase app on your phone. Email alerts keep working exactly as
        they do now.
        {state === "saved" && <> Saved.</>}
        {state === "pending" && (
          <> Your choices start saving with the next update — until then, all four are on.</>
        )}
      </p>
    </div>
  );
}

export function FaceIdSetting() {
  const [state, setState] = useState<"loading" | "browser" | "unavailable" | "off" | "on" | "working">(
    "loading"
  );

  useEffect(() => {
    (async () => {
      if (!isNativeApp()) {
        setState("browser");
        return;
      }
      if (!(await biometricsAvailable())) {
        setState("unavailable");
        return;
      }
      setState((await biometricSessionSaved()) ? "on" : "off");
    })();
  }, []);

  async function enable() {
    setState("working");
    const supabase = createBrowserSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.refresh_token) {
      setState("off");
      return;
    }
    const ok = await saveBiometricSession(session.user.email ?? "", session.refresh_token);
    setState(ok ? "on" : "off");
  }

  async function disable() {
    setState("working");
    await wipeBiometricSession();
    setState("off");
  }

  if (state === "loading") {
    return <p className="small" style={{ margin: 0 }}>Checking this device…</p>;
  }
  if (state === "browser") {
    return (
      <p className="small" style={{ margin: 0 }}>
        Face ID sign in works in the AppointEase app — sign in once with Google or email there
        and the app offers Face ID for next time. In a browser, you sign in the normal way.
      </p>
    );
  }
  if (state === "unavailable") {
    return (
      <p className="small" style={{ margin: 0 }}>
        This phone does not have Face ID or fingerprint set up, so there is nothing to turn on
        here. You can add it in your phone&apos;s settings first.
      </p>
    );
  }
  return (
    <div>
      <p className="small" style={{ marginTop: 0 }}>
        {state === "on"
          ? "Face ID is on for this phone. Next time you open the app, your face signs you in."
          : "Face ID is off. Turn it on and your face signs you in next time — no password to type."}
      </p>
      <button
        className="btn btn-primary"
        onClick={state === "on" ? disable : enable}
        disabled={state === "working"}
      >
        {state === "working" ? "Working…" : state === "on" ? "Turn Face ID off" : "Turn Face ID on"}
      </button>
      {state === "on" && (
        <p className="small" style={{ marginTop: 10, marginBottom: 0 }}>
          Turning it off removes the saved sign-in from this phone right away.
        </p>
      )}
    </div>
  );
}
