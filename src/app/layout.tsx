import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { SupabaseHealthChecker } from "@/components/SupabaseHealthChecker";

// Self-hosted font files (see src/fonts) instead of next/font/google.
// This removes the build-time dependency on fetching fonts.googleapis.com,
// which was failing with a 403 during the Vercel build.
const jakarta = localFont({
  variable: "--font-body",
  display: "swap",
  src: [
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-200-normal.woff2", weight: "200", style: "normal" },
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
});

const cormorant = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "../fonts/cormorant-garamond/cormorant-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/cormorant-garamond/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/cormorant-garamond/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/cormorant-garamond/cormorant-garamond-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Madam Studio — Atelier Management",
  description:
    "An elegant atelier management system for custom tailoring studios — clients, orders, fittings, production and AI style assist.",
  keywords: [
    "atelier",
    "tailoring",
    "bespoke",
    "fashion studio",
    "custom clothing",
    "style assist",
  ],
  authors: [{ name: "Madam Studio" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Madam Studio — Atelier Management",
    description:
      "An elegant atelier management system for custom tailoring studios — clients, orders, fittings, production and AI style assist.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${cormorant.variable} antialiased font-body`}
      >
        {children}
        <SupabaseHealthChecker />
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
