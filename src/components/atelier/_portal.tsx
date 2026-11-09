"use client";

import { cn } from "@/lib/utils";

// Portal-specific lightweight presentational components (no studio dependencies).

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 animate-fade-in-up">
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-600 mb-2">
          {eyebrow}
        </p>
      )}
      <h1
        className="font-display font-semibold text-[#0F172A] leading-tight"
        style={{ fontSize: "clamp(26px, 3vw, 34px)" }}
      >
        {title}
      </h1>
      {subtitle && <p className="text-sm text-stone-500 mt-2">{subtitle}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white border border-[#E2E8F0] rounded-xl shadow-sm",
        className
      )}
    >
      {title && (
        <div className="px-5 pt-4 pb-3 border-b border-[#E2E8F0]">
          <h3 className="text-sm font-semibold tracking-tight text-slate-800">
            {title}
          </h3>
          {description && <p className="text-xs text-stone-500 mt-1">{description}</p>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
