"use client";

import { cn } from "@/lib/utils";

/**
 * Refined status badge.
 *
 * Every hue below is drawn from a single curated palette tied to the
 * atelier's own brand colors (burgundy, gold, sage) plus a small set of
 * muted, fashion-editorial supporting tones — rather than reaching for
 * whatever stock Tailwind shade happens to be nearby. Each status maps to
 * one of a handful of *semantic* families so the meaning stays legible at a
 * glance: neutral · pending · in progress · attention · positive · final.
 */
const HUE = {
  neutral: "#78716C", // stone — not yet started / low priority
  pending: "#B45309", // brand gold — awaiting action, scheduled, learning
  info: "#55677D", // dusty slate — early-stage progress
  progress: "#3D5166", // deeper slate — actively underway
  attention: "#B5502E", // clay terracotta — needs hands-on work
  negative: "#B33636", // muted rose — rejected / declined
  brand: "#800020", // house burgundy — production, priority, role
  positive: "#15803D", // sage — approved, ready, done
  final: "#2F6B63", // deep teal — delivered / completed milestone
  financial: "#7A4568", // plum — money-stage statuses
} as const;

const STATUS_HUE: Record<string, keyof typeof HUE> = {
  Enquiry: "neutral",
  Quoted: "pending",
  Consultation: "info",
  Confirmed: "progress",
  "Deposit Paid": "financial",
  "In Production": "brand",
  Fitting: "info",
  Alterations: "attention",
  "Alterations Needed": "attention",
  Ready: "positive",
  "Collected/Delivered": "final",
  Completed: "positive",
  Scheduled: "pending",
  "To Do": "neutral",
  "In Progress": "progress",
  Done: "positive",
  Low: "neutral",
  Medium: "pending",
  High: "brand",
  Suggested: "neutral",
  Approved: "positive",
  Rejected: "negative",
  Converted: "positive",
  Available: "positive",
  Busy: "pending",
  Unavailable: "neutral",
  // Training log statuses
  Learning: "pending",
  Practicing: "info",
  Proficient: "positive",
  // Role chip — trainee
  Trainee: "brand",
};

export function StatusBadge({
  status,
  className,
  dot = true,
}: {
  status: string;
  className?: string;
  dot?: boolean;
}) {
  const hex = HUE[STATUS_HUE[status] || "neutral"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium tracking-wide border rounded-md",
        className
      )}
      style={{
        backgroundColor: `${hex}14`,
        color: hex,
        borderColor: `${hex}33`,
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: hex }}
        />
      )}
      {status}
    </span>
  );
}
