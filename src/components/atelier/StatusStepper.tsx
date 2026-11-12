"use client";

import { cn } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/format";

export function StatusStepper({
  current,
  className,
}: {
  current: string;
  className?: string;
}) {
  const idx = ORDER_STATUSES.indexOf(current as (typeof ORDER_STATUSES)[number]);
  return (
    <div className={cn("w-full overflow-x-auto scroll-slim", className)}>
      <div className="flex items-center min-w-[640px]">
        {ORDER_STATUSES.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 shrink-0 w-14">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full border",
                    done && "bg-[#800020] border-[#800020]",
                    active &&
                      "bg-[#B45309] border-[#B45309] ring-4 ring-[#B45309]/15",
                    !done && !active && "bg-white border-stone-300"
                  )}
                />
                <span
                  className={cn(
                    "text-[11px] leading-tight text-center font-medium",
                    active
                      ? "text-[#B45309]"
                      : done
                        ? "text-[#2F151B]"
                        : "text-stone-400"
                  )}
                >
                  {s}
                </span>
              </div>
              {i < ORDER_STATUSES.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px mx-1 mb-4",
                    i < idx ? "bg-[#800020]" : "bg-stone-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
