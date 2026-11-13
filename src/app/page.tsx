import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BookOpen, ClipboardList, Gem, Layers, LayoutTemplate, ListChecks,
  MessageCircle, Package, PenTool, Ruler, Scissors, Shirt, Store, Users,
} from "lucide-react";
import { SiteShell, heading } from "@/components/site/SiteShell";
import { TrainingSessions } from "@/components/site/TrainingSessions";
import { ContinueLearning } from "@/components/academy/ContinueLearning";
import { listPublishedCourses } from "@/lib/academy/data";
import {
  CostBars, ExampleNote, RulerRule, ShoppingTicks, Sparkline, StagePills, StockGauges, SwingTag,
} from "@/components/site/Visuals";
import { isPastSession, loadPublicTrainings } from "@/lib/public-trainings";
import { APP_FEATURES, AUDIENCE, CONTACT, MISSION, PRODUCT_GROUPS, SITE, VISION } from "@/lib/site-config";

export const metadata: Metadata = {
  title: { absolute: "Sewsiness | The brand behind the business of sewing" },
  description:
    "Business coaching, training, tools and an app for people who sew for a living. Learn to price properly, keep good records and pay yourself.",
};

export const dynamic = "force-dynamic";

const wrap = "mx-auto max-w-7xl px-5 sm:px-8";
const h2 = `${heading} text-[2.4rem] font-semibold leading-[1.02] text-[#35121d] sm:text-5xl lg:text-[3.4rem]`;
const pill = "inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 text-[15px] font-bold transition hover:-translate-y-0.5";

const AUDIENCE_ICONS = [PenTool, Scissors, Gem, Shirt];
const PRODUCT_ICONS: Record<string, typeof Ruler> = {
  "Basic Client Measurement Sheet": Ruler,
  "Fashion Business Blueprint Workbook": ClipboardList,
  "New Designer Starter Pack": Package,
  "Sewsiness Ebook Series": BookOpen,
  "Business Builder Template Kit": LayoutTemplate,
  "Madam's Studio Starter": Store,
  "Madam's Studio System": Layers,
  "Sewsiness Pro Bundle": Gem,
  "Financial Must-Haves Checklist": ListChecks,
};
const PROMISES = [
  ["Price properly.", "Know what a job really costs before you quote it."],
  ["Keep good records.", "Clients, measurements and payments in one place."],
  ["Pay yourself.", "See what you can safely take home from the jobs in progress."],
] as const;

