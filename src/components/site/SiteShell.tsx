import Link from "next/link";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { MobileMenu } from "@/components/site/MobileMenu";
import { BrandLogo } from "@/components/atelier/BrandMark";
import { loadWebsiteContent } from "@/lib/website-content.server";
import { isExternalHref, resolveStudioUrl, type WebsiteContent } from "@/lib/website-content";

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

/** A link that opens external addresses normally and keeps site paths client-side. */
function NavLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return isExternalHref(href)
    ? <a href={href} className={className} target="_blank" rel="noopener noreferrer">{children}</a>
    : <Link href={href} className={className}>{children}</Link>;
}

function SiteHeader({ content }: { content: WebsiteContent }) {
  const { site, nav } = content;
  const studioUrl = resolveStudioUrl(site);
  return (
    <header className="sticky top-0 z-40 border-b border-[#eadde0] bg-[#FCF8F5]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:h-[72px] sm:gap-4 sm:px-8">
        <Link href="/" aria-label={`${site.name} home`} className="shrink-0"><BrandLogo width={116} className="!w-[96px] sm:!w-[116px]" /></Link>
        <nav aria-label="Main navigation" className="hidden min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 xl:flex">
          {[...nav.items.filter((item)=>item.href!=="/ready-to-wear"),{href:"/ready-to-wear",label:"Ready to Wear"}].map((item) => <NavLink key={`${item.href}-${item.label}`} href={item.href} className="text-[13px] font-semibold text-[#765d63] transition hover:text-[#800020]">{item.label}</NavLink>)}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <a href={studioUrl} className="hidden h-11 items-center gap-1.5 rounded-lg bg-[#800020] px-3 text-[13px] sm:px-4 font-semibold text-white transition-colors hover:bg-[#650019] xl:inline-flex">
            <span className="whitespace-nowrap"><span className="hidden sm:inline">{nav.enterLabel}</span><span className="sm:hidden">{nav.enterLabelShort}</span></span> <ArrowUpRight className="hidden size-4 sm:block" />
          </a>
          <MobileMenu signInHref={studioUrl} signInLabel={nav.enterLabelShort} items={[...nav.items.filter((item)=>item.href!=="/ready-to-wear"),{href:"/ready-to-wear",label:"Ready to Wear"},{href:"/ready-to-wear/track",label:"Track my order"}]} />
        </div>
      </div>
    </header>
  );
}

function SiteFooter({ content }: { content: WebsiteContent }) {
  const { site, contact, footer } = content;
  return (
    <footer className="bg-[#260711] text-white">
      <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 sm:pt-12">
        <div className="grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-[1.25fr_1fr_1fr] md:gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="inline-flex rounded-lg bg-white px-2 py-1.5"><BrandLogo width={108} /></div>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/75">{site.line}.{footer.blurb ? ` ${footer.blurb}` : ""}</p>
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-[.14em] text-[#e5bd83]">Explore</h2>
            <nav aria-label="Footer navigation" className="mt-2 flex flex-col text-sm text-white/80">
              <Link className="py-2 hover:text-white" href="/our-story">Our story</Link>
              <Link className="py-2 hover:text-white" href="/#app">The platform</Link>
              <Link className="py-2 hover:text-white" href="/academy">Free Academy</Link>
              <Link className="py-2 hover:text-white" href="/ready-to-wear">Ready to Wear</Link>
            </nav>
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-[.14em] text-[#e5bd83]">Get in touch</h2>
            <div className="mt-2 flex flex-col text-sm text-white/80">
              {contact.generalEmail && <a className="break-words py-2 hover:text-white" href={`mailto:${contact.generalEmail}`}>{contact.generalEmail}</a>}
              {contact.supportEmail && <a className="break-words py-2 hover:text-white" href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>}
              {contact.whatsappLink && <a className="py-2 hover:text-white" href={contact.whatsappLink}>WhatsApp <span className="block md:inline">{contact.whatsappDisplay}</span></a>}
              {contact.community && <a className="py-2 hover:text-white" href={contact.community}>WhatsApp community</a>}
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-white/15 py-4 text-xs leading-5 text-white/70 sm:mt-8">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <nav aria-label="Legal links" className="flex gap-5"><Link className="py-2 hover:text-white" href="/privacy">Privacy</Link><Link className="py-2 hover:text-white" href="/terms">Terms</Link></nav>
        </div>
      </div>
    </footer>
  );
}

/** Wraps a public page with the header and footer. Content comes from the admin-editable website settings. */
export async function SiteShell({ children }: { children: ReactNode }) {
  const content = await loadWebsiteContent();
  return <div className={`${serif.variable} ${sans.variable} min-h-dvh bg-[#FCF8F5] font-[family-name:var(--font-sans-site)] text-[#2F151B] antialiased`}><a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-[#800020] focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white">Skip to content</a><SiteHeader content={content} /><div id="main" role="main" tabIndex={-1} className="outline-none">{children}</div><SiteFooter content={content} /></div>;
}

export async function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const { site } = await loadWebsiteContent();
  return <SiteShell><article className="mx-auto max-w-3xl px-5 py-16 sm:py-24"><p className={eyebrow}>{site.name} / Legal</p><h1 className={`${heading} mt-3 text-5xl font-semibold`}>{title}</h1><p className="mt-3 text-sm text-[#80666D]">Last updated {site.lastUpdated}</p><div className="mt-10 space-y-8 text-[.97rem] leading-8 text-[#5f4b50] [&_a]:font-semibold [&_a]:text-[rgb(128,0,32)] [&_a]:underline [&_h2]:font-[family-name:var(--font-serif)] [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-[rgb(128,0,32)] [&_h2+*]:mt-3 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">{children}</div></article></SiteShell>;
}
