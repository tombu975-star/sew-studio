"use client";

import { cn } from "@/lib/utils";

/**
 * Metric card with a numeric value, supporting context and optional trend.
 */
export function PremiumMetric({
  label,
  value,
  sub,
  accent,
  trend,
  trendLabel,
  spark,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  spark?: number[];
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "@container relative bg-white border border-[#D8DEE7] rounded-lg p-4 sm:p-5 overflow-hidden",
        accent && "border-l-2 border-l-[#1D4ED8]",
        className
      )}
    >
      <div className="relative flex items-start justify-between">
        <span className="text-xs font-medium text-slate-600 leading-tight">
          {label}
        </span>
        {Icon && (
          <Icon className={cn("w-4 h-4", accent ? "text-[#1D4ED8]" : "text-slate-400")} />
        )}
      </div>
      <div className="relative mt-3 flex flex-wrap items-end gap-x-2 gap-y-1.5">
        <div
          className={cn(
            "font-display font-semibold leading-none tabular-nums",
            accent ? "text-[#1D4ED8]" : "text-[#17263C]"
          )}
          style={{ fontSize: "clamp(22px, 12cqw, 38px)" }}
        >
          {value}
        </div>
        {trend && trendLabel && (
          <span
            className={cn(
              "mb-1 inline-flex items-center gap-0.5 whitespace-nowrap text-[11px] font-medium px-1.5 py-0.5 rounded-sm",
              trend === "up" && "text-[#4A6B53] bg-[#4A6B53]/10",
              trend === "down" && "text-[#8E3232] bg-[#8E3232]/10",
              trend === "flat" && "text-stone-500 bg-stone-100"
            )}
          >
            {trend === "up" && "↑"}
            {trend === "down" && "↓"}
            {trend === "flat" && "→"}
            {trendLabel}
          </span>
        )}
      </div>
      {sub && <p className="relative mt-2 text-xs leading-snug text-stone-500">{sub}</p>}
      {spark && spark.length > 1 && <Sparkline data={spark} accent={accent} />}
    </div>
  );
}

export function Sparkline({
  data,
  accent,
  className,
}: {
  data: number[];
  accent?: boolean;
  className?: string;
}) {
  if (data.length < 2) return null;
  const w = 120;
  const h = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = accent ? "#2563EB" : "#64748B";
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("relative mt-3 w-full h-7", className)}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <polyline
        points={`0,${h} ${pts} ${w},${h}`}
        fill={color}
        opacity="0.06"
      />
    </svg>
  );
}