export default async function HomePage() {
  const upcoming = (await loadPublicTrainings()).filter((s) => !isPastSession(s)).slice(0, 3);
  const courses = await listPublishedCourses(3);
  const [costing, clients, accra, projection, inventory] = APP_FEATURES;

  return (
    <SiteShell>
      {/* ───────── Hero ───────── */}
      <section className="relative isolate overflow-hidden bg-[#2b0813] text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(70%_80%_at_85%_30%,rgba(128,0,32,.55),transparent_70%)]" />
        <div className={`${wrap} grid items-center gap-x-10 gap-y-20 pb-32 pt-14 sm:pt-20 lg:grid-cols-[1.15fr_.85fr] lg:pb-36 lg:pt-20`}>
          <div>
            <h1 className={`${heading} text-[3.1rem] font-semibold leading-[.96] text-white sm:text-7xl lg:text-[5.6rem]`}>
              The brand behind the business of sewing
            </h1>
            <p className="mt-7 max-w-lg text-base leading-8 text-white/75 sm:text-lg">
              Business coaching, training, tools and an app for people who sew for a living. The craft skill is
              already there; we teach the business side: pricing, structure and systems.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={SITE.studioUrl} className={`${pill} bg-[#F4E8D5] text-[#4b1424] shadow-xl hover:bg-white`}>
                Create your studio account <ArrowRight className="size-4" />
              </a>
              <a href="#products" className={`${pill} border border-white/30 text-white hover:bg-white/10`}>
                See the products
              </a>
            </div>
            <p className="mt-6 text-sm text-white/60">Free for two months. Made for sewing businesses in Ghana and beyond.</p>
          </div>

          {/* arch portrait with the swing tag hanging off its corner */}
          <div className="relative mx-auto w-full max-w-[24rem] lg:ml-auto lg:mr-4">
            <div aria-hidden="true" className="absolute -right-4 -top-4 h-full w-full rounded-t-full border border-[#E6C58D]/50" />
            <img
              src="/site/maker.webp" width={640} height={753} fetchPriority="high"
              alt="A seamstress hand-stitching gold lace onto burgundy satin, a yellow tape measure around her neck"
              className="relative aspect-[4/5] w-full rounded-t-full object-cover object-[50%_20%] shadow-[0_40px_80px_rgba(0,0,0,.4)]"
            />
            <SwingTag className="relative -mt-8 w-[17rem] max-w-full sm:absolute sm:-bottom-16 sm:-left-16 sm:mt-0 sm:w-[16rem] lg:-left-28" />
          </div>
        </div>
        <RulerRule className="absolute inset-x-0 bottom-0 text-[#E6C58D]/45" />
      </section>

      {/* ───────── Three promises ───────── */}
      <section className="bg-[#F5ECE8]">
        <div className={`${wrap} grid divide-y divide-dashed divide-[#C79A45]/60 py-6 md:grid-cols-3 md:divide-x md:divide-y-0 md:py-14`}>
          {PROMISES.map(([title, text]) => (
            <div key={title} className="py-6 md:px-8 md:py-0 md:first:pl-0 md:last:pr-0">
              <p className={`${heading} text-4xl font-semibold text-[#35121d] sm:text-[2.6rem]`}>{title}</p>
              <p className="mt-2 max-w-xs text-sm leading-7 text-[#6F565D]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Who we are ───────── */}
      <section id="who" className="scroll-mt-24 py-24 sm:py-32">
        <div className={`${wrap} grid gap-16 lg:grid-cols-[.8fr_1.2fr] lg:items-center`}>
          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <img
              src="/site/thread.webp" width={700} height={421} loading="lazy"
              alt="Spools of burgundy and gold thread beside a pin cushion and stacks of wax print and lace"
              className="aspect-[4/5] w-full rounded-[2rem] object-cover object-[28%_50%]"
            />
            <p className="absolute -bottom-5 -right-3 max-w-[13rem] rounded-2xl bg-[#800020] px-5 py-4 text-sm leading-6 text-white shadow-xl sm:-right-8">
              Shaped by years of running a real fashion business.
            </p>
          </div>

          <div>
            <h2 className={h2}>You already have the craft. We teach the business.</h2>
            <div className="mt-7 max-w-xl space-y-4 text-base leading-8 text-[#6F565D]">
              <p>
                Many people who sew have the craft and were never taught the business: how to price, how to keep
                records, how to pay themselves. We teach that, and we are building the tools to run it.
              </p>
              <p>
                Sewsiness brings together training, practical tools, and an app, made for sewing businesses in Ghana
                and beyond.
              </p>
            </div>
            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5">
              {AUDIENCE.map((a, i) => {
                const Icon = AUDIENCE_ICONS[i] ?? Users;
                return (
                  <li key={a} className="flex items-center gap-3 text-sm font-semibold text-[#35121d]">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#F5ECE8] text-[#800020]"><Icon className="size-[18px]" /></span>
                    {a}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className={`${wrap} mt-20 grid gap-5 md:grid-cols-[1.15fr_.85fr]`}>
          <article className="relative overflow-hidden rounded-[2rem] bg-[#800020] p-8 text-white sm:p-12">
            <RulerRule className="absolute inset-x-8 top-0 text-white/30 sm:inset-x-12" />
            <h3 className={`${heading} text-3xl font-semibold text-white sm:text-4xl`}>Our mission</h3>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/90 sm:text-xl sm:leading-9">{MISSION}</p>
          </article>
          <article className="rounded-[2rem] border-2 border-dashed border-[#C79A45]/70 p-8 sm:p-10">
            <h3 className={`${heading} text-3xl font-semibold text-[#35121d] sm:text-4xl`}>Our vision</h3>
            <p className="mt-5 text-base leading-8 text-[#6F565D]">{VISION}</p>
          </article>
        </div>
      </section>

      {/* ───────── The app ───────── */}
      <section id="app" className="scroll-mt-24 bg-white py-24 sm:py-32">
        <div className={wrap}>
          <div className="grid items-end gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <h2 className={h2}>Run your sewing business in one place</h2>
            <p className="max-w-md text-base leading-8 text-[#6F565D]">Clients, measurements, orders, production and fittings.</p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-6">
            <article className="flex flex-col rounded-[1.75rem] bg-[#F5ECE8] p-7 sm:p-9 lg:col-span-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className={`${heading} text-3xl font-semibold text-[#35121d] sm:text-4xl`}>{costing.name}</h3>
                <ExampleNote>Example job</ExampleNote>
              </div>
              <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#5b3e46]">{costing.text}</p>
              <CostBars />
              <p className="mt-auto pt-8 text-sm text-[#5b3e46]">
                <span className="[font-variant-numeric:lining-nums]">GHS 900</span> of costs + <span className="[font-variant-numeric:lining-nums]">GHS 200</span> profit ={" "}
                <strong className={`${heading} text-2xl text-[#800020] [font-variant-numeric:lining-nums]`}>GHS 1,100</strong> to quote
              </p>
            </article>

            <article className="rounded-[1.75rem] border border-[#EADDE0] p-7 sm:p-8 lg:col-span-2">
              <h3 className="text-lg font-bold leading-snug text-[#35121d]">{clients.name}</h3>
              <p className="mt-2 text-sm leading-7 text-[#6F565D]">{clients.text}</p>
              <StagePills />
            </article>

            <article className="rounded-[1.75rem] border border-[#EADDE0] p-7 sm:p-8 lg:col-span-2">
              <h3 className="text-lg font-bold text-[#35121d]">{accra.name}</h3>
              <p className="mt-2 text-sm leading-7 text-[#6F565D]">{accra.text}</p>
              <ShoppingTicks />
            </article>

            <article className="rounded-[1.75rem] border border-[#EADDE0] p-7 sm:p-8 lg:col-span-2">
              <h3 className="text-lg font-bold text-[#35121d]">{projection.name}</h3>
              <p className="mt-2 text-sm leading-7 text-[#6F565D]">{projection.text}</p>
              <Sparkline />
            </article>

            <article className="rounded-[1.75rem] border border-[#EADDE0] p-7 sm:p-8 lg:col-span-2">
              <h3 className="text-lg font-bold text-[#35121d]">{inventory.name}</h3>
              <p className="mt-2 text-sm leading-7 text-[#6F565D]">{inventory.text}</p>
              <StockGauges />
            </article>
          </div>
        </div>
      </section>

      {/* ───────── Try it + free training ───────── */}
      <section id="training" className="scroll-mt-24 py-24 sm:py-32">
        <div className={`${wrap} grid gap-5 lg:grid-cols-2`}>
          <article className="relative overflow-hidden rounded-[2rem] bg-[#2b0813] p-8 text-white sm:p-12">
            <img src="/site/gown.webp" width={300} height={800} loading="lazy" alt="" aria-hidden="true" className="absolute inset-y-0 right-0 hidden h-full w-40 object-cover opacity-70 [mask-image:linear-gradient(90deg,transparent,#000_55%)] sm:block" />
            <span className="inline-flex rounded-full bg-[#E8C995] px-3.5 py-1.5 text-xs font-bold text-[#421523]">Free for two months</span>
            <h3 className={`${heading} mt-6 text-4xl font-semibold text-white sm:text-5xl`}>Try it</h3>
            <p className="mt-4 max-w-sm text-[15px] leading-7 text-white/75">
              Free for two months, with every feature available at that time. After that, choose the plan that fits
              your studio. Your records stay visible, and adding new entries requires a plan. The app is in early testing.
            </p>
            <a href={SITE.studioUrl} className={`${pill} mt-8 bg-white text-[#650019] hover:bg-[#F8E9EC]`}>
              Create your studio account <ArrowRight className="size-4" />
            </a>
          </article>

          <article className="relative overflow-hidden rounded-[2rem] border border-[#EADDE0] bg-white p-8 sm:p-12">
            <RulerRule className="absolute inset-x-8 top-0 text-[#C79A45]/60 sm:inset-x-12" />
            <span className="inline-flex rounded-full bg-[#F7EDF0] px-3.5 py-1.5 text-xs font-bold text-[#800020]">Sewsiness Academy</span>
            <h3 className={`${heading} mt-6 text-4xl font-semibold text-[#35121d] sm:text-5xl`}>Free training</h3>
            <p className="mt-4 max-w-sm text-[15px] leading-7 text-[#6F565D]">
              Video courses, live classes with a class chat, and certificates anyone can check. All of it runs here on Sewsiness, and you sign in with just your email.
            </p>
            {courses.length > 0 && (
              <ul className="mt-6 max-w-sm divide-y divide-dashed divide-[#C79A45]/60 border-y border-dashed border-[#C79A45]/60">
                {courses.map((c) => <li key={c.id}><Link href={`/academy/${c.slug}`} className="flex items-center justify-between gap-3 py-3 text-sm font-semibold text-[#35121d] hover:text-[#800020]">{c.title}<span className="shrink-0 text-xs font-normal text-[#6F565D]">{c.lessonCount} lessons</span></Link></li>)}
              </ul>
            )}
            <div className="mt-6"><ContinueLearning /></div>
            <Link href="/academy" className={`${pill} mt-8 border border-[#D9BDC4] text-[#800020] hover:bg-[#FBF3F5]`}>
              {upcoming.length > 0 ? "See courses and live classes" : "Open the Academy"} <ArrowUpRight className="size-4" />
            </Link>
          </article>
        </div>

        {upcoming.length > 0 && (
          <div className={`${wrap} mt-14`}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <h3 className={`${heading} text-3xl font-semibold text-[#35121d]`}>Coming up</h3>
              <Link href="/academy#live" className="text-sm font-bold text-[#800020] underline">All live classes</Link>
            </div>
            <TrainingSessions sessions={upcoming} />
          </div>
        )}
      </section>

      {/* ───────── Products ───────── */}
      <section id="products" className="scroll-mt-24 bg-[#F5ECE8] py-24 sm:py-32">
        <div className={wrap}>
          <h2 className={`${h2} max-w-2xl`}>Guides, workbooks and templates</h2>
          <p className="mt-4 text-base text-[#6F565D]">Each one opens on its Selar page.</p>

          <div className="mt-12 divide-y divide-dashed divide-[#C79A45]/60 border-t border-dashed border-[#C79A45]/60">
            {PRODUCT_GROUPS.map((g) => (
              <div key={g.title} className="grid gap-6 py-10 lg:grid-cols-[13rem_1fr] lg:gap-10">
                <h3 className={`${heading} text-3xl font-semibold text-[#35121d]`}>{g.title}</h3>
                <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),1fr))]">
                  {g.products.map((p) => {
                    const Icon = PRODUCT_ICONS[p.name] ?? Package;
                    const free = p.price === "Free";
                    return (
                      <li key={p.name}>
                        <a
                          href={p.href} target="_blank" rel="noopener noreferrer"
                          className={`group flex h-full min-h-[8.5rem] flex-col justify-between rounded-2xl p-5 sm:min-h-[10.5rem] transition hover:-translate-y-1 ${free ? "bg-[#800020] text-white" : "border border-[#E3D3D3] bg-white text-[#35121d] hover:border-[#C98C96]"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className={`grid size-10 place-items-center rounded-full ${free ? "bg-white/15" : "bg-[#F5ECE8] text-[#800020]"}`}><Icon className="size-[18px]" /></span>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${free ? "bg-[#E8C995] text-[#421523]" : "bg-[#F7EDF0] text-[#800020]"}`}>{p.price}</span>
                          </div>
                          <span className={`${heading} mt-6 flex items-end justify-between gap-3 text-[1.45rem] font-semibold leading-[1.1]`}>
                            {p.name}
                            <ArrowUpRight className="size-4 shrink-0 opacity-60 transition group-hover:opacity-100" aria-hidden="true" />
                            <span className="sr-only">(opens Selar)</span>
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Contact ───────── */}
      <section id="contact" className="scroll-mt-24 py-24 sm:py-32">
        <div className={`${wrap} grid gap-14 lg:grid-cols-[.9fr_1.1fr]`}>
          <div>
            <h2 className={h2}>We would love to hear from you</h2>
            <p className="mt-5 max-w-md text-base leading-8 text-[#6F565D]">Questions about the app, the training or the products? Send us a message.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={CONTACT.whatsappLink} className={`${pill} bg-[#800020] text-white hover:bg-[#650019]`}>
                <MessageCircle className="size-5" /> Message us on WhatsApp
              </a>
              <a href={CONTACT.community} className={`${pill} border border-[#D9BDC4] text-[#800020] hover:bg-[#FBF3F5]`}>
                Join the community
              </a>
            </div>
          </div>

          <dl className="divide-y divide-[#E3D3D3] border-y border-[#E3D3D3]">
            {[
              ["General", CONTACT.generalEmail, `mailto:${CONTACT.generalEmail}`],
              ["Help and support", CONTACT.supportEmail, `mailto:${CONTACT.supportEmail}`],
              ["WhatsApp", CONTACT.whatsappDisplay, CONTACT.whatsappLink],
              ["TikTok", "@sewsiness.africa", CONTACT.tiktok],
            ].map(([k, v, href]) => (
              <div key={k} className="group flex items-center justify-between gap-4 py-5">
                <dt className="text-sm text-[#6F565D]">{k}</dt>
                <dd className="min-w-0 text-right">
                  <a href={href} className="inline-flex items-center gap-2 break-all text-base font-bold text-[#35121d] hover:text-[#800020] sm:text-lg">
                    {v} <ArrowUpRight className="size-4 shrink-0 opacity-50" aria-hidden="true" />
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───────── Closing ───────── */}
      <section className={`${wrap} pb-24 sm:pb-32`}>
        <div className="relative overflow-hidden rounded-[2rem] bg-[#800020] px-7 py-16 text-white sm:px-14 sm:py-20">
          <img src="/site/hero.webp" width={1440} height={810} loading="lazy" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-luminosity" />
          <RulerRule className="absolute inset-x-8 bottom-0 text-white/35" />
          <div className="relative max-w-2xl">
            <h2 className={`${heading} text-4xl font-semibold leading-[1.02] text-white sm:text-6xl`}>Run your sewing business with confidence</h2>
            <a href={SITE.studioUrl} className={`${pill} mt-9 bg-[#F4E8D5] text-[#4b1424] hover:bg-white`}>
              Create your studio account <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
