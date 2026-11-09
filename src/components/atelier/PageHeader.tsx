"use client";

import { cn } from "@/lib/utils";

/**
 * Standard page header with a clear title, context, and optional actions.
 */
export function PageHeader({
  eyebrow,
  eyebrowIcon: Icon,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: string;
  eyebrowIcon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start text-left md:flex-row md:items-end md:justify-between gap-4 md:gap-8 mb-5 md:mb-6 md:pb-5 md:border-b md:border-[#D8DEE7]", className)}>
      <div className="min-w-0 w-full md:w-auto">
        {eyebrow && (
          <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2">
            {Icon ? <Icon className="w-3.5 h-3.5 text-slate-500" /> : null}
            {eyebrow}
          </p>
        )}
        <h1
          className="font-semibold text-[#17263C] leading-tight tracking-tight"
          style={{ fontSize: "clamp(24px, 2.5vw, 30px)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm leading-relaxed text-slate-600 mt-1.5 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 md:shrink-0 w-full md:w-auto">{actions}</div>}
    </div>
  );
}
