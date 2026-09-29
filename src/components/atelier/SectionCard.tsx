"use client";

import { cn } from "@/lib/utils";

/**
 * Premium section card — elevated white surface with refined header.
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
        "bg-white border border-[#EAE6DF] rounded-lg shadow-[0_1px_2px_rgba(45,42,38,0.04),0_8px_24px_-16px_rgba(45,42,38,0.10)]",
        accent && "border-l-2 border-l-[#9E5A44]",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 min-h-12 py-3 border-b border-[#EAE6DF]/80">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            {title}
          </h3>
          {action}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}
