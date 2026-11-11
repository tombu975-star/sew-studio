"use client";

import { cn } from "@/lib/utils";

export function AtelierCard({
  title,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("surface-premium border border-[#E6DFEE] rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.10)]", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 min-h-12 py-3 border-b border-[#E6DFEE]/80">
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
