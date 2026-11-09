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
        "bg-white border border-[#E2E8F0] rounded-xl shadow-sm",
        accent && "border-l-2 border-l-[#2563EB]",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 min-h-12 py-3 border-b border-[#E2E8F0]">
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
