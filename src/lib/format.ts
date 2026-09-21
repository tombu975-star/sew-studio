// Atelier domain formatting helpers

export function formatCurrency(value: number | null | undefined) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(n);
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
