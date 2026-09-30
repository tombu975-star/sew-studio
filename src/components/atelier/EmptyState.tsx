"use client";

import { cn } from "@/lib/utils";

/**
 * Premium empty state — icon, title, description, optional action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6",
        className
      )}
    >
      {Icon && (
        <div className="relative mb-5" aria-hidden="true">
          <span className="absolute inset-0 -m-3 rounded-full border border-dashed border-[#9E5A44]/25" />
          <span className="absolute inset-0 -m-1.5 rounded-full bg-[#9E5A44]/[0.05]" />
          <div className="relative w-14 h-14 rounded-full bg-[linear-gradient(160deg,#FFFFFF_0%,#FAF2EC_100%)] border border-[#EAE6DF] shadow-[0_6px_16px_-8px_rgba(158,90,68,0.35)] flex items-center justify-center">
            <Icon className="w-[22px] h-[22px] text-[#9E5A44]" />
          </div>
        </div>
      )}
      <p className="font-display text-lg font-semibold text-[#1C1A18] leading-snug">{title}</p>
      {description && (
        <p className="text-[13px] leading-relaxed text-stone-500 mt-1.5 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Skeleton card — shimmer placeholder while data loads.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border border-[#EAE6DF] rounded-lg p-5 space-y-3",
        className
      )}
    >
      <div className="h-3 w-20 shimmer rounded" />
      <div className="h-8 w-32 shimmer rounded" />
      <div className="h-2 w-24 shimmer rounded" />
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 py-4", className)}>
      <div className="w-10 h-10 rounded-full shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-40 shimmer rounded" />
        <div className="h-2 w-24 shimmer rounded" />
      </div>
      <div className="h-5 w-16 shimmer rounded" />
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[#EAE6DF]/60">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
