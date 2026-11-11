"use client";

import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  sub,
  accent,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-premium border border-[#E6DFEE] rounded-lg elevate-sm p-5 flex flex-col justify-between",
        className
      )}
    >
      <span className="text-[10px] font-semibold tracking-[0.16em] text-stone-500">
        {label}
      </span>
      <div className="mt-3">
        <div
          className={cn(
            "font-display font-semibold leading-none",
            accent ? "text-[#6A1FA0]" : "text-[#1F1430]"
          )}
          style={{ fontSize: "clamp(26px, 3vw, 38px)" }}
        >
          {value}
        </div>
        {sub && <p className="mt-2 text-xs text-stone-400">{sub}</p>}
      </div>
    </div>
  );
}
