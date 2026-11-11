import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { SiteShell, eyebrow, heading } from "@/components/site/SiteShell";
import {
  APP_FEATURES,
  AUDIENCE,
  CONTACT,
  MISSION,
  PRODUCT_GROUPS,
  SITE,
  VISION,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: { absolute: "Sewsiness | The brand behind the business of sewing" },
  description:
    "Business coaching, training, tools and an app for people who sew for a living. Learn to price properly, keep good records and pay yourself.",
};

const btnPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--site-burgundy)] px-6 text-sm font-semibold text-[var(--site-ivory)] hover:bg-[var(--site-burgundy-dark)]";
const btnOutline =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[var(--site-burgundy)] px-6 text-sm font-semibold text-[var(--site-burgundy)] hover:bg-[var(--site-ivory-2)]";
const section = "mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:py-24";

/** Decorative stitch line that rises like a growth chart. Pure SVG, no download. */
function StitchGrowth() {
  return (
    <svg viewBox="0 0 360 220" className="h-auto w-full" aria-hidden="true" fill="none">
      <path d="M12 196H348" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((i) => (
        <path key={i} d={`M${12 + i * 24} 196v${i % 5 === 0 ? 12 : 7}`} stroke="currentColor" strokeOpacity=".3" strokeWidth="2" />
      ))}
      <path
        d="M16 172c40-6 56-34 96-38s54 18 92-8 56-52 104-96"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="10 12"
      />
      <g transform="translate(288 24) rotate(-38)" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
        <path d="M0 0h58" />
        <ellipse cx="62" cy="0" rx="9" ry="4.5" />
      </g>
    </svg>
  );
}

