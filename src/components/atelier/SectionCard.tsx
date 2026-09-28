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
        "bg-white border border-[#E7E5E4] rounded-lg",
        accent && "border-l-2 border-l-[#800020]",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E7E5E4]/70">
          <h3 className="text-[11px] font-semibold tracking-[0.14em] text-stone-500">
            {title}
          </h3>
          {action}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}
