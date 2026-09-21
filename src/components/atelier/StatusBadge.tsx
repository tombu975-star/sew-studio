"use client";

import { cn } from "@/lib/utils";

/**
 * Refined status badge — better contrast, subtle dot indicator.
 */
const STATUS_STYLES: Record<string, string> = {
  Enquiry: "bg-stone-100 text-stone-700 border-stone-200",
  Quoted: "bg-amber-100 text-amber-800 border-amber-200",
  Consultation: "bg-sky-100 text-sky-800 border-sky-200",
  Confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  "Deposit Paid": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "In Production": "bg-violet-100 text-violet-800 border-violet-200",
  Fitting: "bg-cyan-100 text-cyan-800 border-cyan-200",
  Alterations: "bg-orange-100 text-orange-800 border-orange-200",
  Ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Collected/Delivered": "bg-teal-100 text-teal-800 border-teal-200",
  Completed: "bg-[#15803D]/12 text-[#15803D] border-[#15803d]/25",
  Scheduled: "bg-amber-100 text-amber-800 border-amber-200",
  "Alterations Needed": "bg-orange-100 text-orange-800 border-orange-200",
  "To Do": "bg-stone-100 text-stone-700 border-stone-200",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  Done: "bg-[#15803D]/12 text-[#15803D] border-[#15803d]/25",
  Low: "bg-stone-100 text-stone-700 border-stone-200",
  Medium: "bg-amber-100 text-amber-800 border-amber-200",
  High: "bg-[#800020]/10 text-[#800020] border-[#800020]/25",
  Suggested: "bg-stone-100 text-stone-700 border-stone-200",
  Approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Rejected: "bg-orange-100 text-orange-800 border-orange-200",
  Converted: "bg-[#15803D]/12 text-[#15803D] border-[#15803d]/25",
};

const DOT_COLOR: Record<string, string> = {
  Enquiry: "bg-stone-500",
  Quoted: "bg-amber-600",
  Consultation: "bg-sky-600",
  Confirmed: "bg-blue-600",
  "Deposit Paid": "bg-indigo-600",
  "In Production": "bg-violet-600",
  Fitting: "bg-cyan-600",
  Alterations: "bg-orange-600",
  Ready: "bg-emerald-600",
  "Collected/Delivered": "bg-teal-600",
  Completed: "bg-[#15803D]",
  Scheduled: "bg-amber-600",
  "To Do": "bg-stone-500",
  "In Progress": "bg-blue-600",
  Done: "bg-[#15803D]",
  Low: "bg-stone-500",
  Medium: "bg-amber-600",
  High: "bg-[#800020]",
  Suggested: "bg-stone-500",
  Approved: "bg-emerald-600",
  Rejected: "bg-orange-600",
  Converted: "bg-[#15803D]",
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
  const style =
    STATUS_STYLES[status] || "bg-stone-100 text-stone-700 border-stone-200";
  const dotColor = DOT_COLOR[status] || "bg-stone-500";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide border rounded-md",
        style,
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />}
      {status}
    </span>
  );
}
