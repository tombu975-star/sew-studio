import Link from "next/link";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/atelier/BrandMark";
import { CONTACT, SITE } from "@/lib/site-config";

const serif = localFont({
  src: [
    { path: "../../fonts/cormorant-garamond/cormorant-garamond-latin-500-normal.woff2", weight: "500" },
    { path: "../../fonts/cormorant-garamond/cormorant-garamond-latin-600-normal.woff2", weight: "600" },
    { path: "../../fonts/cormorant-garamond/cormorant-garamond-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-serif",
  display: "swap",
});
const sans = localFont({
  src: [
    { path: "../../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-400-normal.woff2", weight: "400" },
    { path: "../../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-500-normal.woff2", weight: "500" },
    { path: "../../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-600-normal.woff2", weight: "600" },
    { path: "../../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-sans-site",
  display: "swap",
});

export const heading = "font-[family-name:var(--font-serif)] tracking-tight";
export const eyebrow = "text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]";

const NAV = [
  ["/#who", "Who we are"],
  ["/#app", "The app"],
  ["/#training", "Free training"],
  ["/#products", "Products"],
  ["/#contact", "Contact"],
] as const;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#EADDE0] bg-[#FCF8F5]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" aria-label="Sewsiness home" className="shrink-0">
          <BrandLogo width={104} />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-8 text-sm font-medium text-[#80666D] md:flex">
          {NAV.map(([href, label]) => <Link key={href} href={href} className="hover:text-[#800020]">{label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <a href={`${SITE.appUrl}studio`} className="inline-flex h-10 items-center rounded-lg bg-[#800020] px-4 text-sm font-semibold text-white hover:bg-[#650019]">
            Sign in
          </a>
          {/* Phone menu: plain <details>, so it needs no JavaScript. */}
          <details className="group relative md:hidden">
            <summary aria-label="Menu" className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-[#EADDE0] text-[#800020] [&::-webkit-details-marker]:hidden">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path className="group-open:hidden" d="M4 7h16M4 12h16M4 17h16" />
                <path className="hidden group-open:block" d="M6 6l12 12M18 6 6 18" />
              </svg>
            </summary>
            <div className="absolute right-0 top-12 w-64 max-w-[calc(100vw-2.5rem)] rounded-xl border border-[#EADDE0] bg-[#FCF8F5] p-2 shadow-lg">
              {NAV.map(([href, label]) => (
                <Link key={href} href={href} className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-[#F5E8EB]">{label}</Link>
              ))}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#EADDE0] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:flex-row sm:justify-between">
        <div>
          <BrandLogo width={150} />
          <p className="mt-2 text-sm text-[#80666D]">{SITE.line}</p>
          <p className="mt-2 text-xs text-[#80666D]">© {new Date().getFullYear()} Sewsiness. All rights reserved.</p>
        </div>
        <div className="space-y-1.5 text-sm text-[#80666D]">
          <a href={`mailto:${CONTACT.generalEmail}`} className="block font-medium text-[#800020] hover:underline">{CONTACT.generalEmail}</a>
          <a href={`mailto:${CONTACT.supportEmail}`} className="block font-medium text-[#800020] hover:underline">{CONTACT.supportEmail}</a>
          <a href={CONTACT.whatsappLink} className="block hover:text-[#800020]">WhatsApp {CONTACT.whatsappDisplay}</a>
        </div>
        <div className="flex gap-x-6 gap-y-2 text-sm font-medium text-[#80666D] sm:flex-col sm:gap-y-1.5">
          <Link href="/privacy" className="hover:text-[#800020]">Privacy</Link>
          <Link href="/terms" className="hover:text-[#800020]">Terms</Link>
        </div>
      </div>
    </footer>
  );
}

/** Same page frame as the original site: ivory-pink page, header, footer. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${serif.variable} ${sans.variable} min-h-dvh bg-[#FCF8F5] font-[family-name:var(--font-sans-site)] text-[#2F151B] antialiased`}>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <p className={eyebrow}>Sewsiness</p>
        <h1 className={`${heading} mt-3 text-4xl font-semibold sm:text-5xl`}>{title}</h1>
        <p className="mt-3 text-sm text-[#80666D]">Last updated {SITE.lastUpdated}</p>
        <div className="mt-10 space-y-8 text-[0.97rem] leading-relaxed [&_a]:font-medium [&_a]:text-[rgb(128,0,32)] [&_a]:underline [&_h2]:font-[family-name:var(--font-serif)] [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-[rgb(128,0,32)] [&_h2+*]:mt-3 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </SiteShell>
  );
}
