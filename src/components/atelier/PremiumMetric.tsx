"use client";

import { cn } from "@/lib/utils";

/**
 * Premium metric card — large display value, label, optional sparkline + trend delta.
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
        "relative bg-white border border-[#E7E5E4] rounded-lg p-5 overflow-hidden group",
        accent && "border-[#800020]/20",
        className
      )}
    >
      <div className="relative flex items-start justify-between">
        <span className="text-[10px] font-semibold tracking-[0.16em] text-stone-500">
          {label}
        </span>
        {Icon && (
          <Icon className={cn("w-4 h-4", accent ? "text-[#800020]" : "text-stone-300")} />
        )}
      </div>
      <div className="relative mt-3 flex items-end gap-2">
        <div
          className={cn(
            "font-display font-semibold leading-none tabular-nums",
            accent ? "text-[#800020]" : "text-[#1C1917]"
          )}
          style={{ fontSize: "clamp(26px, 3vw, 38px)" }}
        >
          {value}
        </div>
        {trend && trendLabel && (
          <span
            className={cn(
              "mb-1 inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded",
              trend === "up" && "text-[#15803D] bg-[#15803D]/8",
              trend === "down" && "text-[#b91c1c] bg-[#b91c1c]/8",
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
      {sub && <p className="relative mt-2 text-xs text-stone-400">{sub}</p>}
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
  const color = accent ? "#800020" : "#78716c";
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
