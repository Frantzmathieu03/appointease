// Native app bridge — CLIENT SIDE (AppointEase App Pieces spec,
// Frantz 2026-11-26; app build phase 1).
//
// Everything in this module is feature-detected: in a normal browser
// every function quietly no-ops, so the website behaves exactly as it
// always has. The native pieces only wake up inside the Capacitor app
// (io.appointease.app loading https://www.appointease.io).
//
// What lives here:
//  - platform detection
//  - push registration (token → public.device_tokens, migration 0017;
//    until that migration lands the write fails soft and is swallowed)
//  - Face ID / biometrics: the session refresh token is stored in the
//    phone's secure vault (Keychain / Keystore) behind biometrics via
//    @capgo/capacitor-native-biometric, and read back on later opens
//    to restore the session.

import { Capacitor } from "@capacitor/core";
import {
  AccessControl,
  NativeBiometric,
  type SetCredentialOptions,
} from "@capgo/capacitor-native-biometric";

const BIOMETRIC_SERVER = "appointease.io";

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function nativePlatform(): "ios" | "android" | null {
  if (!isNativeApp()) return null;
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : null;
}

// ---------------------------------------------------------------------------
// Biometrics (Face ID / fingerprint)
// ---------------------------------------------------------------------------

export async function biometricsAvailable(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const r = await NativeBiometric.isAvailable();
    return Boolean(r.isAvailable);
  } catch {
    return false;
  }
}

export async function biometricSessionSaved(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const r = await NativeBiometric.isCredentialsSaved({ server: BIOMETRIC_SERVER });
    return Boolean(r.isSaved);
  } catch {
    return false;
  }
}

/** Store the current session's refresh token behind biometrics. */
export async function saveBiometricSession(email: string, sessionToken: string): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const opts: Record<string, unknown> = {
      server: BIOMETRIC_SERVER,
      username: email,
      accessControl: AccessControl.BIOMETRY_ANY,
    };
    opts["password"] = sessionToken;
    await NativeBiometric.setCredentials(opts as unknown as SetCredentialOptions);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ask for Face ID / fingerprint and, on success, release the stored
 * refresh token. Returns null when there is nothing stored, the
 * person declines, or biometrics fail — the normal sign-in screen is
 * always the fallback; nobody gets locked out.
 */
export async function readBiometricSession(): Promise<{ email: string; refreshToken: string } | null> {
  if (!isNativeApp()) return null;
  try {
    if (!(await biometricSessionSaved())) return null;
    await NativeBiometric.verifyIdentity({
      reason: "Sign in to AppointEase",
      title: "Welcome back",
      subtitle: "Use Face ID to sign in",
      description: "Confirm it is you to open your AppointEase dashboard.",
    });
    const creds = await NativeBiometric.getCredentials({ server: BIOMETRIC_SERVER });
    if (!creds?.password) return null;
    return { email: creds.username ?? "", refreshToken: creds.password };
  } catch {
    return null;
  }
}

/** Turning Face ID off wipes the stored token from the phone. */
export async function wipeBiometricSession(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER });
  } catch {
    // Nothing stored — that is the desired end state anyway.
  }
}
