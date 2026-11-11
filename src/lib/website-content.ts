import { z } from "zod";

/** Icons an admin can choose from for feature cards. */
export const FEATURE_ICONS = [
  "users", "ruler", "clipboard", "calendar", "message", "sparkles", "graduation", "shield",
] as const;
export type FeatureIcon = (typeof FEATURE_ICONS)[number];

const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => z.string().trim().min(1, "Required").max(max);

export const websiteContentSchema = z.object({
  hero: z.object({
    eyebrow: text(60),
    headline: required(120),
    subheadline: required(300),
    primaryCta: required(40),
    secondaryCta: required(40),
  }),
  portals: z.object({
    heading: required(100),
    intro: text(240),
    items: z.array(z.object({
      id: z.enum(["studio", "client", "freelancer"]),
      enabled: z.boolean(),
      name: required(40),
      audience: text(80),
      blurb: required(240),
      cta: required(40),
    })).length(3),
  }),
  features: z.object({
    heading: required(100),
    items: z.array(z.object({
      icon: z.enum(FEATURE_ICONS),
      title: required(50),
      text: required(200),
    })).max(12),
  }),
  how: z.object({
    heading: required(100),
    steps: z.array(z.object({ title: required(50), text: required(200) })).max(6),
  }),
  plans: z.object({ heading: required(100), intro: text(240) }),
  faq: z.object({
    heading: required(100),
    items: z.array(z.object({ q: required(150), a: required(600) })).max(12),
  }),
  cta: z.object({ heading: required(120) }),
  footer: z.object({
    contactEmail: z.union([z.literal(""), z.string().trim().max(120).email("Enter a valid email address")]),
    tagline: text(120),
  }),
});

export type WebsiteContent = z.infer<typeof websiteContentSchema>;

export const DEFAULT_WEBSITE_CONTENT: WebsiteContent = {
  hero: {
    eyebrow: "Atelier management system",
    headline: "The smarter way to run a tailoring studio",
    subheadline:
      "Clients, measurements, orders and production in one system, with dedicated portals for the studio, its customers and the freelancers it works with.",
    primaryCta: "Get started",
    secondaryCta: "Explore the portals",
  },
  portals: {
    heading: "A dedicated space for everyone involved",
    intro: "Studios, clients and freelancers each get an experience built for the work they do.",
    items: [
      { id: "studio", enabled: true, name: "Studio", audience: "Owners, tailors and trainees", blurb: "Manage clients, measurements, orders, production, fittings, tasks and your team from one workspace.", cta: "Sign in to your studio" },
      { id: "client", enabled: true, name: "Client portal", audience: "Your customers", blurb: "Follow an order from cutting to final fitting using a private tracking link. No account required.", cta: "Track an order" },
      { id: "freelancer", enabled: true, name: "Freelancer portal", audience: "Beaders, embroiderers, cutters and more", blurb: "Create a verified profile, discover open jobs from studios and manage the work you accept.", cta: "Join as a freelancer" },
    ],
  },
  features: {
    heading: "Everything the workroom needs",
    items: [
      { icon: "users", title: "Client records", text: "Contacts, history and preferences for every client, together in one place." },
      { icon: "ruler", title: "Measurements", text: "Record and revisit body measurements with a clear visual guide." },
      { icon: "clipboard", title: "Orders and production", text: "A production board that shows where every garment stands." },
      { icon: "calendar", title: "Fittings", text: "Schedule fittings and keep alterations on track." },
      { icon: "message", title: "Client updates", text: "Keep clients informed as their order moves through each stage." },
      { icon: "sparkles", title: "Style Assist", text: "AI-supported style ideas to inspire your next design." },
      { icon: "graduation", title: "Training and certificates", text: "Curriculum, progress tracking and certificates for apprentices." },
      { icon: "shield", title: "Role-based access", text: "Owners, staff and trainees each see only what they need." },
    ],
  },
  how: {
    heading: "From first measurement to final fitting",
    steps: [
      { title: "Open your studio", text: "Create a shop account and set up your workspace." },
      { title: "Take the order", text: "Add the client, record measurements and create the order." },
      { title: "Produce together", text: "Move work across the board and bring in freelancers when needed." },
      { title: "Keep clients informed", text: "Share a tracking link so clients can follow every step." },
    ],
  },
  plans: {
    heading: "Start small and grow",
    intro: "Every studio begins with a two-month trial. Upgrade when you are ready.",
  },
  faq: {
    heading: "Common questions",
    items: [
      { q: "Do my clients need an account?", a: "No. Clients follow their order with a private tracking link that your studio shares with them." },
      { q: "Can I try Sewiness before choosing a plan?", a: "Yes. Every new studio starts with a two-month trial that includes customers, orders, production, fittings, tasks and costing." },
      { q: "Can I work with freelancers?", a: "Yes. Freelancers register through their own portal, and studios can assign them work." },
      { q: "Can I add my team and trainees?", a: "Yes. Each plan includes team members, and access is controlled by role so trainees only see what you grant." },
    ],
  },
  cta: { heading: "Give your studio a smarter way to work" },
  footer: { contactEmail: "", tagline: "" },
};

/**
 * Merge stored content over the defaults and validate it. Anything missing or
 * invalid falls back to the defaults, so a bad row can never break the site.
 */
export function resolveWebsiteContent(stored: unknown): WebsiteContent {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return DEFAULT_WEBSITE_CONTENT;
  const s = stored as Record<string, unknown>;
  const merged: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_WEBSITE_CONTENT) as (keyof WebsiteContent)[]) {
    const base = DEFAULT_WEBSITE_CONTENT[key] as Record<string, unknown>;
    const part = s[key];
    merged[key] = part && typeof part === "object" && !Array.isArray(part) ? { ...base, ...part } : base;
  }
  const parsed = websiteContentSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_WEBSITE_CONTENT;
}
