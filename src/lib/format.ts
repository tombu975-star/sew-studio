// Atelier domain formatting helpers
import type { Settings } from "@/lib/types";

/** The studio's total monthly overhead: the itemised breakdown total when
 *  at least one line item is listed, otherwise the flat "overhead amount"
 *  fallback. This is the numerator of the standard overhead recovery rate. */
export function monthlyOverheadTotal(settings: Settings | null | undefined) {
  if (!settings) return 0;
  const items = settings.overheadItems || [];
  const itemsTotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  return itemsTotal > 0 ? itemsTotal : Number(settings.overheadAmount) || 0;
}

/** @deprecated kept as an alias of monthlyOverheadTotal for anything still
 *  importing the old name. Prefer monthlyOverheadTotal or, for a specific
 *  order's overhead, orderOverheadMargin. */
export const overheadPerOrder = monthlyOverheadTotal;

/**
 * Standard overhead recovery rate — the predetermined-overhead-rate method
 * used in job costing:
 *
 *   Overhead Recovery Rate (%) = Total Monthly Overhead ÷ Monthly Direct-Cost Base
 *
 * The "direct-cost base" is the studio's estimated average monthly direct
 * costs (materials/fabric etc.), excluding labour — set in Settings as
 * overheadRecoveryBasis. Returns 0 (not a fraction) when the basis hasn't
 * been configured yet, so callers can detect "not set up" and fall back.
 */
export function overheadRecoveryRatePercent(settings: Settings | null | undefined) {
  if (!settings) return 0;
  const basis = Number(settings.overheadRecoveryBasis) || 0;
  if (basis <= 0) return 0;
  return (monthlyOverheadTotal(settings) / basis) * 100;
}

/**
 * A single order's overhead margin — the amount that order must carry to
 * cover its proportional share of overhead, computed as a percentage of
 * the order's direct cost (fabric/materials), excluding labour:
 *
 *   Order Overhead Margin = Order Fabric Cost × Overhead Recovery Rate
 *
 * Falls back to the studio's flat per-order overhead amount when the
 * recovery-rate basis hasn't been configured yet (rate is 0), so nothing
 * regresses for studios that haven't set this up.
 */
export function orderOverheadMargin(
  order: { fabricCost?: number | null },
  settings: Settings | null | undefined
) {
  const rate = overheadRecoveryRatePercent(settings);
  if (rate <= 0) return monthlyOverheadTotal(settings);
  const fabric = Number(order?.fabricCost) || 0;
  return fabric * (rate / 100);
}

/** An order's full True Cost: materials + labour + other job costs + this
 *  order's share of studio overhead (see orderOverheadMargin — a percentage
 *  of fabric cost under the standard method, or the flat fallback if the
 *  rate isn't configured). */
export function orderTrueCost(
  order: { fabricCost?: number | null; labourCost?: number | null; otherCost?: number | null },
  settings: Settings | null | undefined
) {
  const fabric = Number(order?.fabricCost) || 0;
  const labour = Number(order?.labourCost) || 0;
  const other = Number(order?.otherCost) || 0;
  return fabric + labour + other + orderOverheadMargin(order, settings);
}

/** Studio default mark-up (% on top of True Cost) used to pre-fill pricing. */
export const FALLBACK_MARKUP_PERCENT = 30;
export function defaultMarkupPercent(settings: Settings | null | undefined) {
  const v = Number(settings?.defaultMarkupPercent);
  return Number.isFinite(v) && v >= 0 ? v : FALLBACK_MARKUP_PERCENT;
}

/** Price that covers True Cost plus the mark-up, rounded to a whole unit so
 *  it reads like a price a person would quote. */
export function suggestedPriceFor(trueCost: number, markupPercent: number) {
  const cost = Math.max(0, Number(trueCost) || 0);
  const markup = Math.max(0, Number(markupPercent) || 0);
  return Math.round(cost * (1 + markup / 100));
}

/** Mark-up % that a given price achieves over True Cost (null if no cost). */
export function markupAchieved(price: number, trueCost: number) {
  const cost = Number(trueCost) || 0;
  if (cost <= 0) return null;
  return ((Number(price) || 0) / cost - 1) * 100;
}

// The studio's currency (ISO 4217). Set once from the signed-in user's shop
// (see stores/auth.ts) or the client-portal payload, so every formatCurrency()
// call in the app — including ones that don't pass a currency — renders in
// the studio's own currency instead of a hardcoded one.
let studioCurrency = "GHS";
export function setStudioCurrency(code: string | null | undefined) {
  if (code && /^[A-Za-z]{3}$/.test(code)) studioCurrency = code.toUpperCase();
}
export function getStudioCurrency() {
  return studioCurrency;
}

export function formatCurrency(value: number | null | undefined, currency?: string) {
  const n = Number(value) || 0;
  const code = currency || studioCurrency;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    // Unrecognised ISO 4217 code — never let a bad setting crash a render.
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GHS",
      maximumFractionDigits: 0,
    }).format(n);
  }
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-GB").format(Number(value) || 0);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function shortDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function isWithinDays(dateStr: string | Date | null | undefined, days: number) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

export function isOverdue(dateStr: string | Date | null | undefined) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export const ORDER_STATUSES = [
  "Enquiry",
  "Quoted",
  "Consultation",
  "Confirmed",
  "Deposit Paid",
  "In Production",
  "Fitting",
  "Alterations",
  "Ready",
  "Collected/Delivered",
  "Completed",
] as const;

export const ACTIVE_STATUSES = ORDER_STATUSES.filter(
  (s) => s !== "Completed" && s !== "Enquiry" && s !== "Consultation"
);

export const ENTRY_SOURCES = [
  "Instagram",
  "Facebook",
  "TikTok",
  "WhatsApp",
  "Referral",
  "Walk-in",
  "Repeat Client",
  "Saw Our Work",
  "Other",
];

export const CUSTOMER_TYPES = [
  "New Customer",
  "Returning Customer",
  "VIP",
  "Bridal",
  "Regular Wear",
  "Occasion Wear",
  "Corporate",
  "Wholesale",
  "Other",
];

export const PREFERRED_STYLES = [
  "Classic",
  "Modern",
  "Minimal",
  "Dramatic",
  "Elegant",
  "Traditional",
  "Trendy",
  "Modest",
  "Custom",
];

export const PRIORITY_LEVELS = ["Low", "Medium", "High"] as const;
