import { z } from "zod";
import { APP_FEATURES, AUDIENCE, CONTACT, MISSION, PRODUCT_GROUPS, SITE, VISION } from "@/lib/site-config";

/**
 * Everything the public website says, as one editable document.
 *
 * - `DEFAULT_WEBSITE_CONTENT` is the built-in wording (it mirrors what the site
 *   showed before it became editable).
 * - A platform admin edits it in /admin/website; the result is stored as JSON in
 *   `public.system_website_content`.
 * - `resolveWebsiteContent` merges the stored JSON over the defaults one section
 *   at a time, so a missing or invalid section falls back to the default without
 *   taking the rest of the site down.
 *
 * Links are restricted to https/http, site paths, #anchors, mailto: and tel: so
 * an edit can never inject a `javascript:` address.
 */

const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => z.string().trim().min(1, "Required").max(max);

const LINK_RE = /^(https?:\/\/[^\s]+|\/[^\s]*|#[^\s]*|mailto:[^\s]+|tel:[^\s]+)$/i;
const link = (max = 500) =>
  z.string().trim().max(max).refine((v) => v === "" || LINK_RE.test(v), "Use a full address (https://…), a path such as /academy, or leave empty");
const requiredLink = (max = 500) =>
  z.string().trim().min(1, "Required").max(max).refine((v) => LINK_RE.test(v), "Use a full address (https://…) or a path such as /academy");
const webUrl = (max = 300) =>
  z.string().trim().max(max).refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Must start with https:// (or leave empty)");
const IMG_RE = /^(\/site\/[\w./-]+|\/api\/site-images\/[0-9a-f-]{36}|https:\/\/[^\s]+)$/i;
const image = () => z.string().trim().min(1, "Choose a picture").max(500).refine((v) => IMG_RE.test(v), "Use an uploaded picture or an https:// address");
const optionalImage = () => z.string().trim().max(500).refine((v) => v === "" || IMG_RE.test(v), "Use an uploaded picture or an https:// address");
const email = z.union([z.literal(""), z.string().trim().max(120).email("Enter a valid email address")]);

export const websiteContentSchema = z.object({
  site: z.object({
    name: required(60),
    line: required(160),
    /** Public address of the app (emails, sign-in links). Empty = the address the site is served from. */
    appUrl: webUrl(),
    /** Where "Create your studio account" / "Enter your studio" go. Empty = /studio on this site. */
    studioUrl: link(),
    /** Optional external webinar sign-up form. */
    webinarFormUrl: webUrl(),
    /** Shown on the Privacy Policy and Terms pages. */
    lastUpdated: required(60),
  }),
  seo: z.object({
    title: required(120),
    description: required(300),
  }),
  nav: z.object({
    items: z.array(z.object({ label: required(30), href: requiredLink(300) })).min(1).max(8),
    enterLabel: required(30),
    enterLabelShort: required(20),
  }),
  contact: z.object({
    generalEmail: email,
    supportEmail: email,
    whatsappDisplay: text(40),
    whatsappLink: link(),
    community: link(),
    tiktok: link(),
    tiktokHandle: text(60),
  }),
  home: z.object({
    heroHeadline: required(160),
    heroText: required(500),
    heroPrimaryCta: required(40),
    heroSecondaryCta: required(40),
    heroNote: text(200),
    heroImage: image(),
    heroImageAlt: text(200),
    promises: z.array(z.object({ title: required(40), text: required(160) })).length(3),
    whoHeading: required(160),
    whoParagraphs: z.array(required(700)).min(1).max(4),
    whoBadge: text(160),
    whoImage: image(),
    whoImageAlt: text(200),
    audience: z.array(required(60)).min(1).max(8),
    missionTitle: required(40),
    mission: required(600),
    visionTitle: required(40),
    vision: required(600),
    appHeading: required(160),
    appIntro: text(240),
    features: z.array(z.object({ name: required(80), text: required(400) })).length(5),
    tryBadge: text(40),
    tryHeading: required(60),
    tryText: required(500),
    tryCta: required(40),
    tryImage: image(),
    academyBadge: text(40),
    academyHeading: required(60),
    academyText: required(500),
    academyCta: required(40),
    productsHeading: required(160),
    productsIntro: text(200),
    productGroups: z
      .array(
        z.object({
          title: required(60),
          products: z
            .array(z.object({ name: required(80), price: required(30), href: requiredLink() }))
            .min(1)
            .max(12),
        })
      )
      .min(1)
      .max(6),
    contactHeading: required(160),
    contactText: text(300),
    contactWhatsappCta: required(40),
    contactCommunityCta: required(40),
    closingHeading: required(160),
    closingCta: required(40),
    closingImage: image(),
  }),
  footer: z.object({
    blurb: text(300),
  }),
  story: z.object({
    /** Markdown for the "Our story" page. */
    body: required(20_000),
    /** Picture at the top of the page (empty = none). */
    image: optionalImage(),
    imageAlt: text(200),
    /** Extra pictures shown under the text. */
    gallery: z.array(z.object({ src: image(), alt: text(200) })).max(8),
  }),
  legal: z.object({
    /** Markdown. Empty = use the built-in Privacy Policy text. */
    privacyMarkdown: text(40_000),
    /** Markdown. Empty = use the built-in Terms of Use text. */
    termsMarkdown: text(40_000),
  }),
});

export type WebsiteContent = z.infer<typeof websiteContentSchema>;
export type WebsiteSection = keyof WebsiteContent;

export const DEFAULT_WEBSITE_CONTENT: WebsiteContent = {
  site: {
    name: SITE.name,
    line: SITE.line,
    appUrl: SITE.appUrl,
    studioUrl: SITE.studioUrl,
    webinarFormUrl: SITE.webinarFormUrl,
    lastUpdated: SITE.lastUpdated,
  },
  seo: {
    title: "Sewsiness | The brand behind the business of sewing",
    description:
      "Business coaching, training, tools and an app for people who sew for a living. Learn to price properly, keep good records and pay yourself.",
  },
  nav: {
    items: [
      { label: "Our story", href: "/our-story" },
      { label: "The platform", href: "/#app" },
      { label: "Academy", href: "/academy" },
      { label: "Resources", href: "/#products" },
      { label: "Contact", href: "/#contact" },
    ],
    enterLabel: "Enter your studio",
    enterLabelShort: "Sign in",
  },
  contact: {
    generalEmail: CONTACT.generalEmail,
    supportEmail: CONTACT.supportEmail,
    whatsappDisplay: CONTACT.whatsappDisplay,
    whatsappLink: CONTACT.whatsappLink,
    community: CONTACT.community,
    tiktok: CONTACT.tiktok,
    tiktokHandle: "@sewsiness.africa",
  },
  home: {
    heroHeadline: "The brand behind the business of sewing",
    heroText:
      "Business coaching, training, tools and an app for people who sew for a living. The craft skill is already there; we teach the business side: pricing, structure and systems.",
    heroPrimaryCta: "Create your studio account",
    heroSecondaryCta: "See the products",
    heroNote: "Free for two months. Made for sewing businesses in Ghana and beyond.",
    heroImage: "/site/maker.webp",
    heroImageAlt: "A seamstress hand-stitching gold lace onto burgundy satin, a yellow tape measure around her neck",
    promises: [
      { title: "Price properly.", text: "Know what a job really costs before you quote it." },
      { title: "Keep good records.", text: "Clients, measurements and payments in one place." },
      { title: "Pay yourself.", text: "See what you can safely take home from the jobs in progress." },
    ],
    whoHeading: "You already have the craft. We teach the business.",
    whoParagraphs: [
      "Many people who sew have the craft and were never taught the business: how to price, how to keep records, how to pay themselves. We teach that, and we are building the tools to run it.",
      "Sewsiness brings together training, practical tools, and an app, made for sewing businesses in Ghana and beyond.",
    ],
    whoBadge: "Shaped by years of running a real fashion business.",
    whoImage: "/site/seamstress.webp",
    whoImageAlt: "A smiling seamstress sewing a colourful wax print dress at a vintage sewing machine, with a jacket on a mannequin beside her",
    audience: [...AUDIENCE],
    missionTitle: "Our mission",
    mission: MISSION,
    visionTitle: "Our vision",
    vision: VISION,
    appHeading: "Run your sewing business in one place",
    appIntro: "Clients, measurements, orders, production and fittings.",
    features: APP_FEATURES.map((f) => ({ name: f.name, text: f.text })),
    tryBadge: "Free for two months",
    tryHeading: "Try it",
    tryText:
      "Free for two months, with every feature available at that time. After that, choose the plan that fits your studio. Your records stay visible, and adding new entries requires a plan. The app is in early testing.",
    tryCta: "Create your studio account",
    tryImage: "/site/gown.webp",
    academyBadge: "Sewsiness Academy",
    academyHeading: "Free training",
    academyText:
      "Free live training sessions on the business side of sewing, starting soon. Sign up to hear when the first session runs.",
    academyCta: "Sign up for the first session",
    productsHeading: "Guides, workbooks and templates",
    productsIntro: "Each one opens on its Selar page.",
    productGroups: PRODUCT_GROUPS.map((g) => ({
      title: g.title,
      products: g.products.map((p) => ({ name: p.name, price: p.price, href: p.href })),
    })),
    contactHeading: "We would love to hear from you",
    contactText: "Questions about the app, the training or the products? Send us a message.",
    contactWhatsappCta: "Message us on WhatsApp",
    contactCommunityCta: "Join the community",
    closingHeading: "Run your sewing business with confidence",
    closingCta: "Create your studio account",
    closingImage: "/site/hero.webp",
  },
  footer: {
    blurb: "Thoughtful tools, practical business skills and a community for people who make clothes.",
  },
  legal: { privacyMarkdown: "", termsMarkdown: "" },
  story: {
    image: "/site/seamstress.webp",
    imageAlt: "A smiling seamstress sewing a colourful wax print dress at a vintage sewing machine, with a jacket on a mannequin beside her",
    gallery: [],
    body: `## Why Sewsiness

Sewsiness was born from a journey of building a fashion business over the past ten years — a journey that began with ordering and selling in Accra, grew into learning the craft of sewing, and eventually became the experience of running a fashion business.

But somewhere along that journey, we discovered something important: knowing how to sew and knowing how to run a sewing business are two very different things.

We learned the business side through experience — sometimes through mistakes, difficult decisions and lessons that came at a cost. We had to figure out how to price our work properly, manage money, keep business records, organise production, work with people and, importantly, pay ourselves.

We realised that many people in the fashion industry are talented at what they do, but are often left to figure out the business side on their own. They know how to create beautiful things, but where are the practical tools, guidance and support to help them build businesses that can actually sustain them?

That question became the beginning of Sewsiness.

Sewsiness is everything we wish we had when we started — and everything we believe people who sew for a living deserve to have.

We are building a space where sewing meets business: bringing together practical training, simple business tools, useful resources and a community that understands the realities of the industry.

Because sewing should be more than a skill that keeps you busy. It should be a business you understand, manage, and grow with confidence.

**Sewsiness. The brand behind the business of sewing.**
`,
  },
};

const SECTIONS = Object.keys(DEFAULT_WEBSITE_CONTENT) as WebsiteSection[];

/**
 * Merge stored content over the defaults, validating one section at a time.
 * Anything missing or invalid falls back to that section's defaults, so a bad
 * row can never break the public site.
 */
export function resolveWebsiteContent(stored: unknown): WebsiteContent {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return DEFAULT_WEBSITE_CONTENT;
  const s = stored as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of SECTIONS) {
    const base = DEFAULT_WEBSITE_CONTENT[key] as Record<string, unknown>;
    const part = s[key];
    if (part && typeof part === "object" && !Array.isArray(part)) {
      const candidate = { ...base, ...(part as Record<string, unknown>) };
      const parsed = (websiteContentSchema.shape[key] as z.ZodType).safeParse(candidate);
      out[key] = parsed.success ? parsed.data : base;
    } else {
      out[key] = base;
    }
  }
  return out as WebsiteContent;
}

/** Where studio-entry buttons go: the admin's address, else /studio on this site. */
export function resolveStudioUrl(site: WebsiteContent["site"]): string {
  if (site.studioUrl) return site.studioUrl;
  return site.appUrl ? `${site.appUrl.replace(/\/+$/, "")}/studio` : "/studio";
}

/** External links open in a new tab; site paths and anchors do not. */
export const isExternalHref = (href: string) => /^https?:\/\//i.test(href);
