"use client";

import { cn } from "@/lib/utils";

/**
 * Refined status badge.
 *
 * Status colors use a consistent semantic palette with clear contrast. Each
 * status maps to one of a handful of *semantic* families so the meaning
 * stays legible at a glance: neutral · pending · info · progress · active ·
 * alteration flag · positive · final · financial.
 */
const HUE = {
  neutral: "#776267", // tailor's slate — not yet started / low priority
  pending: "#B45309", // warm amber — awaiting action, scheduled, learning
  info: "#2F5FC4", // blue — early-stage, informational
  progress: "#800020", // brand burgundy — confirmed, actively underway
  active: "#2E7D4F", // green — active / available
  alteration: "#D4472A", // vermilion (kept clearly apart from the burgundy brand colour) — the spec's "Alteration Flag /
  // Urgent": needs hands-on rework, rejected, declined.
  positive: "#4A6B53", // sage olive — the spec's "Ready for Review / Completed".
  final: "#2F6B63", // deep teal — delivered / completed milestone.
  financial: "#8A6414", // gold — money-stage statuses.
} as const;

const STATUS_HUE: Record<string, keyof typeof HUE> = {
  Enquiry: "neutral",
  Quoted: "pending",
  Consultation: "info",
  Confirmed: "progress",
  "Deposit Paid": "financial",
  "In Production": "active",
  Fitting: "active",
  Alterations: "alteration",
  "Alterations Needed": "alteration",
  Ready: "positive",
  "Collected/Delivered": "final",
  Completed: "positive",
  Scheduled: "pending",
  "To Do": "neutral",
  "In Progress": "progress",
  Done: "positive",
  Low: "neutral",
  Medium: "pending",
  High: "active",
  Suggested: "neutral",
  Approved: "positive",
  Rejected: "alteration",
  Converted: "positive",
  Available: "positive",
  Busy: "pending",
  Unavailable: "neutral",
  // Training log statuses
  Learning: "pending",
  Practicing: "info",
  Proficient: "positive",
  Commissioned: "neutral",
  Delivered: "final",
  Paid: "financial",
  Pending: "pending",
  Accepted: "positive",
  Declined: "alteration",
  Open: "active",
  Filled: "positive",
  Closed: "neutral",
  // Role chip — trainee
  Trainee: "active",
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
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium tracking-wide border rounded-full",
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
