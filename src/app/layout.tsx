import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

// Poppins (display/headings) + Inter (body) via self-hosted @fontsource
// packages — same reasoning as the previous local-font setup: this avoids
// a build-time fetch to fonts.googleapis.com, which has previously failed
// during Vercel builds. Font stacks themselves are set in globals.css.

export const metadata: Metadata = {
  title: "Madam Studio — Atelier Management",
  description:
    "One system, every role — a smarter atelier for custom tailoring studios: clients, orders, production, training and AI style assist, all in one place.",
  keywords: [
    "atelier",
    "tailoring",
    "bespoke",
    "fashion studio",
    "custom clothing",
    "style assist",
  ],
  authors: [{ name: "Madam Studio" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Madam Studio",
  },
  openGraph: {
    title: "Madam Studio — Atelier Management",
    description:
      "One system, every role — a smarter atelier for custom tailoring studios: clients, orders, production, training and AI style assist, all in one place.",
  },
};

// viewport-fit=cover lets fixed headers/nav bars extend under the notch /
// home-indicator on iOS while we pad them back out with env(safe-area-inset-*).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#800020",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-body">
        {children}
        <ServiceWorkerRegister />
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
