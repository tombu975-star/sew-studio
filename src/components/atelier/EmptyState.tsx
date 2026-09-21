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
        "flex flex-col items-center justify-center text-center py-10 px-6",
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-stone-400" />
        </div>
      )}
      <p className="text-sm font-medium text-[#1C1917]">{title}</p>
      {description && (
        <p className="text-xs text-stone-400 mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
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
        "border border-[#E7E5E4] rounded-lg p-5 space-y-3",
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
    <div className="divide-y divide-[#E7E5E4]/60">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
