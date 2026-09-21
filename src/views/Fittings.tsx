"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, AlertCircle, ChevronRight } from "lucide-react";
import { AtelierCard } from "@/components/atelier/AtelierCard";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { formatDate, isOverdue } from "@/lib/format";
import type { Customer, Fitting } from "@/lib/types";
import { useNav } from "@/stores/nav";

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

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-full border border-[#E7E5E4] items-center justify-center bg-white">
            <CalendarDays className="w-4 h-4 text-[#800020]" />
          </div>
          <div>
            <h1
              className="font-display font-semibold text-[#1C1917] leading-tight"
              style={{ fontSize: "clamp(1.75rem, 1.2rem + 1.6vw, 2.25rem)" }}
            >
              Fittings
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Scheduled and completed fitting appointments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Status
          </span>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-[180px] h-9 bg-white" aria-label="Filter by status">
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
        </div>
      </header>

      {isError ? (
        <div className="rounded-sm border border-[#E7E5E4] bg-white p-6 text-sm text-stone-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#800020]" />
          Could not load fittings. Please try again.
        </div>
      ) : isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-40 rounded-sm bg-white" />
          <Skeleton className="h-40 rounded-sm bg-white" />
        </div>
      ) : (
        <div className="grid gap-5">
          <section>
            <AtelierCard
              title={`Upcoming · ${upcoming.length}`}
              bodyClassName="p-0"
            >
              {upcoming.length === 0 ? (
                <EmptyRow message="No upcoming fittings scheduled." />
              ) : (
                <ul className="divide-y divide-[#E7E5E4]">
                  {upcoming.map((f) => (
                    <FittingRow key={f.id} fitting={f} onClick={() => go("order", { id: f.orderId })} />
                  ))}
                </ul>
              )}
            </AtelierCard>
          </section>

          <section>
            <AtelierCard
              title={`Recent · ${recent.length}`}
              bodyClassName="p-0"
            >
              {recent.length === 0 ? (
                <EmptyRow message="No recent fittings yet." />
              ) : (
                <ul className="divide-y divide-[#E7E5E4]">
                  {recent.map((f) => (
                    <FittingRow key={f.id} fitting={f} onClick={() => go("order", { id: f.orderId })} />
                  ))}
                </ul>
              )}
            </AtelierCard>
          </section>
        </div>
      )}
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm text-stone-400">{message}</p>
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
        <div className="flex-1 min-w-0 grid gap-1">
          <p className="text-sm font-medium text-[#1C1917] truncate">
            {garment}
          </p>
          <p className="text-xs text-stone-500 truncate">{customerName}</p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-500 min-w-[120px] justify-end">
          {overdue && (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span className={cn(overdue && "text-amber-700 font-medium")}>
            {formatDate(fitting.date)}
          </span>
        </div>

        <StatusBadge status={fitting.status} />

        <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition shrink-0" />
      </button>
    </li>
  );
}
