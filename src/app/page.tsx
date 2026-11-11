import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Check,
  ClipboardList,
  GraduationCap,
  MessageSquare,
  PackageSearch,
  Ruler,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/atelier/BrandMark";
import { PLANS } from "@/lib/plans";
import { loadWebsiteContent } from "@/lib/website-content.server";
import type { FeatureIcon } from "@/lib/website-content";

export const dynamic = "force-dynamic";

const serif = localFont({
  src: [
    { path: "../fonts/cormorant-garamond/cormorant-garamond-latin-500-normal.woff2", weight: "500" },
    { path: "../fonts/cormorant-garamond/cormorant-garamond-latin-600-normal.woff2", weight: "600" },
    { path: "../fonts/cormorant-garamond/cormorant-garamond-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-serif",
  display: "swap",
});
const sans = localFont({
  src: [
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-500-normal.woff2", weight: "500" },
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-600-normal.woff2", weight: "600" },
    { path: "../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-sans-site",
  display: "swap",
});

export const metadata: Metadata = {
  title: { absolute: "Sewsiness | Atelier management for custom tailoring studios" },
  description:
    "Clients, measurements, orders, fittings, production and training in one system, with dedicated portals for studios, clients and freelancers.",
};

const heading = "font-[family-name:var(--font-serif)] tracking-tight";

const PORTAL_META = {
  studio: { icon: Store, href: "/studio" },
  client: { icon: PackageSearch, href: "/portal" },
  freelancer: { icon: Briefcase, href: "/freelancer?mode=register" },
} as const;

const FEATURE_ICON_MAP: Record<FeatureIcon, typeof Users> = {
  users: Users,
  ruler: Ruler,
  clipboard: ClipboardList,
  calendar: CalendarDays,
  message: MessageSquare,
  sparkles: Sparkles,
  graduation: GraduationCap,
  shield: ShieldCheck,
};

const BOARD = [
  { stage: "Cutting", items: ["Two-piece suit", "Aso-ebi set"] },
  { stage: "Sewing", items: ["Evening gown", "Kaftan"] },
  { stage: "Fitting", items: ["Wedding dress"] },
];

function ProductPreview() {
  return (
    <div aria-hidden="true" className="rounded-2xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-sm">
      <div className="rounded-xl bg-[#FCF8F5] p-4 text-[#2F151B]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Production board</p>
          <span className="rounded-full bg-[#F5E8EB] px-2.5 py-1 text-[11px] font-semibold text-[#650019]">5 active orders</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {BOARD.map((col) => (
            <div key={col.stage} className="rounded-lg bg-[#FAF0F2] p-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A6C70]">{col.stage}</p>
              <div className="mt-2 space-y-2">
                {col.items.map((item) => (
                  <div key={item} className="rounded-md border border-[#EADDE0] bg-white p-2.5 shadow-sm">
                    <p className="text-xs font-semibold leading-snug">{item}</p>
                    <div className="mt-2 h-1 rounded-full bg-[#EBCFD7]">
                      <div className="h-1 rounded-full bg-[#800020]" style={{ width: col.stage === "Cutting" ? "25%" : col.stage === "Sewing" ? "60%" : "90%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const c = await loadWebsiteContent();
  const plans = [PLANS.trial, PLANS.pro, PLANS.enterprise];
  const portals = c.portals.items.filter((p) => p.enabled);
  const freelancerOn = portals.some((p) => p.id === "freelancer");
  const nav = [
    portals.length > 0 && ["#portals", "Portals"],
    c.features.items.length > 0 && ["#features", "Features"],
    c.how.steps.length > 0 && ["#how", "How it works"],
    ["#plans", "Plans"],
    c.faq.items.length > 0 && ["#faq", "FAQ"],
  ].filter(Boolean) as [string, string][];

  return (
    <div className={`${serif.variable} ${sans.variable} min-h-dvh bg-[#FCF8F5] font-[family-name:var(--font-sans-site)] text-[#2F151B] antialiased`}>
      <header className="sticky top-0 z-40 border-b border-[#EADDE0] bg-[#FCF8F5]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href="/" aria-label="Sewsiness home" className="shrink-0">
            <BrandLogo width={104} />
          </Link>
          <nav aria-label="Sections" className="hidden items-center gap-8 text-sm font-medium text-[#80666D] md:flex">
            {nav.map(([href, label]) => <a key={href} href={href} className="hover:text-[#800020]">{label}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            {portals.some((p) => p.id === "client") && (
              <Link href="/portal" className="hidden h-10 items-center rounded-lg px-3 text-sm font-medium text-[#650019] hover:bg-[#F5E8EB] sm:inline-flex">
                {portals.find((p) => p.id === "client")?.cta}
              </Link>
            )}
            <Link href="/studio" className="inline-flex h-10 items-center rounded-lg bg-[#800020] px-4 text-sm font-semibold text-white hover:bg-[#650019]">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#3B0A18] text-white">
          <img src="/atelier-login.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#650019]/90 via-[#4A0E20]/90 to-[#2A0610]/95" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#E6C3CB]">{c.hero.eyebrow}</p>
              <h1 className={`${heading} mt-5 text-5xl font-semibold leading-[1.05] sm:text-6xl`}>
                {c.hero.headline}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
                {c.hero.subheadline}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/studio" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-[#650019] hover:bg-[#FBF1F3]">
                  {c.hero.primaryCta} <ArrowRight className="size-4" />
                </Link>
                {portals.length > 0 && (
                  <a href="#portals" className="inline-flex h-12 items-center justify-center rounded-lg border border-white/30 px-6 text-sm font-semibold hover:bg-white/10">
                    {c.hero.secondaryCta}
                  </a>
                )}
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        {portals.length > 0 && (
          <section id="portals" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">Portals</p>
              <h2 className={`${heading} mt-3 text-4xl font-semibold sm:text-5xl`}>{c.portals.heading}</h2>
              {c.portals.intro && <p className="mt-4 text-[#80666D]">{c.portals.intro}</p>}
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {portals.map((p) => {
                const meta = PORTAL_META[p.id];
                return (
                  <Link key={p.id} href={meta.href} className="group flex flex-col rounded-2xl border border-[#EADDE0] bg-white p-8 transition hover:border-[#D79AA8] hover:shadow-lg">
                    <span className="grid size-12 place-items-center rounded-xl bg-[#F5E8EB] text-[#800020]">
                      <meta.icon className="size-6" />
                    </span>
                    <h3 className={`${heading} mt-6 text-3xl font-semibold`}>{p.name}</h3>
                    {p.audience && <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#832138]">{p.audience}</p>}
                    <p className="mt-4 flex-1 text-sm leading-relaxed text-[#80666D]">{p.blurb}</p>
                    <span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#650019]">
                      {p.cta} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {c.features.items.length > 0 && (
          <section id="features" className="scroll-mt-20 border-y border-[#EADDE0] bg-white">
            <div className="mx-auto max-w-6xl px-5 py-24">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">Features</p>
                <h2 className={`${heading} mt-3 text-4xl font-semibold sm:text-5xl`}>{c.features.heading}</h2>
              </div>
              <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                {c.features.items.map((f, i) => {
                  const Icon = FEATURE_ICON_MAP[f.icon];
                  return (
                    <div key={i}>
                      <span className="grid size-10 place-items-center rounded-lg bg-[#F5E8EB] text-[#800020]">
                        <Icon className="size-5" />
                      </span>
                      <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#80666D]">{f.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {c.how.steps.length > 0 && (
          <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">How it works</p>
              <h2 className={`${heading} mt-3 text-4xl font-semibold sm:text-5xl`}>{c.how.heading}</h2>
            </div>
            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {c.how.steps.map((st, i) => (
                <li key={i} className="border-t-2 border-[#800020] pt-5">
                  <span className={`${heading} text-4xl font-semibold text-[#B85C70]`}>{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 text-base font-semibold">{st.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#80666D]">{st.text}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section id="plans" className="scroll-mt-20 bg-[#F9F2F4]">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">Plans</p>
              <h2 className={`${heading} mt-3 text-4xl font-semibold sm:text-5xl`}>{c.plans.heading}</h2>
              {c.plans.intro && <p className="mt-4 text-[#80666D]">{c.plans.intro}</p>}
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.key} className={"flex flex-col rounded-2xl bg-white p-8 " + (plan.key === "pro" ? "border-2 border-[#800020] shadow-lg" : "border border-[#EADDE0]")}>
                  {plan.key === "pro" && <span className="mb-3 w-fit rounded-full bg-[#800020] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">Most popular</span>}
                  <h3 className={`${heading} text-3xl font-semibold`}>{plan.name}</h3>
                  <p className="mt-2 text-sm text-[#80666D]">{plan.summary}</p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex gap-2.5 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-[#800020]" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/studio" className={"mt-8 inline-flex h-11 items-center justify-center rounded-lg text-sm font-semibold " + (plan.key === "pro" ? "bg-[#800020] text-white hover:bg-[#650019]" : "border border-[#E6C3CB] text-[#650019] hover:bg-[#FBF1F3]")}>
                    {plan.key === "trial" ? "Start free trial" : "Get started"}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {c.faq.items.length > 0 && (
          <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">FAQ</p>
            <h2 className={`${heading} mt-3 text-4xl font-semibold sm:text-5xl`}>{c.faq.heading}</h2>
            <div className="mt-10 divide-y divide-[#EADDE0] border-y border-[#EADDE0]">
              {c.faq.items.map((f, i) => (
                <details key={i} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold">
                    {f.q}
                    <span aria-hidden="true" className="text-xl text-[#800020] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[#80666D]">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="rounded-3xl bg-gradient-to-br from-[#650019] to-[#3B0A18] px-7 py-16 text-center text-white sm:px-14">
            <h2 className={`${heading} mx-auto max-w-2xl text-4xl font-semibold sm:text-5xl`}>{c.cta.heading}</h2>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/studio" className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold text-[#650019] hover:bg-[#FBF1F3]">
                Create your studio account
              </Link>
              {freelancerOn && (
                <Link href="/freelancer?mode=register" className="inline-flex h-12 items-center justify-center rounded-lg border border-white/30 px-6 text-sm font-semibold hover:bg-white/10">
                  {portals.find((p) => p.id === "freelancer")?.cta}
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#EADDE0] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <BrandLogo width={150} />
            {c.footer.tagline && <p className="mt-2 text-sm text-[#80666D]">{c.footer.tagline}</p>}
            <p className="mt-2 text-xs text-[#80666D]">© {new Date().getFullYear()} Sewsiness. All rights reserved.</p>
            {c.footer.contactEmail && <a href={`mailto:${c.footer.contactEmail}`} className="mt-1 inline-block text-xs font-medium text-[#800020] hover:underline">{c.footer.contactEmail}</a>}
          </div>
          <nav aria-label="Portals" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-[#80666D]">
            {portals.map((p) => (
              <Link key={p.id} href={p.id === "freelancer" ? "/freelancer" : PORTAL_META[p.id].href} className="hover:text-[#800020]">{p.name}</Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
