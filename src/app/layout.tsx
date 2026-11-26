import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import NativeBridge from "@/components/NativeBridge";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.appointease.io"),
  title: "AppointEase — Let customers book. Get back to work.",
  description:
    "Online booking, reminders and messaging for salons, barbershops, law firms, medical offices and other appointment-based businesses.",
  openGraph: {
    title: "AppointEase — Let customers book. Get back to work.",
    description:
      "Online booking, reminders and messaging for salons, barbershops, law firms, medical offices and other appointment-based businesses.",
    url: "https://www.appointease.io",
    siteName: "AppointEase",
    images: [{ url: "/hero/hero-poster.jpg" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AppointEase — Let customers book. Get back to work.",
    description:
      "Online booking, reminders and messaging for salons, barbershops, law firms, medical offices and other appointment-based businesses.",
    images: ["/hero/hero-poster.jpg"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.png",
    apple: "/icon-512.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteChrome>{children}</SiteChrome>
        {/* Native app bridge — completely inert in a normal browser. */}
        <NativeBridge />
      </body>
    </html>
  );
}
