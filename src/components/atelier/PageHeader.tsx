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
    <div className={cn("flex flex-col items-center text-center md:flex-row md:items-end md:justify-between md:text-left gap-4 mb-6 md:mb-8", className)}>
      <div className="animate-fade-in-up min-w-0 w-full md:w-auto">
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 mb-2.5 flex items-center justify-center md:justify-start gap-2">
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {eyebrow}
          </p>
        )}
        <h1
          className="font-display font-semibold text-[#1C1917] leading-[1.05]"
          style={{ fontSize: "clamp(30px, 4.5vw, 44px)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-stone-500 mt-2.5 max-w-2xl mx-auto md:mx-0">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2 md:shrink-0 animate-fade-in w-full md:w-auto">{actions}</div>}
    </div>
  );
}
