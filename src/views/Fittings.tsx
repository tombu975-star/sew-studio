"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  AlertCircle,
  ChevronRight,
  CalendarClock,
  CheckCircle2,
  Scissors,
  Trash2,
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
import { apiDelete, apiGet } from "@/lib/api";
import { formatDate, isOverdue } from "@/lib/format";
import type { Customer, Fitting } from "@/lib/types";
import { useNav } from "@/stores/nav";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { useRole } from "@/stores/role";
import { ConfirmDeleteDialog } from "@/components/atelier/ConfirmDeleteDialog";
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
  const [search,setSearch]=useState("");
  const [limit,setLimit]=useState(15);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const qc = useQueryClient();
  const owner = useRole((s) => s.isOwner)();
  const [toDelete, setToDelete] = useState<FittingWithOrder | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/fittings/${id}`),
    onSuccess: () => {
      toast.success("Fitting deleted");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data, isLoading, isError, refetch } = useQuery<DashboardFittingsResponse>({
    queryKey: ["dashboard"],
    queryFn: () => apiGet<DashboardFittingsResponse>("/api/dashboard"),
  });

  const fittings = data?.fittings ?? [];

  const filtered = useMemo(() => {
    return fittings.filter(f=>(statusFilter==="All"||f.status===statusFilter)&&`${f.order?.customer?.name??""} ${f.order?.garmentDesign??""}`.toLowerCase().includes(search.trim().toLowerCase()));
  }, [fittings, statusFilter, search]);
  const overdue=filtered.filter(f=>f.status==="Scheduled"&&isOverdue(f.date)).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());

  const upcoming = useMemo(
    () =>
      [...filtered]
        .filter((f) => f.status === "Scheduled" && !isOverdue(f.date))
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
        .slice(0, limit),
    [filtered,limit]
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
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pt-5 max-w-[1100px] mx-auto w-full">
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
              className="w-full sm:w-[180px] h-9 bg-white"
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

      <div className="mb-4 space-y-2"><input aria-label="Search fittings" className="w-full min-h-11 rounded-md border bg-white px-3 text-sm" placeholder="Search customer or garment" value={search} onChange={e=>{setSearch(e.target.value);setLimit(15);}}/><div className="flex items-center justify-between gap-2 text-xs text-stone-600"><span role="status">{isLoading||isError?"":`${filtered.length} matching appointments`}</span><button type="button" className="min-h-10 text-[#800020] underline" onClick={()=>{setSearch("");setLimit(15)}}>Clear search</button></div></div>
      {/* Premium stat strip */}
      <div data-keep-cols className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6">
        <PremiumMetric
          label="Upcoming"
          value={isLoading||isError?"—":<AnimatedNumber value={stats.scheduled} />}
          icon={CalendarClock}
          accent
        />
        <PremiumMetric
          label="Completed (mo.)"
          value={isLoading||isError?"—":<AnimatedNumber value={stats.completedThisMonth} />}
          icon={CheckCircle2}
        />
        <PremiumMetric
          label="Alterations"
          value={isLoading||isError?"—":<AnimatedNumber value={stats.alterationsNeeded} />}
          icon={Scissors}
        />
      </div>

      {isError ? (
        <SectionCard title="Error">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <AlertCircle className="w-4 h-4 text-[#800020]" />
            Could not load fittings. <button className="underline" onClick={()=>void refetch()}>Retry</button>
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
          {overdue.length>0&&<SectionCard title={`Overdue appointments · ${overdue.length}`} bodyClassName="p-0"><ul className="divide-y">{overdue.map(f=><FittingRow key={f.id} fitting={f} onClick={()=>go("order",{id:f.orderId})} onDelete={owner?()=>setToDelete(f):undefined}/>)}</ul></SectionCard>}
          <SectionCard
            title={`Upcoming · ${upcoming.length}`}
            bodyClassName="p-0"
          >
            {upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming fittings"
                description="Fittings are booked from an order. Open an order and add one, and it will appear here."
                action={
                  owner ? (
                    <PremiumButton variant="outline" size="sm" onClick={() => go("orders")}>
                      Choose an order
                    </PremiumButton>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-[#EEDFE3]/70">
                {upcoming.map((f) => (
                  <FittingRow
                    key={f.id}
                    fitting={f}
                    onClick={() => go("order", { id: f.orderId })}
                    onDelete={owner ? () => setToDelete(f) : undefined}
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
              <ul className="divide-y divide-[#EEDFE3]/70">
                {recent.map((f) => (
                  <FittingRow
                    key={f.id}
                    fitting={f}
                    onClick={() => go("order", { id: f.orderId })}
                    onDelete={owner ? () => setToDelete(f) : undefined}
                  />
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}

      {!isLoading&&!isError&&filtered.filter(f=>f.status!=="Scheduled").length>limit&&<PremiumButton variant="outline" onClick={()=>setLimit(n=>n+15)}>Load more fitting history</PremiumButton>}
      {owner && (
        <ConfirmDeleteDialog
          open={!!toDelete}
          onOpenChange={(v) => !v && setToDelete(null)}
          title="Delete this fitting?"
          description={
            <>
              The fitting for <strong>{toDelete?.order?.garmentDesign ?? "this order"}</strong>
              {toDelete ? ` on ${formatDate(toDelete.date)}` : ""} will be removed. The order itself
              is not affected.
            </>
          }
          confirmLabel="Delete fitting"
          loading={deleteMut.isPending}
          onConfirm={() => toDelete && !deleteMut.isPending && deleteMut.mutate(toDelete.id)}
        />
      )}
    </div>
  );
}

function DateChip({ iso }: { iso: string }) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    return (
      <div className="w-11 h-11 rounded-md bg-[#FAF0F2] border border-[#EEDFE3] flex items-center justify-center text-[11px] text-stone-400">
        —
      </div>
    );
  }
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  const day = d.getDate();
  return (
    <div className="w-11 h-11 shrink-0 rounded-md bg-[#FAF0F2] border border-[#EEDFE3] flex flex-col items-center justify-center leading-none">
      <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400 mt-1">
        {month}
      </span>
      <span className="font-sans font-semibold tabular-nums text-[#2F151B] text-base mt-0.5">
        {day}
      </span>
    </div>
  );
}

function FittingRow({
  fitting,
  onClick,
  onDelete,
}: {
  fitting: FittingWithOrder;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const overdue = fitting.status === "Scheduled" && isOverdue(fitting.date);
  const customerName = fitting.order?.customer?.name ?? "—";
  const garment = fitting.order?.garmentDesign ?? "—";

  return (
    <li className={cn("flex items-stretch", overdue && "bg-amber-50/60")}>
      <button
        onClick={onClick}
        className={cn(
          "flex-1 min-w-0 text-left flex items-center gap-3 sm:gap-4 pl-4 sm:pl-5 pr-3 py-3.5 hover:bg-[#FAF0F2] transition group",
          overdue && "bg-amber-50/60 hover:bg-amber-50"
        )}
      >
        <DateChip iso={fitting.date} />

        <div className="flex-1 min-w-0 grid gap-1">
          <p className="text-sm font-medium text-[#2F151B] truncate">
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
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              <AlertCircle className="w-3 h-3" />
              Overdue
            </span>
          )}
        </div>

        {overdue&&<span className="sm:hidden text-xs text-amber-700">Overdue</span>}
        <StatusBadge status={fitting.status} />

        <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition shrink-0" />
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete fitting"
          title="Delete fitting"
          className="shrink-0 w-11 flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}
