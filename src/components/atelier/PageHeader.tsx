"use client";

import { cn } from "@/lib/utils";

/**
 * Premium page header — editorial atelier style.
 * Eyebrow micro-label, large display title, optional subtitle + actions.
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
    <div className={cn("flex flex-col items-start text-left md:flex-row md:items-end md:justify-between gap-4 md:gap-8 mb-5 md:mb-6 md:pb-5 md:border-b md:border-[#E2E8F0]", className)}>
      <div className="animate-fade-in-up min-w-0 w-full md:w-auto">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2563EB] mb-2 flex items-center gap-2">
            {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
            {eyebrow}
          </p>
        )}
        <h1
          className="font-display font-semibold text-[#0F172A] leading-tight"
          style={{ fontSize: "clamp(26px, 3vw, 34px)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm leading-relaxed text-stone-500 mt-2 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2 md:shrink-0 animate-fade-in w-full md:w-auto">{actions}</div>}
    </div>
  );
}
