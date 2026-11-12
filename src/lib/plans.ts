import { MENU_DEFINITIONS, type MenuKey } from "@/lib/menu-config";

export type PlanKey = "trial" | "pro" | "enterprise";

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  summary: string;
  maxMembers: number | null;
  features: readonly MenuKey[];
  highlights: readonly string[];
}

export const coreFeatures = [
  "dashboard",
  "customers",
  "orders",
  "payments",
  "costing",
  "board",
  "fittings",
  "tasks",
  "team",
  "settings",
] as const satisfies readonly MenuKey[];

const proFeatures = [
  ...coreFeatures,
  "quote",
  "style-assist",
  "messages",
  "projection",
] as const satisfies readonly MenuKey[];

/** Length of the free trial, counted from each studio's own sign-up date. */
export const TRIAL_MONTHS = 2;

/** The moment a trial that began at `start` runs out: two calendar months on. */
export function trialEndDate(start: Date = new Date()): Date {
  const end = new Date(start.getTime());
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + TRIAL_MONTHS);
  // Clamp 31 Dec -> end of Feb etc. rather than spilling into the next month.
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}

const allFeatures = MENU_DEFINITIONS.map(({ key }) => key) as readonly MenuKey[];

export const PLANS: Record<PlanKey, PlanDefinition> = {
  trial: {
    key: "trial",
    name: "Trial",
    summary: "Two months with every feature of Pro and Enterprise, so you see the whole app.",
    maxMembers: null,
    // The trial opens everything. Pro and Enterprise are what you choose,
    // and pay for, once the two months are up.
    features: allFeatures,
    highlights: [
      "2 months, starting the day you sign up",
      "Every Pro and Enterprise feature included",
      "Unlimited studio members while you try",
    ],
  },
  pro: {
    key: "pro",
    name: "Pro",
    summary: "The complete toolkit for a growing atelier.",
    maxMembers: 10,
    features: proFeatures,
    highlights: [
      "Customers, orders, board, fittings and tasks",
      "Payments, True Costing, quotes, Style Assist and Business Projection",
      "Up to 10 studio members",
    ],
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    summary: "Every workspace feature for a larger studio or academy.",
    maxMembers: null,
    features: allFeatures,
    highlights: [
      "Every studio and learning workspace",
      "Accra Runs, Inventory, webinars and training, community, curriculum and certificates",
      "Unlimited studio members",
    ],
  },
};

export function normalizePlan(value: string | null | undefined): PlanKey {
  if (value === "pro" || value === "enterprise") return value;
  return "trial";
}

export function getPlanEntitlements(
  value: string | null | undefined,
  trialEndsAt: string | null | undefined,
  now = new Date()
) {
  const plan = normalizePlan(value);
  const expiry = trialEndsAt ? Date.parse(trialEndsAt) : Number.NaN;
  const trialExpired =
    plan === "trial" && (!Number.isFinite(expiry) || expiry <= now.getTime());
  const daysRemaining =
    plan === "trial" && Number.isFinite(expiry)
      ? Math.max(0, Math.ceil((expiry - now.getTime()) / 86_400_000))
      : null;

  return {
    plan,
    trialExpired,
    trialEndsAt: trialEndsAt ?? null,
    daysRemaining,
    maxMembers: PLANS[plan].maxMembers,
    // `features` are the tools that still accept NEW entries. Every tool stays
    // open to view: after an unpaid trial nothing accepts new entries, and a
    // smaller plan keeps the tools outside it readable but paused.
    features: (trialExpired ? [] : PLANS[plan].features) as readonly MenuKey[],
    viewableFeatures: allFeatures,
    canWrite: (feature: MenuKey) =>
      !trialExpired && (PLANS[plan].features as readonly MenuKey[]).includes(feature),
  };
}

/** The cheapest paid plan that includes a feature. The trial includes
 *  everything, so it is never the answer here. */
export function requiredPlanForFeature(feature: MenuKey): Exclude<PlanKey, "trial"> {
  if ((PLANS.pro.features as readonly MenuKey[]).includes(feature)) return "pro";
  return "enterprise";
}
