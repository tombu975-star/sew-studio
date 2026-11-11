import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** "Verified" chip shown next to freelancers whose email has been confirmed. */
export function VerifiedBadge({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span
      title="Verified freelancer — email confirmed"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-[#F0D1D8] bg-[#FAF0F2] px-2 py-0.5 text-[10px] font-semibold text-[#650019]",
        className
      )}
    >
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      {compact ? <span className="sr-only">Verified</span> : "Verified"}
    </span>
  );
}
