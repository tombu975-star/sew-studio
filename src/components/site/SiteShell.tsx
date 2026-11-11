import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT, SITE } from "@/lib/site-config";
import { sans, serif } from "./fonts";

/** Serif display style used for headings across the public pages. */
export const heading = "font-[family-name:var(--font-serif)] font-semibold tracking-tight";

/** Small burgundy label above a section heading. */
export const eyebrow = "text-xs font-semibold uppercase tracking-[0.18em] text-[var(--site-burgundy)]";

/**
 * Light, text-only logo: a needle-and-thread mark plus the name set in text.
 * No image to download, so it loads instantly on a slow connection.
 */
export function SiteLogo({ light = false }: { light?: boolean }) {
  const colour = light ? "text-[var(--site-ivory)]" : "text-[var(--site-burgundy)]";
  return (
    <span className={`inline-flex items-center gap-2.5 ${colour}`}>
      <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M31 6 11 34" />
        <ellipse cx="31.6" cy="7" rx="2.2" ry="4.2" transform="rotate(35 31.6 7)" strokeWidth="2" />
        <path d="M4 30c5-1 6-7 11-6s5 8 11 6" strokeDasharray="2.5 3.5" strokeWidth="2" />
      </svg>
      <span className={`${heading} text-[1.7rem] leading-none`}>Sewsiness</span>
    </span>
  );
}

const NAV = [
  ["/#who", "Who we are"],
  ["/#app", "The app"],
  ["/#training", "Free training"],
  ["/#products", "Products"],
  ["/#contact", "Contact"],
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--site-line)] bg-[var(--site-ivory)]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" aria-label="Sewsiness home" className="shrink-0">
          <SiteLogo />
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-7 text-sm font-medium text-[var(--site-muted)] lg:flex">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-[var(--site-burgundy)]">{label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a href={`${SITE.appUrl}studio`} className="hidden h-10 items-center rounded-lg px-3 text-sm font-semibold text-[var(--site-burgundy)] hover:bg-[var(--site-ivory-2)] sm:inline-flex">
            Sign in
          </a>
          <a href={SITE.appUrl} className="hidden h-10 items-center rounded-lg bg-[var(--site-burgundy)] px-4 text-sm font-semibold text-[var(--site-ivory)] hover:bg-[var(--site-burgundy-dark)] md:inline-flex">
            Create your studio account
          </a>

          {/* Mobile menu: plain <details>, so it needs no JavaScript. */}
          <details className="group relative lg:hidden">
            <summary
              aria-label="Menu"
              className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-[var(--site-line)] text-[var(--site-burgundy)] [&::-webkit-details-marker]:hidden"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path className="group-open:hidden" d="M4 7h16M4 12h16M4 17h16" />
                <path className="hidden group-open:block" d="M6 6l12 12M18 6 6 18" />
              </svg>
            </summary>
            <div className="absolute right-0 top-12 w-72 max-w-[calc(100vw-2.5rem)] rounded-xl border border-[var(--site-line)] bg-[var(--site-ivory)] p-2 shadow-lg">
              {NAV.map(([href, label]) => (
                <Link key={href} href={href} className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-[var(--site-ivory-2)]">{label}</Link>
              ))}
              <div className="mt-1 border-t border-[var(--site-line)] p-2 pt-3">
                <a href={SITE.appUrl} className="flex h-11 items-center justify-center rounded-lg bg-[var(--site-burgundy)] text-sm font-semibold text-[var(--site-ivory)]">
                  Create your studio account
                </a>
                <a href={`${SITE.appUrl}studio`} className="mt-2 flex h-11 items-center justify-center rounded-lg border border-[var(--site-line)] text-sm font-semibold text-[var(--site-burgundy)]">
                  Sign in
                </a>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[var(--site-burgundy-deep)] text-[var(--site-ivory)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <SiteLogo light />
          <p className="mt-3 max-w-xs text-sm text-[#E9D3D3]">{SITE.line}</p>
        </div>
        <div role="navigation" aria-label="Footer" className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E9D3D3]">Explore</p>
          <ul className="mt-3 space-y-2">
            {NAV.map(([href, label]) => (
              <li key={href}><Link href={href} className="hover:underline">{label}</Link></li>
            ))}
            <li><Link href="/privacy" className="hover:underline">Privacy</Link></li>
            <li><Link href="/terms" className="hover:underline">Terms</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E9D3D3]">Get in touch</p>
          <ul className="mt-3 space-y-2 break-words">
            <li><a href={`mailto:${CONTACT.generalEmail}`} className="hover:underline">{CONTACT.generalEmail}</a></li>
            <li><a href={`mailto:${CONTACT.supportEmail}`} className="hover:underline">{CONTACT.supportEmail}</a></li>
            <li><a href={CONTACT.whatsappLink} className="hover:underline">WhatsApp {CONTACT.whatsappDisplay}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-[#E9D3D3]">© {new Date().getFullYear()} Sewsiness. All rights reserved.</p>
      </div>
    </footer>
  );
}

/** Wraps every public page: brand colours, fonts, header and footer. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${serif.variable} ${sans.variable} min-h-dvh bg-[var(--site-ivory)] font-[family-name:var(--font-sans-site)] text-[var(--site-ink)] antialiased [--site-burgundy-dark:#561624] [--site-burgundy-deep:#4A1220] [--site-burgundy:#6D1E2E] [--site-ink:#2A1A1D] [--site-ivory-2:#EFE8D6] [--site-ivory:#F8F4E8] [--site-line:#DDD3BC] [--site-muted:#5E4A4E]`}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <SiteHeader />
      <div id="main" role="main">{children}</div>
      <SiteFooter />
    </div>
  );
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <p className={eyebrow}>Sewsiness</p>
        <h1 className={`${heading} mt-3 text-4xl sm:text-5xl`}>{title}</h1>
        <p className="mt-3 text-sm text-[var(--site-muted)]">Last updated {SITE.lastUpdated}</p>
        <div className="mt-10 space-y-8 text-[0.97rem] leading-relaxed [&_a]:font-medium [&_a]:text-[var(--site-burgundy)] [&_a]:underline [&_h2]:font-[family-name:var(--font-serif)] [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-[var(--site-burgundy)] [&_h2+*]:mt-3 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </SiteShell>
  );
}
