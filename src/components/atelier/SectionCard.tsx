"use client";

import { cn } from "@/lib/utils";

/**
 * Standard section card with a clear title and optional action.
 * Supports optional action slot, padding override, and an accent variant.
 */
export function SectionCard({
  title,
  action,
  className,
  bodyClassName,
  children,
  accent,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#E6D4D8] bg-white shadow-xs",
        accent && "border-l-2 border-l-[#6C1C2F]",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 min-h-12 py-3 border-b border-[#F0E4E7]">
          <h3 className="text-sm font-semibold tracking-tight text-slate-800">
            {title}
          </h3>
          {action}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}
