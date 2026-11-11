/**
 * Everything the public website says, in one place. Edit the wording, links
 * and prices here; the pages in src/app (page, privacy, terms) read from it.
 */

export const SITE = {
  name: "Sewsiness",
  line: "The brand behind the business of sewing",
  /** The app. Used by the "Create your studio account" buttons. */
  appUrl: "https://sew-studio-production-n.up.railway.app/",
  /**
   * Link to the free webinar sign-up form. Leave empty until the form is
   * ready: the button then shows "Sign-up opens soon" instead of a dead link.
   */
  webinarFormUrl: "",
  lastUpdated: "11 November 2026",
} as const;

export const CONTACT = {
  generalEmail: "hello@sewsiness.com",
  supportEmail: "support@sewsiness.com",
  whatsappDisplay: "+233 54 097 6290",
  whatsappLink: "https://wa.me/233540976290",
  community: "https://chat.whatsapp.com/JpJ43ecOQ5aADb9jC4ZwQw",
  tiktok: "https://www.tiktok.com/@sewsiness.africa",
} as const;

export const MISSION =
  "To support people who sew for a living to understand the business side of their craft, with practical guidance and simple tools, so they can price properly, keep good records and pay themselves.";

export const VISION =
  "A world where every sewing business, from a new graduate's first order to a full studio, understands its business and runs it with confidence.";

export const AUDIENCE = [
  "Fashion designers",
  "Tailors and seamstresses",
  "Bridal and custom studios",
  "Ready-to-wear brands",
] as const;

export const APP_FEATURES = [
  {
    name: "True Costing",
    text: "Price every job from your real costs (materials, trims, labour and overhead). When you add an order, the price comes from your costing, and you can still change it.",
  },
  {
    name: "Clients, measurements, orders and fittings",
    text: "Keep everything in one place, with a production board to see each job's stage. Clients can follow their order with a private link.",
  },
  {
    name: "Accra Run",
    text: "Plan your fabric-buying trip, then record what you actually bought.",
  },
  {
    name: "Business Projection",
    text: "See what you can safely pay yourself from the jobs in progress.",
  },
  {
    name: "Inventory",
    text: "A forecast of your studio.",
  },
] as const;

export type Product = { name: string; price: string; href: string };

export const PRODUCT_GROUPS: { title: string; products: Product[] }[] = [
  {
    title: "New designers",
    products: [
      { name: "Basic Client Measurement Sheet", price: "Free", href: "https://selar.com/sep969m755" },
      { name: "Fashion Business Blueprint Workbook", price: "GHS 50", href: "https://selar.com/r1x83r5v28" },
      { name: "New Designer Starter Pack", price: "GHS 100", href: "https://selar.com/61666p848q" },
      { name: "Sewsiness Ebook Series", price: "GHS 150", href: "https://selar.com/4w37z5r057" },
      { name: "Business Builder Template Kit", price: "GHS 200", href: "https://selar.com/0677476666" },
    ],
  },
  {
    title: "Studio owners",
    products: [
      { name: "Madam's Studio Starter", price: "Free", href: "https://selar.com/4vq13ws36g" },
      { name: "Madam's Studio System", price: "GHS 500", href: "https://selar.com/x6ler446t6" },
      { name: "Sewsiness Pro Bundle", price: "GHS 700", href: "https://selar.com/x83b1t6680" },
    ],
  },
  {
    title: "For everyone",
    products: [
      { name: "Financial Must-Haves Checklist", price: "Free", href: "https://selar.com/xd3v04g404" },
    ],
  },
];
