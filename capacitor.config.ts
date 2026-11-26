import type { CapacitorConfig } from "@capacitor/cli";

// AppointEase mobile app (Frantz's App Pieces spec, 2026-11-26).
// Remote-load mode: the site is a server-rendered Next.js app with
// accounts and a database, so there is no static export to bundle —
// the app loads the live site and stays in sync with it automatically.
// The appId is permanent once published; do not change it.
const config: CapacitorConfig = {
  appId: "io.appointease.app",
  appName: "AppointEase",
  webDir: "public",
  server: {
    url: "https://www.appointease.io",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: false, // the web bridge hides it once the page is ready
      backgroundColor: "#1E4D33",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
