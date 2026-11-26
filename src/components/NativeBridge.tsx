"use client";

import { useEffect, useRef, useState } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { SplashScreen } from "@capacitor/splash-screen";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import {
  biometricSessionSaved,
  biometricsAvailable,
  isNativeApp,
  nativePlatform,
  readBiometricSession,
  saveBiometricSession,
} from "@/lib/native";

// Native app bridge (AppointEase App Pieces spec, Frantz 2026-11-26).
//
// Mounted twice, both times inert in a normal browser:
//  - root layout (no props): hides the splash once the page is ready,
//    routes notification taps, and offers the Face ID unlock on app
//    entry points when a stored session exists.
//  - owner dashboard layout (businessId): registers this device for
//    push against the signed-in user + business, and shows the
//    one-time "Use Face ID next time?" offer after sign in.
//
// Push payload convention (set by src/lib/native-push.ts):
//   data: { type: "new_booking" | "new_message" | "cancelled" |
//           "morning_summary", url: "/owner/dashboard/..." }
// Tapping a notification opens data.url; without one it falls back
// to the dashboard home.

let tapListenerReady = false;
let currentToken: string | null = null;

function routeForTap(data: Record<string, unknown> | undefined) {
  const url = typeof data?.url === "string" ? data.url : "";
  if (url.startsWith("/owner/")) {
    window.location.href = url;
    return;
  }
  switch (data?.type) {
    case "new_message":
      window.location.href = data?.customerId
        ? `/owner/dashboard/inbox/${String(data.customerId)}`
        : "/owner/dashboard/inbox";
      break;
    case "new_booking":
    case "cancelled":
      window.location.href = data?.appointmentId
        ? `/owner/dashboard/appointments/${String(data.appointmentId)}`
        : "/owner/dashboard/calendar";
      break;
    default:
      window.location.href = "/owner/dashboard";
  }
}

export default function NativeBridge({ businessId }: { businessId?: string }) {
  const [offer, setOffer] = useState<null | { email: string; refreshToken: string }>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!isNativeApp() || !isSupabaseConfigured()) return;

    const supabase = createBrowserSupabase();
    let cancelled = false;

    // Splash: the native shell holds it (launchAutoHide off); hide it
    // as soon as the first page has actually rendered.
    SplashScreen.hide().catch(() => {});

    // Notification taps — one listener for the whole app session.
    if (!tapListenerReady) {
      tapListenerReady = true;
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        routeForTap(action.notification?.data as Record<string, unknown> | undefined);
      }).catch(() => {});
    }

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) {
        // Face ID unlock on entry points: a stored session + a good
        // biometric read signs straight back in. Failure or a decline
        // just leaves the normal sign-in screen in place.
        const path = window.location.pathname;
        const entryPoint = ["/", "/login", "/signup", "/owner", "/owner/signup"].includes(path);
        if (entryPoint && (await biometricSessionSaved())) {
          const stored = await readBiometricSession();
          if (stored && !cancelled) {
            const { data, error } = await supabase.auth.refreshSession({
              refresh_token: stored.refreshToken,
            });
            if (!error && data.session) {
              window.location.replace("/owner/dashboard");
            }
          }
        }
        return;
      }

      // Signed in. On the dashboard mount we know the business, so
      // this device can be registered for push and offered Face ID.
      if (!businessId) return;
      const userId = session.user.id;

      // --- Push registration ---------------------------------------
      try {
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive === "granted") {
          await PushNotifications.addListener("registration", async (token) => {
            currentToken = token.value;
            try {
              await supabase.from("device_tokens").upsert(
                {
                  user_id: userId,
                  business_id: businessId,
                  token: token.value,
                  platform: nativePlatform() ?? "android",
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "token" }
              );
            } catch {
              // device_tokens arrives with migration 0017 — until it
              // lands the write simply does not happen.
            }
          });
          await PushNotifications.addListener("registrationError", () => {});
          await PushNotifications.register();
        }
      } catch {
        // Push is unavailable on this device — the app works without it.
      }

      // Signing out removes this device's token row, so a shared
      // phone stops receiving the previous person's notifications.
      // The bridge lives for the whole app session, so this listener
      // is intentionally never unsubscribed.
      supabase.auth.onAuthStateChange(async (event) => {
        if (event === "SIGNED_OUT" && currentToken) {
          try {
            await supabase.from("device_tokens").delete().eq("token", currentToken);
          } catch {}
          currentToken = null;
        }
      });

      // --- Face ID offer (once per device) --------------------------
      try {
        const offered = window.localStorage.getItem("ae_faceid_offered");
        if (!offered && (await biometricsAvailable()) && !(await biometricSessionSaved())) {
          const {
            data: { session: fresh },
          } = await supabase.auth.getSession();
          if (fresh?.refresh_token && !cancelled) {
            setOffer({ email: fresh.user.email ?? "", refreshToken: fresh.refresh_token });
          }
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!offer) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem("ae_faceid_offered", "1");
    } catch {}
    setOffer(null);
  };

  const enable = async () => {
    if (offer) {
      await saveBiometricSession(offer.email, offer.refreshToken);
    }
    dismiss();
  };

  return (
    <div
      role="dialog"
      aria-label="Use Face ID next time"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 60,
        background: "#fff",
        border: "1px solid #dce4dd",
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 12px 40px rgba(20,60,35,0.22)",
      }}
    >
      <p style={{ margin: "0 0 6px", fontWeight: 700 }}>Use Face ID next time?</p>
      <p className="small" style={{ margin: "0 0 14px" }}>
        Sign in with your face instead of your password. You can turn this off anytime in
        Settings.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primary" onClick={enable} style={{ flex: 1 }}>
          Use Face ID
        </button>
        <button className="btn" onClick={dismiss} style={{ flex: 1 }}>
          Not now
        </button>
      </div>
    </div>
  );
}
