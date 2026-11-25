"use client";

import { cn } from "@/lib/utils";

/**
 * The AppShell top bar is the single source of page title, studio context,
 * and account identity. Individual views provide contextual guidance and actions.
 * Retain the existing props so all views continue to compile unchanged.
 */
export function PageHeader({
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
  if (!actions && !subtitle) return null;
  return (
    <div className={cn("flex w-full flex-wrap items-center justify-between gap-3 mb-4 md:mb-5", className)}>
      {subtitle && <p className="min-w-0 flex-1 basis-56 text-sm leading-relaxed text-stone-600">{subtitle}</p>}
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>button]:flex-1 max-sm:[&>a]:flex-1">{actions}</div>}
    </div>
  );
}
