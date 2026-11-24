// Web Push sending — SERVER ONLY.
//
// Delivery is env-gated: without NEXT_PUBLIC_VAPID_PUBLIC_KEY +
// VAPID_PRIVATE_KEY + VAPID_SUBJECT there is nothing to sign pushes with,
// so sendPushToSubscription is never called by the dispatcher in that
// state (it records the attempt as skipped instead). Nothing here fakes
// a delivery.

import webpush from "web-push";

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function pushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:hello@appointease.io",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export async function sendPushToSubscription(
  sub: StoredSubscription,
  payload: { title: string; body: string; url: string }
): Promise<{ delivered: boolean; detail: string; gone?: boolean }> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return { delivered: true, detail: "Accepted by the push service." };
  } catch (err) {
    const code = (err as { statusCode?: number }).statusCode;
    return {
      delivered: false,
      detail: `Push service responded ${code ?? String(err)}`,
      gone: code === 404 || code === 410, // subscription expired — caller deletes it
    };
  }
}
