"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  AlertCircle,
  ChevronRight,
  CalendarClock,
  CheckCircle2,
  Scissors,
} from "lucide-react";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumMetric } from "@/components/atelier/PremiumMetric";
import { AnimatedNumber } from "@/components/atelier/AnimatedNumber";
import { EmptyState, SkeletonList } from "@/components/atelier/EmptyState";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet } from "@/lib/api";
import { formatDate, isOverdue } from "@/lib/format";
import type { Customer, Fitting } from "@/lib/types";
import { useNav } from "@/stores/nav";
import { cn } from "@/lib/utils";

interface FittingWithOrder extends Fitting {
  order: {
    id: string;
    garmentDesign: string;
    customer: Customer;
  };
}

interface DashboardFittingsResponse {
  fittings: FittingWithOrder[];
}

type StatusFilter = "All" | "Scheduled" | "Completed" | "Alterations Needed";

const STATUS_FILTERS: StatusFilter[] = [
  "All",
  "Scheduled",
  "Completed",
  "Alterations Needed",
];

function sameMonth(d: string | Date | null | undefined, ref: Date) {
  if (!d) return false;
  const x = new Date(d);
  if (isNaN(x.getTime())) return false;
  return x.getMonth() === ref.getMonth() && x.getFullYear() === ref.getFullYear();
}

function initialsOf(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Fittings() {
  const go = useNav((s) => s.go);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const { data, isLoading, isError } = useQuery<DashboardFittingsResponse>({
    queryKey: ["dashboard"],
    queryFn: () => apiGet<DashboardFittingsResponse>("/api/dashboard"),
  });

  const fittings = data?.fittings ?? [];

  const filtered = useMemo(() => {
    if (statusFilter === "All") return fittings;
    return fittings.filter((f) => f.status === statusFilter);
  }, [fittings, statusFilter]);

  const upcoming = useMemo(
    () =>
      [...filtered]
        .filter((f) => f.status === "Scheduled")
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
    [filtered]
  );

  const recent = useMemo(
    () =>
      [...filtered]
        .filter((f) => f.status !== "Scheduled")
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        .slice(0, 15),
    [filtered]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const scheduled = fittings.filter((f) => f.status === "Scheduled").length;
    const completedThisMonth = fittings.filter(
      (f) => f.status === "Completed" && sameMonth(f.date, now)
    ).length;
    const alterationsNeeded = fittings.filter(
      (f) => f.status === "Alterations Needed"
    ).length;
    return { scheduled, completedThisMonth, alterationsNeeded };
  }, [fittings]);

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto w-full">
      <PageHeader
        eyebrow="Atelier calendar"
        eyebrowIcon={CalendarClock}
        title="Fittings"
        subtitle="Scheduled and completed fitting appointments."
        actions={
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger
              className="w-[180px] h-9 bg-white"
              aria-label="Filter by status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Premium stat strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <PremiumMetric
          label="Scheduled"
          value={<AnimatedNumber value={stats.scheduled} />}
          icon={CalendarClock}
          accent
        />
        <PremiumMetric
          label="Completed (mo.)"
          value={<AnimatedNumber value={stats.completedThisMonth} />}
          icon={CheckCircle2}
        />
        <PremiumMetric
          label="Alterations"
          value={<AnimatedNumber value={stats.alterationsNeeded} />}
          icon={Scissors}
        />
      </div>

      {isError ? (
        <SectionCard title="Error">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <AlertCircle className="w-4 h-4 text-[#800020]" />
            Could not load fittings. Please try again.
          </div>
        </SectionCard>
      ) : isLoading ? (
        <div className="grid gap-5">
          <SectionCard title="Upcoming">
            <SkeletonList rows={4} />
          </SectionCard>
          <SectionCard title="Recent">
            <SkeletonList rows={4} />
          </SectionCard>
        </div>
      ) : (
        <div className="grid gap-5">
          <SectionCard
            title={`Upcoming · ${upcoming.length}`}
            bodyClassName="p-0"
          >
            {upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming fittings"
                description="When you schedule a fitting for an order, it will appear here."
              />
            ) : (
              <ul className="divide-y divide-[#E7E5E4]/70">
                {upcoming.map((f) => (
                  <FittingRow
                    key={f.id}
                    fitting={f}
                    onClick={() => go("order", { id: f.orderId })}
                  />
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title={`Recent · ${recent.length}`}
            bodyClassName="p-0"
          >
            {recent.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No recent fittings"
                description="Completed and altered fittings will show up here."
              />
            ) : (
              <ul className="divide-y divide-[#E7E5E4]/70">
                {recent.map((f) => (
                  <FittingRow
                    key={f.id}
                    fitting={f}
                    onClick={() => go("order", { id: f.orderId })}
                  />
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function DateChip({ iso }: { iso: string }) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    return (
      <div className="w-11 h-11 rounded-md bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center text-[10px] text-stone-400">
        —
      </div>
    );
  }
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  const day = d.getDate();
  return (
    <div className="w-11 h-11 shrink-0 rounded-md bg-[#FBF9F7] border border-[#E7E5E4] flex flex-col items-center justify-center leading-none">
      <span className="text-[9px] uppercase tracking-[0.14em] text-stone-400 mt-1">
        {month}
      </span>
      <span className="font-display font-semibold text-[#1C1917] text-base mt-0.5">
        {day}
      </span>
    </div>
  );
}

function FittingRow({
  fitting,
  onClick,
}: {
  fitting: FittingWithOrder;
  onClick: () => void;
}) {
  const overdue = fitting.status === "Scheduled" && isOverdue(fitting.date);
  const customerName = fitting.order?.customer?.name ?? "—";
  const garment = fitting.order?.garmentDesign ?? "—";

  return (
    <li>
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left flex items-center gap-4 px-5 py-3.5 hover:bg-[#FBF9F7] transition group",
          overdue && "bg-amber-50/60 hover:bg-amber-50"
        )}
      >
        <DateChip iso={fitting.date} />

        <div className="flex-1 min-w-0 grid gap-1">
          <p className="text-sm font-medium text-[#1C1917] truncate">
            {garment}
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full bg-[#800020]/60 shrink-0"
              )}
              aria-hidden
            />
            <p className="text-xs text-stone-500 truncate">{customerName}</p>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-1 min-w-[140px]">
          <span
            className={cn(
              "text-xs text-stone-500",
              overdue && "text-amber-700 font-medium"
            )}
          >
            {formatDate(fitting.date)}
          </span>
          {overdue && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              <AlertCircle className="w-3 h-3" />
              Overdue
            </span>
          )}
        </div>

        <StatusBadge status={fitting.status} />

        <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition shrink-0" />
      </button>
    </li>
  );
}
