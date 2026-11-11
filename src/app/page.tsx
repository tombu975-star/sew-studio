import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Boxes, Calculator, Check, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { SiteShell, eyebrow, heading } from "@/components/site/SiteShell";
import { APP_FEATURES, AUDIENCE, CONTACT, MISSION, PRODUCT_GROUPS, SITE, VISION } from "@/lib/site-config";

export const metadata: Metadata = {
  title: { absolute: "Sewsiness | The brand behind the business of sewing" },
  description:
    "Business coaching, training, tools and an app for people who sew for a living. Learn to price properly, keep good records and pay yourself.",
};

const FEATURE_ICONS = [Calculator, Users, ShoppingBag, TrendingUp, Boxes];

// Auto-fitting grids: they stay one column on a phone and never squeeze.
const autoGrid = "grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))]";

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

export default function HomePage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#3B0A18] text-white">
        <img src="/atelier-login.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#650019]/90 via-[#4A0E20]/90 to-[#2A0610]/95" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#E6C3CB]">Business of sewing</p>
            <h1 className={`${heading} mt-5 text-5xl font-semibold leading-[1.05] text-white sm:text-6xl`} style={{ color: "#fff" }}>{SITE.line}</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              Business coaching, training, tools and an app for people who sew for a living. The craft skill is
              already there; we teach the business side: pricing, structure and systems.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={SITE.appUrl} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-[#650019] hover:bg-[#FBF1F3]">
                Create your studio account <ArrowRight className="size-4" />
              </a>
              <a href="#products" className="inline-flex h-12 items-center justify-center rounded-lg border border-white/30 px-6 text-sm font-semibold hover:bg-white/10">
                See the products
              </a>
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      {/* Who we are */}
      <section id="who" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
        <div className="max-w-2xl">
          <p className={eyebrow}>Who we are</p>
          <h2 className={`${heading} mt-3 text-4xl font-semibold sm:text-5xl`}>Sewsiness is the brand behind the business of sewing</h2>
          <p className="mt-4 leading-relaxed text-[#80666D]">
            Many people who sew have the craft and were never taught the business: how to price, how to keep records,
            how to pay themselves. We teach that, and we are building the tools to run it.
          </p>
          <p className="mt-3 leading-relaxed text-[#80666D]">
            Sewsiness brings together training, practical tools, and an app, made for sewing businesses in Ghana and
            beyond. It was shaped by years of running a real fashion business.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[#EADDE0] bg-white p-8">
            <h3 className={`${heading} text-3xl font-semibold`}>Our mission</h3>
            <p className="mt-4 text-sm leading-relaxed text-[#80666D]">{MISSION}</p>
          </div>
          <div className="rounded-2xl border border-[#EADDE0] bg-white p-8">
            <h3 className={`${heading} text-3xl font-semibold`}>Our vision</h3>
            <p className="mt-4 text-sm leading-relaxed text-[#80666D]">{VISION}</p>
          </div>
        </div>
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#832138]">Who it is for</p>
          <ul className="mt-3 flex flex-wrap gap-2.5">
            {AUDIENCE.map((a) => (
              <li key={a} className="rounded-full bg-[#F5E8EB] px-4 py-2 text-sm font-semibold text-[#650019]">{a}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* The app */}
      <section id="app" className="scroll-mt-20 border-y border-[#EADDE0] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <div className="max-w-2xl">
            <p className={eyebrow}>The app</p>
            <h2 className={`${heading} mt-3 text-4xl font-semibold sm:text-5xl`}>Run your sewing business in one place</h2>
            <p className="mt-4 text-[#80666D]">Clients, measurements, orders, production and fittings.</p>
          </div>
          <div className={`mt-12 gap-x-10 gap-y-10 ${autoGrid}`}>
            {APP_FEATURES.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <div key={f.name}>
                  <span className="grid size-10 place-items-center rounded-lg bg-[#F5E8EB] text-[#800020]">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{f.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#80666D]">{f.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Try it and free training */}
      <section id="training" className="scroll-mt-20 bg-[#F9F2F4]">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col rounded-2xl border-2 border-[#800020] bg-white p-8 shadow-lg">
              <span className="mb-3 w-fit rounded-full bg-[#800020] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">Free for two months</span>
              <h3 className={`${heading} text-3xl font-semibold`}>Try it</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[#80666D]">
                Free for two months, with every feature available at that time. After that, choose the plan that fits
                your studio. Your records stay visible, and adding new entries requires a plan. The app is in early
                testing.
              </p>
              <a href={SITE.appUrl} className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-[#800020] text-sm font-semibold text-white hover:bg-[#650019]">
                Create your studio account
              </a>
            </div>
            <div className="flex flex-col rounded-2xl border border-[#EADDE0] bg-white p-8">
              <span className="mb-3 w-fit rounded-full bg-[#F5E8EB] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#650019]">Sponsored by Sewsiness</span>
              <h3 className={`${heading} text-3xl font-semibold`}>Free training</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[#80666D]">
                New fashion graduates: join our free webinar series on getting your first paying clients. Sponsored by
                Sewsiness.
              </p>
              {SITE.webinarFormUrl ? (
                <a href={SITE.webinarFormUrl} className="mt-8 inline-flex h-11 items-center justify-center rounded-lg border border-[#E6C3CB] text-sm font-semibold text-[#650019] hover:bg-[#FBF1F3]">
                  Sign up
                </a>
              ) : (
                <>
                  <span aria-disabled="true" className="mt-8 inline-flex h-11 cursor-not-allowed items-center justify-center rounded-lg border border-dashed border-[#E6C3CB] text-sm font-semibold text-[#650019]">
                    Sign-up opens soon
                  </span>
                  <p className="mt-3 text-xs text-[#80666D]">
                    Want to hear first? Join the <a href={CONTACT.community} className="font-semibold text-[#800020] underline">WhatsApp community</a>.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
        <div className="max-w-2xl">
          <p className={eyebrow}>Products</p>
          <h2 className={`${heading} mt-3 text-4xl font-semibold sm:text-5xl`}>Guides, workbooks and templates</h2>
          <p className="mt-4 text-[#80666D]">Each product opens on its Selar page.</p>
        </div>
        <div className={`mt-12 ${autoGrid}`}>
          {PRODUCT_GROUPS.map((g) => (
            <div key={g.title} className="rounded-2xl border border-[#EADDE0] bg-white p-6 sm:p-8">
              <h3 className={`${heading} text-2xl font-semibold`}>{g.title}</h3>
              <ul className="mt-4 divide-y divide-[#EADDE0]">
                {g.products.map((p) => (
                  <li key={p.name}>
                    <a href={p.href} target="_blank" rel="noopener noreferrer" className="group flex min-h-14 items-center justify-between gap-3 py-3">
                      <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold group-hover:text-[#800020] group-hover:underline">
                        {p.name}
                        <ArrowUpRight className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
                        <span className="sr-only">(opens Selar)</span>
                      </span>
                      <span className={"shrink-0 rounded-full px-3 py-1 text-xs font-semibold " + (p.price === "Free" ? "bg-[#800020] text-white" : "bg-[#F5E8EB] text-[#650019]")}>
                        {p.price}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 border-t border-[#EADDE0] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <div className="max-w-2xl">
            <p className={eyebrow}>Contact and follow</p>
            <h2 className={`${heading} mt-3 text-4xl font-semibold sm:text-5xl`}>We would love to hear from you</h2>
          </div>
          <dl className={`mt-12 ${autoGrid}`}>
            {[
              { k: "General", v: CONTACT.generalEmail, href: `mailto:${CONTACT.generalEmail}` },
              { k: "Help and support", v: CONTACT.supportEmail, href: `mailto:${CONTACT.supportEmail}` },
              { k: "WhatsApp", v: CONTACT.whatsappDisplay, href: CONTACT.whatsappLink },
              { k: "WhatsApp community", v: "Join the community", href: CONTACT.community },
              { k: "TikTok", v: "@sewsiness.africa", href: CONTACT.tiktok },
            ].map((c) => (
              <div key={c.k} className="rounded-2xl border border-[#EADDE0] bg-[#FCF8F5] p-6">
                <dt className="text-xs font-semibold uppercase tracking-wider text-[#80666D]">{c.k}</dt>
                <dd className="mt-2 break-words text-base font-semibold">
                  <a href={c.href} className="text-[#800020] hover:underline">{c.v}</a>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="rounded-3xl bg-gradient-to-br from-[#650019] to-[#3B0A18] px-7 py-16 text-center text-white sm:px-14">
          <h2 className={`${heading} mx-auto max-w-2xl text-4xl font-semibold text-white sm:text-5xl`} style={{ color: "#fff" }}>Run your sewing business with confidence</h2>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={SITE.appUrl} className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold text-[#650019] hover:bg-[#FBF1F3]">
              Create your studio account
            </a>
            <a href="#products" className="inline-flex h-12 items-center justify-center rounded-lg border border-white/30 px-6 text-sm font-semibold hover:bg-white/10">
              See the products
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
