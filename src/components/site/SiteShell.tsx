import Link from "next/link";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { ArrowUpRight, Menu } from "lucide-react";
import { BrandLogo } from "@/components/atelier/BrandMark";
import { CONTACT, SITE } from "@/lib/site-config";

const serif = localFont({
  src: [
    { path: "../../fonts/cormorant-garamond/cormorant-garamond-latin-500-normal.woff2", weight: "500" },
    { path: "../../fonts/cormorant-garamond/cormorant-garamond-latin-600-normal.woff2", weight: "600" },
    { path: "../../fonts/cormorant-garamond/cormorant-garamond-latin-700-normal.woff2", weight: "700" },
  ], variable: "--font-serif", display: "swap",
});
const sans = localFont({
  src: [
    { path: "../../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-400-normal.woff2", weight: "400" },
    { path: "../../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-500-normal.woff2", weight: "500" },
    { path: "../../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-600-normal.woff2", weight: "600" },
    { path: "../../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-700-normal.woff2", weight: "700" },
  ], variable: "--font-sans-site", display: "swap",
});

export const heading = "font-[family-name:var(--font-serif)] tracking-tight";
export const eyebrow = "text-xs font-bold uppercase tracking-[0.22em] text-[#800020]";
const NAV = [["/#who", "Our story"], ["/#app", "The platform"], ["/training", "Training"], ["/#products", "Resources"], ["/#contact", "Contact"]] as const;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#eadde0]/80 bg-[#FCF8F5]/95 shadow-[0_4px_24px_rgba(59,10,24,.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
        <Link href="/" aria-label="Sewsiness home" className="shrink-0"><BrandLogo width={132} /></Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
          {NAV.map(([href, label]) => <Link key={href} href={href} className="text-[13px] font-semibold text-[#765d63] transition hover:text-[#800020]">{label}</Link>)}
        </nav>
        <div className="flex items-center gap-2.5">
          <a href={SITE.studioUrl} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#800020] px-5 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(128,0,32,.18)] transition hover:-translate-y-0.5 hover:bg-[#650019]">
            <span className="whitespace-nowrap"><span className="hidden sm:inline">Enter your studio</span><span className="sm:hidden">Sign in</span></span> <ArrowUpRight className="size-4" />
          </a>
          <details className="group relative lg:hidden">
            <summary aria-label="Open menu" className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-[#eadde0] bg-white text-[#800020] [&::-webkit-details-marker]:hidden"><Menu className="size-5" /></summary>
            <div className="absolute right-0 top-14 w-64 rounded-2xl border border-[#eadde0] bg-[#fffdfa] p-2 shadow-2xl">
              {NAV.map(([href, label]) => <Link key={href} href={href} className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#5b3e46] hover:bg-[#f8edf0] hover:text-[#800020]">{label}</Link>)}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="bg-[#260711] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div><div className="inline-flex rounded-xl bg-white px-3 py-2"><BrandLogo width={142} /></div><p className="mt-4 max-w-sm text-sm leading-7 text-white/75">{SITE.line}. Thoughtful tools, practical business skills and a community for people who make clothes.</p><p className="mt-6 text-xs text-white/70">© {new Date().getFullYear()} Sewsiness. All rights reserved.</p></div>
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#e5bd83]">Get in touch</p><div className="mt-4 space-y-3 text-sm text-white/70"><a className="block hover:text-white" href={`mailto:${CONTACT.generalEmail}`}>{CONTACT.generalEmail}</a><a className="block hover:text-white" href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a><a className="block hover:text-white" href={CONTACT.whatsappLink}>WhatsApp {CONTACT.whatsappDisplay}</a></div></div>
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#e5bd83]">Explore</p><div className="mt-4 space-y-3 text-sm text-white/70"><Link className="block hover:text-white" href="/#app">The platform</Link><Link className="block hover:text-white" href="/training">Free training</Link><Link className="block hover:text-white" href="/privacy">Privacy</Link><Link className="block hover:text-white" href="/terms">Terms</Link><a className="block hover:text-white" href={CONTACT.community}>WhatsApp community</a></div></div>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return <div className={`${serif.variable} ${sans.variable} min-h-dvh bg-[#FCF8F5] font-[family-name:var(--font-sans-site)] text-[#2F151B] antialiased`}><SiteHeader /><div id="main" role="main">{children}</div><SiteFooter /></div>;
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return <SiteShell><article className="mx-auto max-w-3xl px-5 py-16 sm:py-24"><p className={eyebrow}>Sewsiness / Legal</p><h1 className={`${heading} mt-3 text-5xl font-semibold`}>{title}</h1><p className="mt-3 text-sm text-[#80666D]">Last updated {SITE.lastUpdated}</p><div className="mt-10 space-y-8 text-[.97rem] leading-8 text-[#5f4b50] [&_a]:font-semibold [&_a]:text-[rgb(128,0,32)] [&_a]:underline [&_h2]:font-[family-name:var(--font-serif)] [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-[rgb(128,0,32)] [&_h2+*]:mt-3 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">{children}</div></article></SiteShell>;
}
