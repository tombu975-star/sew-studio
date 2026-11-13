"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertCircle, Banknote, CalendarClock,
  CircleDollarSign, Lock, Wallet,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { useRole } from "@/stores/role";
import {
  ACTIVE_STATUSES, formatCurrency, monthlyOverheadTotal, orderTrueCost,
} from "@/lib/format";
import type { Order, Settings } from "@/lib/types";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { MetricCard } from "@/components/atelier/MetricCard";
import { EmptyState } from "@/components/atelier/EmptyState";

function monthKey(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export default function Projection() {
  const { canSeeBusiness } = useRole();
  const canSee = canSeeBusiness();
  const { data: orders, isLoading, isError } = useQuery<Order[]>({
    queryKey: ["orders"], queryFn: () => apiGet<Order[]>("/api/orders"), enabled: canSee,
  });
  const { data: settings } = useQuery<Settings>({
    queryKey: ["settings"], queryFn: () => apiGet<Settings>("/api/settings"), enabled: canSee,
  });
  const currency = settings?.currency || "GHS";

  const projection = useMemo(() => {
    const active = (orders || []).filter((o) => (ACTIVE_STATUSES as readonly string[]).includes(o.status));
    const booked = active.reduce((sum, o) => sum + (Number(o.sellingPrice) || 0), 0);
    const collected = active.reduce((sum, o) => sum + (o.payments || []).reduce((n, p) => n + (Number(p.amount) || 0), 0), 0);
    const fabric = active.reduce((n, o) => n + (Number(o.fabricCost) || 0), 0);
    const labour = active.reduce((n, o) => n + (Number(o.labourCost) || 0), 0);
    const other = active.reduce((n, o) => n + (Number(o.otherCost) || 0), 0);
    const cost = active.reduce((n, o) => n + orderTrueCost(o, settings), 0);
    const overhead = monthlyOverheadTotal(settings);
    const grossMargin = booked - cost;
    const ownerPay = Number(settings?.selfPayout) || 0;
    const leftAfterPay = grossMargin - ownerPay;
    const grouped = new Map<string, number>();
    active.forEach((o) => {
      const key = monthKey(o.deliveryDate) || monthKey(o.orderDate);
      if (key) grouped.set(key, (grouped.get(key) || 0) + (Number(o.sellingPrice) || 0));
    });
    const chart = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => ({ month: monthLabel(key), revenue: value }));
    const dueSoon = active.filter((o) => o.deliveryDate && new Date(o.deliveryDate).getTime() <= Date.now() + 30 * 86400000).length;
    return { active, booked, collected, toCollect: Math.max(0, booked - collected), fabric, labour, other, cost, overhead, grossMargin, ownerPay, leftAfterPay, chart, dueSoon };
  }, [orders, settings]);

  if (!canSee) return (
    <div className="mx-auto w-full max-w-[820px] p-5 md:p-8">
      <PageHeader eyebrow="Money" eyebrowIcon={CircleDollarSign} title="Business Projection" />
      <SectionCard><EmptyState icon={Lock} title="Projection is for the studio owner" description="Business figures are only shown to the owner." /></SectionCard>
    </div>
  );

  const fmt = (n: number) => formatCurrency(n, currency);
  const marginPercent = projection.booked > 0 ? Math.round((projection.grossMargin / projection.booked) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] p-5 md:p-8">
      <PageHeader eyebrow="Financial overview" eyebrowIcon={CircleDollarSign} title="Business Projection" subtitle="A forward-looking view of booked work, money still due, production costs and what the studio may retain." />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((n) => <div key={n} className="h-28 animate-pulse rounded-2xl border border-[#EEDFE3] bg-white" />)}</div>
      ) : isError ? (
        <SectionCard><EmptyState icon={AlertCircle} title="Projection could not load" description="Please check your connection and try again." /></SectionCard>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="BOOKED REVENUE" value={fmt(projection.booked)} sub={`${projection.active.length} active orders`} />
            <MetricCard label="PAYMENTS RECEIVED" value={fmt(projection.collected)} sub="Against active orders" />
            <MetricCard label="OUTSTANDING BALANCE" value={fmt(projection.toCollect)} sub="Still to collect" accent />
            <MetricCard label="PROJECTED TRUE COST" value={fmt(projection.cost)} sub="Direct costs + overhead share" />
          </div>

          <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.85fr)]">
            <SectionCard title="Expected revenue by delivery month" description="Booked order value grouped by its expected delivery month.">
              {projection.chart.length ? (
                <div className="h-[270px] w-full pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projection.chart} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                      <defs><linearGradient id="projectionRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#800020" stopOpacity={0.22}/><stop offset="95%" stopColor="#800020" stopOpacity={0.015}/></linearGradient></defs>
                      <CartesianGrid stroke="#F0E5E7" strokeDasharray="3 3" vertical={false}/>
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#8A7479", fontSize: 11 }}/>
                      <YAxis tickLine={false} axisLine={false} width={76} tick={{ fill: "#8A7479", fontSize: 10 }} tickFormatter={(v) => new Intl.NumberFormat("en", { notation: "compact" }).format(v)}/>
                      <Tooltip formatter={(value) => fmt(Number(value) || 0)} contentStyle={{ borderRadius: 12, borderColor: "#EEDFE3", fontSize: 12 }}/>
                      <Area type="monotone" dataKey="revenue" name="Booked revenue" stroke="#800020" strokeWidth={2.5} fill="url(#projectionRevenue)" activeDot={{ r: 5 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-center text-sm text-stone-500">Add delivery dates to active orders to build your revenue forecast.</div>
              )}
            </SectionCard>

            <SectionCard title="Your projected position" description="An estimate based on the work currently in progress.">
              <div className="rounded-xl border border-[#EEDFE3] bg-[#FCF8F9] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-stone-500">Margin after production costs</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[#35121D]">{fmt(projection.grossMargin)}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EADDE0]"><div className="h-full rounded-full bg-[#800020]" style={{ width: `${Math.max(0, Math.min(100, marginPercent))}%` }}/></div>
                <p className="mt-2 text-xs text-stone-500">{marginPercent}% of booked revenue after estimated costs</p>
              </div>
              <dl className="mt-3 divide-y divide-[#F0E5E7]">
                <Row label="Projected margin" value={fmt(projection.grossMargin)} />
                <Row label="Planned owner pay" value={`− ${fmt(projection.ownerPay)}`} />
                <Row label="Estimated balance after pay" value={fmt(projection.leftAfterPay)} strong warn={projection.leftAfterPay < 0}/>
              </dl>
              {projection.leftAfterPay < 0 && <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800"><AlertCircle className="mt-0.5 size-4 shrink-0"/>Your planned pay is higher than the projected margin. Review pricing, costs or the planned payout before withdrawing.</p>}
            </SectionCard>
          </div>

          <div className="mb-5 grid gap-4 lg:grid-cols-2">
            <SectionCard title="Production cost breakdown" description="Estimated cost of all active orders, using your true-cost settings.">
              <dl className="divide-y divide-[#F0E5E7]">
                <Row label="Fabric and materials" value={fmt(projection.fabric)}/>
                <Row label="Labour" value={fmt(projection.labour)}/>
                <Row label="Other job costs" value={fmt(projection.other)}/>
                <Row label="Allocated overhead" value={fmt(Math.max(0, projection.cost - projection.fabric - projection.labour - projection.other))}/>
                <Row label="Total projected cost" value={fmt(projection.cost)} strong/>
              </dl>
              <p className="mt-3 text-xs leading-5 text-stone-500">Monthly overhead configured in Settings: {fmt(projection.overhead)}. Allocated overhead is included in each order’s true cost.</p>
            </SectionCard>
            <SectionCard title="Cash collection outlook" description="Track what has come in and what is still expected from active work.">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#F7F1F2] p-4"><Wallet className="size-4 text-[#800020]"/><p className="mt-3 text-xs text-stone-500">Received</p><p className="mt-1 text-lg font-semibold text-[#35121D]">{fmt(projection.collected)}</p></div>
                <div className="rounded-xl bg-[#F7F1F2] p-4"><CalendarClock className="size-4 text-[#800020]"/><p className="mt-3 text-xs text-stone-500">Still expected</p><p className="mt-1 text-lg font-semibold text-[#35121D]">{fmt(projection.toCollect)}</p></div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs"><span className="text-stone-500">Collection progress</span><span className="font-semibold text-[#35121D]">{projection.booked > 0 ? Math.min(100, Math.round(projection.collected / projection.booked * 100)) : 0}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EADDE0]"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${projection.booked > 0 ? Math.min(100, projection.collected / projection.booked * 100) : 0}%` }}/></div>
              <p className="mt-3 text-xs text-stone-500">{projection.dueSoon} active {projection.dueSoon === 1 ? "order is" : "orders are"} due within the next 30 days.</p>
            </SectionCard>
          </div>

          <SectionCard title="Active order forecast" description="A quick view of the orders contributing to this projection.">
            {projection.active.length ? (
              <div className="overflow-x-auto" role="region" aria-label="Active orders in the projection" tabIndex={0}>
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead><tr className="border-b border-[#EEDFE3] text-[11px] uppercase tracking-[.14em] text-stone-500"><th className="px-3 py-3 font-semibold">Order / client</th><th className="px-3 py-3 font-semibold">Stage</th><th className="px-3 py-3 font-semibold">Due date</th><th className="px-3 py-3 text-right font-semibold">Order value</th><th className="px-3 py-3 text-right font-semibold">Balance</th></tr></thead>
                  <tbody>{projection.active.slice().sort((a,b) => (a.deliveryDate || "9999").localeCompare(b.deliveryDate || "9999")).map((o) => {
                    const paid = (o.payments || []).reduce((n,p) => n + (Number(p.amount) || 0), 0);
                    return <tr key={o.id} className="border-b border-[#F4ECEE] last:border-0"><td className="px-3 py-3"><p className="font-medium text-[#35121D]">{o.garmentDesign || "Custom order"}</p><p className="mt-0.5 text-xs text-stone-500">{o.customer?.name || "Client not specified"}</p></td><td className="px-3 py-3"><span className="inline-flex rounded-full bg-[#F7EEF0] px-2.5 py-1 text-xs font-medium text-[#6B1D32]">{o.status}</span></td><td className="px-3 py-3 text-xs text-stone-600">{o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not set"}</td><td className="px-3 py-3 text-right font-medium tabular-nums">{fmt(Number(o.sellingPrice) || 0)}</td><td className="px-3 py-3 text-right tabular-nums text-stone-600">{fmt(Math.max(0, (Number(o.sellingPrice) || 0) - paid))}</td></tr>;
                  })}</tbody>
                </table>
              </div>
            ) : <EmptyState icon={Banknote} title="No active orders yet" description="Once orders are confirmed, their projected revenue, costs and balances will appear here."/>}
          </SectionCard>
          <p className="mt-4 text-xs leading-5 text-stone-500">This is a planning estimate, not a cash balance or guaranteed profit. It includes active orders only; actual results depend on final costs, delivery, collections and any new work.</p>
        </>
      )}
    </div>
  );
}

function Row({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className={strong ? "font-semibold text-[#2F151B]" : "text-stone-600"}>{label}</dt><dd className={`shrink-0 tabular-nums ${strong ? "font-semibold" : ""} ${warn ? "text-red-700" : "text-[#2F151B]"}`}>{value}</dd></div>;
}
