import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import NativeBridge from "@/components/NativeBridge";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getMembership, getOwnerBusiness } from "@/lib/owner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.appointease.io"),
  title: "AppointEase · Let customers book. Get back to work.",
  description:
    "Online booking, reminders and messaging for salons, barbershops, law firms, medical offices and other appointment based businesses.",
  openGraph: {
    title: "AppointEase · Let customers book. Get back to work.",
    description:
      "Online booking, reminders and messaging for salons, barbershops, law firms, medical offices and other appointment based businesses.",
    url: "https://www.appointease.io",
    siteName: "AppointEase",
    images: [{ url: "/hero/hero-poster.jpg" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AppointEase · Let customers book. Get back to work.",
    description:
      "Online booking, reminders and messaging for salons, barbershops, law firms, medical offices and other appointment based businesses.",
    images: ["/hero/hero-poster.jpg"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.png",
    apple: "/icon-512.png",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Platform header state (audit fix, 2026-11-27): a signed in owner
  // or active team member sees "My dashboard" in the header instead
  // of the guest words "Log in / Get started for free". Resolved on
  // the server so the right words render first, with no flicker. A
  // customer only session keeps the guest labels.
  let insider = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        insider =
          Boolean(await getOwnerBusiness(supabase, user.id)) ||
          Boolean(await getMembership(supabase, user.id));
      }
    } catch {
      insider = false;
    }
  }
  return (
    <html lang="en">
      <body>
        <SiteChrome insider={insider}>{children}</SiteChrome>
        {/* Native app bridge: completely inert in a normal browser. */}
        <NativeBridge />
      </body>
    </html>
  );
}
