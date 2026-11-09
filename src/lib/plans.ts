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

const coreFeatures = [
  "dashboard",
  "customers",
  "orders",
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
] as const satisfies readonly MenuKey[];

export const PLANS: Record<PlanKey, PlanDefinition> = {
  trial: {
    key: "trial",
    name: "Trial",
    summary: "A 14-day introduction to your digital workroom.",
    maxMembers: 3,
    features: coreFeatures,
    highlights: [
      "14 days to explore the essentials",
      "Customers, orders and production tools",
      "Up to 3 studio members",
    ],
  },
  pro: {
    key: "pro",
    name: "Pro",
    summary: "The complete toolkit for a growing atelier.",
    maxMembers: 10,
    features: proFeatures,
    highlights: [
      "Everything in Trial",
      "Quotes, client messages and Style Assist",
      "Up to 10 studio members",
    ],
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    summary: "Every workspace feature for a larger studio or academy.",
    maxMembers: null,
    features: MENU_DEFINITIONS.map(({ key }) => key),
    highlights: [
      "Every studio and learning workspace",
      "Community, curriculum and certificates",
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
    features: PLANS[plan].features,
  };
}

export function requiredPlanForFeature(feature: MenuKey): PlanKey {
  if ((PLANS.trial.features as readonly MenuKey[]).includes(feature)) return "trial";
  if ((PLANS.pro.features as readonly MenuKey[]).includes(feature)) return "pro";
  return "enterprise";
}
