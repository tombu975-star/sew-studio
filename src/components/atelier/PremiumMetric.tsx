"use client";

import { cn } from "@/lib/utils";

type Tone = "violet" | "green" | "amber" | "blue";

const TONES: Record<Tone, { card: string; tile: string; value: string }> = {
  violet: { card: "bg-[#FAEFF1] border-[#F1D9DE]", tile: "bg-white/70 text-[#800020]", value: "text-[#3B0010]" },
  green: { card: "bg-[#EEF7F1] border-[#D5E9DC]", tile: "bg-white/70 text-[#2E7D4F]", value: "text-[#17331F]" },
  amber: { card: "bg-[#FDF5E6] border-[#F1E0BA]", tile: "bg-white/70 text-[#9A6A0E]", value: "text-[#3D2A06]" },
  blue: { card: "bg-[#EEF3FD] border-[#D6E2F8]", tile: "bg-white/70 text-[#2F5FC4]", value: "text-[#14264F]" },
};

/**
 * Metric card: icon tile, label, a large tabular value, optional trend and context.
 * Pass `tone` for the tinted dashboard style; without it the card is plain white
 * (`accent` gives the plain card a violet icon and value).
 */
export function PremiumMetric({
  label,
  value,
  sub,
  accent,
  tone,
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
  tone?: Tone;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  spark?: number[];
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  const t = tone ? TONES[tone] : null;
  return (
    <div
      className={cn(
        "@container relative overflow-hidden rounded-xl border p-4 shadow-xs sm:p-5",
        t ? t.card : "border-[#E6D4D8] bg-white",
        className
      )}
    >
      <div className="relative flex items-center gap-3">
        {Icon && (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-lg",
              t ? t.tile : accent ? "bg-[#FAEFF1] text-[#800020]" : "bg-[#F7EFF1] text-[#776267]"
            )}
          >
            <Icon className="size-[18px]" />
          </span>
        )}
        <span className="text-[13px] font-medium leading-tight text-slate-600">{label}</span>
      </div>
      <div className="relative mt-3 flex flex-wrap items-end gap-x-2 gap-y-1.5">
        <div
          className={cn(
            "font-display font-semibold leading-none tabular-nums",
            t ? t.value : accent ? "text-[#650019]" : "text-[#3B0010]"
          )}
          style={{ fontSize: "clamp(22px, 12cqw, 36px)" }}
        >
          {value}
        </div>
        {trend && trendLabel && (
          <span
            className={cn(
              "mb-0.5 inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
              trend === "up" && "bg-[#4A6B53]/12 text-[#2F5A3A]",
              trend === "down" && "bg-[#8E3232]/10 text-[#8E3232]",
              trend === "flat" && "bg-stone-100 text-stone-500"
            )}
          >
            {trend === "up" && "↑"}
            {trend === "down" && "↓"}
            {trend === "flat" && "→"} {trendLabel}
          </span>
        )}
      </div>
      {sub && <p className="relative mt-2 text-xs leading-snug text-stone-500">{sub}</p>}
      {spark && spark.length > 1 && <Sparkline data={spark} accent={accent || !!tone} />}
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
  const color = accent ? "#800020" : "#776267";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("relative mt-3 h-7 w-full", className)}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.07" />
    </svg>
  );
}
