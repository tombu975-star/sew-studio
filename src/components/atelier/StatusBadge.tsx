"use client";

import { cn } from "@/lib/utils";

/**
 * Refined status badge.
 *
 * Every hue below is drawn from a single curated palette tied to the
 * atelier's own brand colors (terracotta, amber, sage, crimson) plus a
 * small set of muted, fashion-editorial supporting tones — rather than
 * reaching for whatever stock Tailwind shade happens to be nearby. Each
 * status maps to one of a handful of *semantic* families so the meaning
 * stays legible at a glance: neutral · pending · info · progress · active ·
 * alteration flag · positive · final · financial.
 */
const HUE = {
  neutral: "#7A746E", // tailor's slate — not yet started / low priority
  pending: "#B45309", // warm amber — awaiting action, scheduled, learning
  info: "#55677D", // dusty slate — early-stage, informational
  progress: "#3D5166", // deeper slate — confirmed, actively underway
  active: "#9E5A44", // primary terracotta — "In Fitting / Drafting" per the
  // Haute Atelier spec: production, fitting, priority, role.
  alteration: "#8E3232", // vintage crimson — the spec's "Alteration Flag /
  // Urgent": needs hands-on rework, rejected, declined.
  positive: "#4A6B53", // sage olive — the spec's "Ready for Review / Completed".
  final: "#2F6B63", // deep teal — delivered / completed milestone.
  financial: "#7A4568", // plum — money-stage statuses.
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
