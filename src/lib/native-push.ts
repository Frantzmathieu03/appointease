// Native push sending: SERVER ONLY (AppointEase App Pieces spec,
// Frantz 2026-11-26; app build phase 1).
//
// Delivers to the Capacitor app through FCM (Android) and APNs (iOS),
// reading device tokens from public.device_tokens and each person's
// toggles from public.notification_prefs (migration 0017).
//
// HONESTY RULE (same as notify.ts / push.ts): delivery is env-gated.
//   Android: FCM_SERVICE_ACCOUNT_JSON: the Firebase service account
//     JSON, as one string. No Firebase project exists yet.
//   iOS:     APNS_KEY_ID + APNS_TEAM_ID + APNS_PRIVATE_KEY (the .p8
//     contents), APNS_BUNDLE_ID optional (default io.appointease.app),
//     APNS_SANDBOX=1 for the sandbox host.
// With credentials absent, every send no-ops silently and reports
// "not_configured": nothing is ever faked as delivered. Until
// migration 0017 lands, the token/prefs reads fail soft the same way.
// This module never throws into its callers.

import { createSign } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type NativePushKind = "new_booking" | "new_message" | "cancelled" | "morning_summary";

export interface NativePushEvent {
  businessId: string;
  kind: NativePushKind;
  title: string;
  body: string;
  /** Deep-link payload; the app routes on data.url (see NativeBridge). */
  data: Record<string, string>;
  /** The customer the event is about: drives the staff rule. */
  customerId?: string | null;
  /** Never push this user (e.g. the person who caused the event). */
  excludeUserId?: string | null;
}

export interface NativePushResult {
  status: "not_configured" | "no_recipients" | "sent" | "failed" | "skipped";
  attempted: number;
  delivered: number;
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

interface FcmCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function fcmCredentials(): FcmCredentials | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { project_id?: string; client_email?: string; private_key?: string };
    if (!j.project_id || !j.client_email || !j.private_key) return null;
    return { projectId: j.project_id, clientEmail: j.client_email, privateKey: j.private_key };
  } catch {
    return null;
  }
}

interface ApnsCredentials {
  keyId: string;
  teamId: string;
  privateKey: string;
  bundleId: string;
  host: string;
}

function apnsCredentials(): ApnsCredentials | null {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const key = process.env.APNS_PRIVATE_KEY;
  if (!keyId || !teamId || !key) return null;
  return {
    keyId,
    teamId,
    privateKey: key.replace(/\\n/g, "\n"),
    bundleId: process.env.APNS_BUNDLE_ID ?? "io.appointease.app",
    host: process.env.APNS_SANDBOX === "1" ? "api.sandbox.push.apple.com" : "api.push.apple.com",
  };
}

export function nativePushConfigured(): boolean {
  return Boolean(fcmCredentials() || apnsCredentials());
}

// ---------------------------------------------------------------------------
// JWT helpers (FCM OAuth + APNs provider tokens), Node crypto only.
// ---------------------------------------------------------------------------

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signJwt(header: object, payload: object, key: string, alg: "RS256" | "ES256"): string {
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature =
    alg === "RS256"
      ? signer.sign(key)
      : signer.sign({ key, dsaEncoding: "ieee-p1363" });
  return `${unsigned}.${b64url(signature)}`;
}

let fcmTokenCache: { token: string; expiresAt: number } | null = null;

async function fcmAccessToken(cred: FcmCredentials): Promise<string | null> {
  if (fcmTokenCache && fcmTokenCache.expiresAt > Date.now() + 60_000) {
    return fcmTokenCache.token;
  }
  try {
    const now = Math.floor(Date.now() / 1000);
    const jwt = signJwt(
      { alg: "RS256", typ: "JWT" },
      {
        iss: cred.clientEmail,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      },
      cred.privateKey,
      "RS256"
    );
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!j.access_token) return null;
    fcmTokenCache = {
      token: j.access_token,
      expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000,
    };
    return j.access_token;
  } catch {
    return null;
  }
}

let apnsTokenCache: { token: string; expiresAt: number } | null = null;

function apnsProviderToken(cred: ApnsCredentials): string | null {
  if (apnsTokenCache && apnsTokenCache.expiresAt > Date.now() + 60_000) {
    return apnsTokenCache.token;
  }
  try {
    const token = signJwt(
      { alg: "ES256", kid: cred.keyId, typ: "JWT" },
      { iss: cred.teamId, iat: Math.floor(Date.now() / 1000) },
      cred.privateKey,
      "ES256"
    );
    apnsTokenCache = { token, expiresAt: Date.now() + 50 * 60_000 };
    return token;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Per-token sends
// ---------------------------------------------------------------------------

async function sendFcm(
  cred: FcmCredentials,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ delivered: boolean; gone: boolean }> {
  const access = await fcmAccessToken(cred);
  if (!access) return { delivered: false, gone: false };
  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${cred.projectId}/messages:send`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data,
            android: { priority: "high" },
          },
        }),
      }
    );
    if (res.ok) return { delivered: true, gone: false };
    const j = (await res.json().catch(() => null)) as {
      error?: { details?: { errorCode?: string }[] };
    } | null;
    const code = j?.error?.details?.[0]?.errorCode ?? "";
    return { delivered: false, gone: code === "UNREGISTERED" || code === "SENDER_ID_MISMATCH" };
  } catch {
    return { delivered: false, gone: false };
  }
}

async function sendApns(
  cred: ApnsCredentials,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ delivered: boolean; gone: boolean }> {
  const provider = apnsProviderToken(cred);
  if (!provider) return { delivered: false, gone: false };
  try {
    const res = await fetch(`https://${cred.host}/3/device/${token}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${provider}`,
        "apns-topic": cred.bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        aps: { alert: { title, body }, sound: "default", badge: 1 },
        ...data,
      }),
    });
    if (res.status === 200) return { delivered: true, gone: false };
    return {
      delivered: false,
      gone: res.status === 410 || res.status === 400, // Unregistered / BadDeviceToken
    };
  } catch {
    return { delivered: false, gone: false };
  }
}

