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
    <div className={cn("surface-premium border border-[#EAE6DF] rounded-lg elevate-sm", className)}>
      {title && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#EAE6DF]/70">
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
