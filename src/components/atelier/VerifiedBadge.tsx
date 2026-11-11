import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** "Verified" chip shown next to freelancers whose email has been confirmed. */
export function VerifiedBadge({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span
      title="Verified freelancer — email confirmed"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E3CFF2] bg-[#F6EFFB] px-2 py-0.5 text-[10px] font-semibold text-[#571A84]",
        className
      )}
    >
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      {compact ? <span className="sr-only">Verified</span> : "Verified"}
    </span>
  );
}