// ---------------------------------------------------------------------------
// The send path: resolve recipients, apply toggles + staff rule, send.
// ---------------------------------------------------------------------------

const PREF_COLUMN: Record<NativePushKind, string> = {
  new_booking: "new_booking",
  new_message: "new_message",
  cancelled: "cancelled",
  morning_summary: "morning_summary",
};

export async function sendNativePush(
  admin: SupabaseClient,
  ev: NativePushEvent
): Promise<NativePushResult> {
  const fcm = fcmCredentials();
  const apns = apnsCredentials();
  if (!fcm && !apns) return { status: "not_configured", attempted: 0, delivered: 0 };

  try {
    const { data: business } = await admin
      .from("businesses")
      .select("id, owner_id, category")
      .eq("id", ev.businessId)
      .single();
    if (!business) return { status: "skipped", attempted: 0, delivered: 0 };

    const { data: members } = await admin
      .from("business_members")
      .select("user_id, role, staff_id")
      .eq("business_id", ev.businessId)
      .eq("status", "active");

    interface Candidate { userId: string; role: string; staffId: string | null }
    const candidates: Candidate[] = [
      { userId: business.owner_id as string, role: "owner", staffId: null },
      ...((members ?? []) as { user_id: string; role: string; staff_id: string | null }[]).map(
        (m) => ({ userId: m.user_id, role: m.role, staffId: m.staff_id })
      ),
    ];
    const seen = new Set<string>();
    const unique = candidates.filter((c) => {
      if (seen.has(c.userId) || c.userId === ev.excludeUserId) return false;
      seen.add(c.userId);
      return true;
    });

    // Toggles: no prefs row = all four on.
    const prefCol = PREF_COLUMN[ev.kind];
    const { data: prefRows } = await admin
      .from("notification_prefs")
      .select(`user_id, ${prefCol}`)
      .in("user_id", unique.map((c) => c.userId));
    const prefOff = new Set(
      ((prefRows ?? []) as unknown as Record<string, unknown>[])
        .filter((r) => r[prefCol] === false)
        .map((r) => r.user_id as string)
    );

    // Staff rule: staff are pushed only about their own clients: the
    // customer must be assigned to their staff record.
    let assignedStaffId: string | null = null;
    if (ev.customerId) {
      const { data: bc } = await admin
        .from("business_customers")
        .select("assigned_staff_id")
        .eq("business_id", ev.businessId)
        .eq("customer_id", ev.customerId)
        .maybeSingle();
      assignedStaffId = (bc?.assigned_staff_id as string | null) ?? null;
    }
    const recipients = unique.filter((c) => {
      if (prefOff.has(c.userId)) return false;
      if (c.role === "staff") {
        return Boolean(ev.customerId && assignedStaffId && c.staffId === assignedStaffId);
      }
      return true;
    });
    if (recipients.length === 0) return { status: "no_recipients", attempted: 0, delivered: 0 };

    const { data: tokenRows, error: tokenErr } = await admin
      .from("device_tokens")
      .select("id, user_id, token, platform")
      .in("user_id", recipients.map((r) => r.userId));
    if (tokenErr || !tokenRows || tokenRows.length === 0) {
      // Pre-migration (0017) the table simply is not there yet.
      return { status: "no_recipients", attempted: 0, delivered: 0 };
    }

    // Law offices: message previews stay off the lock screen: the
    // push carries the title only (spec privacy rule).
    let title = ev.title;
    let body = ev.body;
    if (ev.kind === "new_message" && business.category === "law-offices") {
      title = "New message";
      body = "";
    }

    let attempted = 0;
    let delivered = 0;
    for (const row of tokenRows as { id: string; token: string; platform: string }[]) {
      const send =
        row.platform === "ios"
          ? apns
            ? sendApns(apns, row.token, title, body, ev.data)
            : Promise.resolve({ delivered: false, gone: false })
          : fcm
            ? sendFcm(fcm, row.token, title, body, ev.data)
            : Promise.resolve({ delivered: false, gone: false });
      attempted++;
      const r = await send;
      if (r.delivered) delivered++;
      if (r.gone) {
        await admin.from("device_tokens").delete().eq("id", row.id);
      }
    }
    return { status: delivered > 0 ? "sent" : "failed", attempted, delivered };
  } catch {
    return { status: "failed", attempted: 0, delivered: 0 };
  }
}
