"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { isSupabaseConfigured } from "@/lib/supabase-config";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * "Notify me on this device": registers the service worker, asks
 * permission, and stores the Web Push subscription against the signed-in
 * user (push_subscriptions, RLS self-only). Delivery additionally needs
 * VAPID keys on the server; without the public key configured here the
 * control honestly says push is not switched on yet: email alerts are
 * the working off-screen channel in the meantime.
 */
export default function PushOptIn() {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [state, setState] = useState<"idle" | "working" | "on" | "denied" | "error">("idle");

  useEffect(() => {
    (async () => {
      if (!vapidPublic || !("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) setState("on");
    })();
  }, [vapidPublic]);

  if (!isSupabaseConfigured()) return null;

  if (!vapidPublic) {
    return (
      <p className="small">
        Push notifications are not switched on yet. New message alerts are
        sent by email in the meantime.
      </p>
    );
  }

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublic) as BufferSource,
      });
      const json = sub.toJSON();
      const supabase = createBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not signed in");
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;
      setState("on");
    } catch {
      setState("error");
    }
  }

  if (state === "on") return <p className="small">✓ Push notifications are on for this device.</p>;
  return (
    <div>
      <button className="btn" onClick={enable} disabled={state === "working"}>
        {state === "working" ? "Turning on…" : "Get push notifications on this device"}
      </button>
      {state === "denied" && (
        <p className="small">Permission was denied. You can allow notifications in your browser settings.</p>
      )}
      {state === "error" && <p className="small">Something went wrong turning push on. Email alerts still work.</p>}
    </div>
  );
}
