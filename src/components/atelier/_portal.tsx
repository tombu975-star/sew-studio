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
        <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 mb-2">
          {eyebrow}
        </p>
      )}
      <h1
        className="font-display font-semibold text-[#1C1917] leading-[1.05]"
        style={{ fontSize: "clamp(28px, 5vw, 38px)" }}
      >
        {title}
      </h1>
      {subtitle && <p className="text-sm text-stone-500 mt-2">{subtitle}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white border border-[#E7E5E4] rounded-lg elevate-sm",
        className
      )}
    >
      {title && (
        <div className="px-5 pt-4 pb-3 border-b border-[#E7E5E4]/70">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            {title}
          </h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