export default function HomePage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="border-b border-[var(--site-line)]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className={eyebrow}>Business of sewing</p>
            <h1 className={`${heading} mt-4 text-[2.9rem] leading-[1.02] sm:text-6xl lg:text-7xl`}>{SITE.line}</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--site-muted)] sm:text-lg">
              Business coaching, training, tools and an app for people who sew for a living. The craft skill is
              already there; we teach the business side: pricing, structure and systems.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={SITE.appUrl} className={btnPrimary}>
                Create your studio account <ArrowRight className="size-4" />
              </a>
              <a href="#products" className={btnOutline}>See the products</a>
            </div>
            <p className="mt-4 text-sm text-[var(--site-muted)]">Free for two months. The app is in early testing.</p>
          </div>

          <div className="rounded-3xl bg-[var(--site-burgundy)] p-7 text-[var(--site-ivory)] sm:p-9">
            <StitchGrowth />
            <ul className="mt-6 grid gap-3 text-sm font-semibold sm:grid-cols-3 sm:text-[0.8rem]">
              {["Price properly", "Keep good records", "Pay yourself"].map((t) => (
                <li key={t} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2.5">
                  <Check className="size-4 shrink-0" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Who it is for */}
      <section className="border-b border-[var(--site-line)] bg-[var(--site-ivory-2)]">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:py-12">
          <p className={eyebrow}>Who it is for</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCE.map((a) => (
              <li key={a} className={`${heading} rounded-xl border border-[var(--site-line)] bg-[var(--site-ivory)] px-5 py-4 text-xl`}>
                {a}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Who we are */}
      <section id="who" className={section}>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className={eyebrow}>Who we are</p>
            <h2 className={`${heading} mt-3 text-4xl sm:text-5xl`}>Sewsiness is the brand behind the business of sewing.</h2>
            <div className="mt-6 space-y-4 leading-relaxed text-[var(--site-muted)]">
              <p>
                Many people who sew have the craft and were never taught the business: how to price, how to keep
                records, how to pay themselves. We teach that, and we are building the tools to run it.
              </p>
              <p>
                Sewsiness brings together training, practical tools, and an app, made for sewing businesses in Ghana
                and beyond. It was shaped by years of running a real fashion business.
              </p>
            </div>
          </div>
          <div className="grid gap-5">
            <div className="rounded-2xl border border-[var(--site-line)] bg-[var(--site-ivory-2)] p-7">
              <h3 className={`${heading} text-2xl text-[var(--site-burgundy)]`}>Our mission</h3>
              <p className="mt-3 leading-relaxed">{MISSION}</p>
            </div>
            <div className="rounded-2xl bg-[var(--site-burgundy)] p-7 text-[var(--site-ivory)]">
              <h3 className={`${heading} text-2xl`}>Our vision</h3>
              <p className="mt-3 leading-relaxed">{VISION}</p>
            </div>
          </div>
        </div>
      </section>

      {/* The app */}
      <section id="app" className="scroll-mt-20 border-y border-[var(--site-line)] bg-[var(--site-ivory-2)]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className={eyebrow}>The app</p>
            <h2 className={`${heading} mt-3 text-4xl sm:text-5xl`}>Run your sewing business in one place</h2>
            <p className="mt-4 text-[var(--site-muted)]">Clients, measurements, orders, production and fittings.</p>
          </div>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {APP_FEATURES.map((f, i) => (
              <li key={f.name} className="rounded-2xl border border-[var(--site-line)] bg-[var(--site-ivory)] p-6">
                <span className={`${heading} text-3xl text-[#9A5A66]`} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-base font-semibold">{f.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--site-muted)]">{f.text}</p>
              </li>
            ))}

            <li className="rounded-2xl bg-[var(--site-burgundy)] p-6 text-[var(--site-ivory)] sm:col-span-2 lg:col-span-1 lg:row-span-1">
              <h3 className={`${heading} text-3xl`}>Try it</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#F0E3E3]">
                Free for two months, with every feature available at that time. After that, choose the plan that fits
                your studio. Your records stay visible, and adding new entries requires a plan. The app is in early
                testing.
              </p>
              <a href={SITE.appUrl} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--site-ivory)] px-6 text-sm font-semibold text-[var(--site-burgundy)] hover:bg-white sm:w-auto">
                Create your studio account <ArrowRight className="size-4" />
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* Free training */}
      <section id="training" className={section}>
        <div className="grid items-center gap-8 rounded-3xl border border-[var(--site-line)] bg-[var(--site-ivory-2)] p-7 sm:p-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className={eyebrow}>Free training</p>
            <h2 className={`${heading} mt-3 text-4xl sm:text-5xl`}>Getting your first paying clients</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-[var(--site-muted)]">
              New fashion graduates: join our free webinar series on getting your first paying clients. Sponsored by
              Sewsiness.
            </p>
          </div>
          <div>
            {SITE.webinarFormUrl ? (
              <a href={SITE.webinarFormUrl} className={`${btnPrimary} w-full`}>Sign up</a>
            ) : (
              <>
                <span aria-disabled="true" className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center rounded-lg border border-dashed border-[var(--site-burgundy)] px-6 text-sm font-semibold text-[var(--site-burgundy)]">
                  Sign-up opens soon
                </span>
                <p className="mt-3 text-sm text-[var(--site-muted)]">
                  Want to hear first? Join the{" "}
                  <a href={CONTACT.community} className="font-semibold text-[var(--site-burgundy)] underline">WhatsApp community</a>.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="scroll-mt-20 border-t border-[var(--site-line)] bg-[var(--site-ivory-2)]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className={eyebrow}>Products</p>
            <h2 className={`${heading} mt-3 text-4xl sm:text-5xl`}>Guides, workbooks and templates</h2>
            <p className="mt-4 text-[var(--site-muted)]">Each product opens on its Selar page.</p>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            {PRODUCT_GROUPS.map((g) => (
              <div key={g.title}>
                <h3 className={`${heading} border-b-2 border-[var(--site-burgundy)] pb-2 text-2xl`}>{g.title}</h3>
                <ul className="divide-y divide-[var(--site-line)]">
                  {g.products.map((p) => (
                    <li key={p.name}>
                      <a
                        href={p.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex min-h-14 items-center justify-between gap-4 py-3"
                      >
                        <span className="flex min-w-0 items-center gap-1.5 text-[0.95rem] font-semibold group-hover:text-[var(--site-burgundy)] group-hover:underline">
                          {p.name}
                          <ArrowUpRight className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
                          <span className="sr-only">(opens Selar)</span>
                        </span>
                        <span
                          className={
                            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold " +
                            (p.price === "Free"
                              ? "bg-[var(--site-burgundy)] text-[var(--site-ivory)]"
                              : "border border-[var(--site-burgundy)] text-[var(--site-burgundy)]")
                          }
                        >
                          {p.price}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className={section}>
        <div className="max-w-2xl">
          <p className={eyebrow}>Contact and follow</p>
          <h2 className={`${heading} mt-3 text-4xl sm:text-5xl`}>We would love to hear from you</h2>
        </div>
        <dl className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "General", v: CONTACT.generalEmail, href: `mailto:${CONTACT.generalEmail}` },
            { k: "Help and support", v: CONTACT.supportEmail, href: `mailto:${CONTACT.supportEmail}` },
            { k: "WhatsApp", v: CONTACT.whatsappDisplay, href: CONTACT.whatsappLink },
            { k: "TikTok", v: "@sewsiness.africa", href: CONTACT.tiktok },
          ].map((c) => (
            <div key={c.k} className="rounded-2xl border border-[var(--site-line)] p-6">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--site-muted)]">{c.k}</dt>
              <dd className="mt-2 break-words text-base font-semibold">
                <a href={c.href} className="text-[var(--site-burgundy)] underline decoration-[var(--site-line)] underline-offset-4 hover:decoration-current">{c.v}</a>
              </dd>
            </div>
          ))}
        </dl>
        <a href={CONTACT.community} className={`${btnPrimary} mt-6 w-full sm:w-auto`}>
          Join the WhatsApp community <ArrowRight className="size-4" />
        </a>
      </section>
    </SiteShell>
  );
}
