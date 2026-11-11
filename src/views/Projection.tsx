"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Lock } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useRole } from "@/stores/role";
import { ACTIVE_STATUSES, formatCurrency, monthlyOverheadTotal, orderTrueCost } from "@/lib/format";
import type { Order, Settings } from "@/lib/types";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { MetricCard } from "@/components/atelier/MetricCard";
import { EmptyState } from "@/components/atelier/EmptyState";

/** What the work already booked is worth: income still to come, cost, and what is left for you. */
export default function Projection() {
  const { canSeeBusiness } = useRole();
  const canSee = canSeeBusiness();
  const { data: orders, isLoading } = useQuery<Order[]>({ queryKey: ["orders"], queryFn: () => apiGet<Order[]>("/api/orders"), enabled: canSee });
  const { data: settings } = useQuery<Settings>({ queryKey: ["settings"], queryFn: () => apiGet<Settings>("/api/settings"), enabled: canSee });
  const currency = settings?.currency || "GHS";

  const p = useMemo(() => {
    const active = (orders || []).filter((o) => (ACTIVE_STATUSES as readonly string[]).includes(o.status));
    const booked = active.reduce((n, o) => n + Number(o.sellingPrice || 0), 0);
    const collected = active.reduce((n, o) => n + (o.payments || []).reduce((m, x) => m + Number(x.amount || 0), 0), 0);
    const cost = active.reduce((n, o) => n + orderTrueCost(o, settings), 0);
    const margin = booked - cost;
    const pay = Number(settings?.selfPayout) || 0;
    return { count: active.length, booked, collected, toCollect: Math.max(0, booked - collected), cost, margin, pay, left: margin - pay, overhead: monthlyOverheadTotal(settings) };
  }, [orders, settings]);

  if (!canSee) {
    return (
      <div className="p-5 md:p-8 max-w-[820px] mx-auto w-full">
        <PageHeader eyebrow="Money" eyebrowIcon={LineChart} title="Business Projection" />
        <SectionCard><EmptyState icon={Lock} title="Projection is for the studio owner" description="Business figures are only shown to the owner." /></SectionCard>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto w-full">
      <PageHeader eyebrow="Money" eyebrowIcon={LineChart} title="Business Projection" subtitle="What the orders already in progress will bring in, what they cost to make, and what that leaves after your own pay." />
      {isLoading ? <p className="text-sm text-stone-400">Loading…</p> : p.count === 0 ? (
        <SectionCard><EmptyState icon={LineChart} title="No orders in progress" description="Once you have confirmed orders, their projected income and margin appear here." /></SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <MetricCard label="BOOKED WORK" value={formatCurrency(p.booked, currency)} sub={`${p.count} order${p.count === 1 ? "" : "s"} in progress`} />
            <MetricCard label="ALREADY COLLECTED" value={formatCurrency(p.collected, currency)} />
            <MetricCard label="STILL TO COLLECT" value={formatCurrency(p.toCollect, currency)} accent />
            <MetricCard label="TRUE COST OF THIS WORK" value={formatCurrency(p.cost, currency)} />
          </div>
          <SectionCard title="What is left for you">
            <dl className="divide-y divide-[#EEDFE3] text-sm">
              <Row label="Booked work" value={formatCurrency(p.booked, currency)} />
              <Row label="Less true cost (materials, labour, other, overhead share)" value={`− ${formatCurrency(p.cost, currency)}`} />
              <Row label="Margin on booked work" value={formatCurrency(p.margin, currency)} strong />
              <Row label="Less your monthly pay" value={`− ${formatCurrency(p.pay, currency)}`} />
              <Row label="Left after your pay" value={formatCurrency(p.left, currency)} strong warn={p.left < 0} />
            </dl>
            <p className="px-4 pb-4 text-xs text-stone-500">Your monthly pay and overheads are set in Settings. Monthly overhead on file: {formatCurrency(p.overhead, currency)}.</p>
          </SectionCard>
        </>
      )}
    </div>
  );
}

function Row({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className={strong ? "font-semibold text-[#2F151B]" : "text-stone-600"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold" : ""} ${warn ? "text-red-700" : "text-[#2F151B]"}`}>{value}</dd>
    </div>
  );
}
