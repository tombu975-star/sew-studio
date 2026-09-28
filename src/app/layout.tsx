import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

// Cormorant Garamond (display serif) + Plus Jakarta Sans (UI text), both
// self-hosted via next/font/local: no build-time fetch to Google Fonts,
// automatic preload, and size-adjusted fallbacks so text doesn't jump when
// the fonts arrive. Only the weights the UI actually uses are shipped.
const jakarta = localFont({
  src: [
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-jakarta",
  display: "swap",
});

const cormorant = localFont({
  src: [
    { path: "../fonts/cormorant-garamond/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/cormorant-garamond/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/cormorant-garamond/cormorant-garamond-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-cormorant",
  display: "swap",
});

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
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${cormorant.variable}`}>
      <body className="antialiased font-body">
        {children}
        <ServiceWorkerRegister />
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
