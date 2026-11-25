"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, Plus, Settings as SettingsIcon, Lock, Percent, Coins, TrendingUp } from "lucide-react";

import { apiGet } from "@/lib/api";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";
import {
  formatCurrency,
  formatDate,
  orderOverheadMargin,
  orderTrueCost,
  overheadRecoveryRatePercent,
  defaultMarkupPercent,
  markupAchieved,
  suggestedPriceFor,
} from "@/lib/format";
import type { Order, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { EmptyState } from "@/components/atelier/EmptyState";
import { StatusBadge } from "@/components/atelier/StatusBadge";

/**
 * True Costing — how each order's price relates to what the job really costs.
 * Pricing itself happens when an order is booked (New Order); this page shows
 * the studio's costing set-up and how every order compares with the price
 * True Costing suggested.
 */
export default function TrueCosting() {
  const { go } = useNav();
  const { canSeeBusiness, isOwner } = useRole();
  const canSee = canSeeBusiness();

  const { data: orders, isLoading, isError, refetch: retryOrders } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/api/orders"),
    enabled: canSee,
  });
  const { data: settings, isLoading: settingsLoading, isError: settingsError, refetch: retrySettings } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => apiGet<Settings>("/api/settings"),
    enabled: canSee,
  });
  const currency = settings?.currency || "GHS";

  const {data:accuracy, isError: accuracyError, isLoading: accuracyLoading, refetch: retryAccuracy} = useQuery<{total:number;accurate:number;accuracyPercent:number|null;trend:{month:string;total:number;accurate:number;accuracyPercent:number;profit:number}[];rows:{orderId:string;garment:string;date:string;estimatedCost:number;actualCost:number;estimatedProfit:number;actualProfit:number}[]}>({
    queryKey:["costing-accuracy"],queryFn:()=>apiGet("/api/costing/accuracy"),enabled:canSee && isOwner(),
  });

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    return (orders || [])
      .filter((o) => (Number(o.fabricCost) || 0) + (Number(o.labourCost) || 0) + (Number(o.otherCost) || 0) > 0)
      .map((o) => {
        const trueCost = orderTrueCost(o, settings);
        const markup = o.markupPercent ?? defaultMarkupPercent(settings);
        const suggested =
          o.suggestedPrice != null && Number(o.suggestedPrice) > 0
            ? Number(o.suggestedPrice)
            : suggestedPriceFor(trueCost, markup);
        const price = Number(o.sellingPrice) || 0;
        return {
          order: o,
          trueCost,
          overhead: orderOverheadMargin(o, settings),
          suggested,
          price,
          diff: price - suggested,
          achieved: markupAchieved(price, trueCost),
          belowCost: price < trueCost,
          profit: price - trueCost,
          margin: price > 0 ? ((price - trueCost) / price) * 100 : null,
        };
      })
      .sort((a, b) => new Date(b.order.orderDate).getTime() - new Date(a.order.orderDate).getTime());
  }, [orders, settings]);

  if (!canSee) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pt-5 max-w-[820px] mx-auto w-full">
        <PageHeader eyebrow="Pricing" eyebrowIcon={Calculator} title="True Costing" />
        <SectionCard>
          <EmptyState
            icon={Lock}
            title="True Costing is for the studio owner"
            description="Costs and prices are only shown to the owner."
          />
        </SectionCard>
      </div>
    );
  }

  if (isLoading || settingsLoading) return <div className="p-6 text-sm text-stone-500" role="status">Loading costing data…</div>;
  if (isError || settingsError) return <div className="p-6" role="alert">Could not load costing data. <button className="underline text-[#800020]" onClick={()=>{void retryOrders();void retrySettings();}}>Try again</button></div>;
  const shown = rows.filter(r => (filter === "all" || (filter === "loss" ? r.profit < 0 : filter === "profit" ? r.profit > 0 : r.profit === 0)) && `${r.order.garmentDesign} ${r.order.customer?.name ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const rate = overheadRecoveryRatePercent(settings);
  const markup = defaultMarkupPercent(settings);
  const belowCostCount = rows.filter((r) => r.belowCost).length;
  const totalCost = rows.reduce((s, r) => s + r.trueCost, 0);
  const totalPrice = rows.reduce((s, r) => s + r.price, 0);
  const profitableCount = rows.filter(r=>r.profit>0).length;
  const lossCount = rows.filter(r=>r.profit<0).length;
  const netEstimatedProfit = rows.reduce((sum,r)=>sum+r.profit,0);
  const blended = totalCost > 0 ? (totalPrice / totalCost - 1) * 100 : null;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pt-5 max-w-[1180px] mx-auto w-full">
      <PageHeader
        eyebrow="Pricing"
        eyebrowIcon={Calculator}
        title="True Costing"
        subtitle="Compare each order’s current selling price with recorded costs, allocated overhead and estimated profit or loss."
        actions={
          <div className="flex flex-wrap gap-2">
            <PremiumButton variant="outline" size="md" onClick={() => go("settings")}>
              <SettingsIcon className="w-4 h-4" /> Mark-up &amp; overheads
            </PremiumButton>
            <PremiumButton variant="primary" size="md" onClick={() => go("new-order")}>
              <Plus className="w-4 h-4" /> Price a new order
            </PremiumButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Tile icon={Percent} label="Default mark-up" value={`${markup}%`} note="On top of true cost. Change it in Settings." />
        <Tile
          icon={Coins}
          label="Overhead recovery rate"
          value={rate > 0 ? `${rate.toFixed(1)}%` : "Not set"}
          note={rate > 0 ? "Share of each order's materials cost." : "A flat per-order overhead is used until you set it."}
        />
        <Tile
          icon={TrendingUp}
          label="Mark-up achieved"
          value={blended == null ? "—" : `${blended.toFixed(0)}%`}
          note={
            belowCostCount > 0
              ? `${belowCostCount} ${belowCostCount === 1 ? "order is" : "orders are"} priced below true cost.`
              : "Across orders with costs entered."
          }
          warn={belowCostCount > 0}
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile icon={Coins} label="Estimated order profit" value={formatCurrency(netEstimatedProfit,currency)} note="Selling prices less entered production costs and allocated overhead." warn={netEstimatedProfit<0}/>
        <Tile icon={TrendingUp} label="Orders in profit" value={String(profitableCount)} note="Based on currently recorded costs and prices."/>
        <Tile icon={Calculator} label="Orders at a loss" value={String(lossCount)} note="Review pricing and any missing costs." warn={lossCount>0}/>
      </div>
      {isOwner() && <SectionCard title="Completed orders · actual profit and quote accuracy">
        <div className="p-5 space-y-4">
          {accuracyError && <p role="alert" className="text-sm text-red-700">Could not load accuracy data. <button className="underline" onClick={()=>void retryAccuracy()}>Retry</button></p>}
          {accuracyLoading && <p role="status" className="text-sm text-stone-500">Loading accuracy…</p>}
          <div className="flex flex-wrap items-baseline gap-3"><strong className="text-2xl text-[#800020]">{accuracy?.accuracyPercent==null?"—":`${accuracy.accuracyPercent}%`}</strong><span className="text-sm text-stone-600">of reconciled orders were within 10% of their original estimated cost ({accuracy?.accurate??0} of {accuracy?.total??0})</span></div>
          {!!accuracy?.trend.length && <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#35121d]">Quote accuracy over time</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{accuracy.trend.map(month=><div key={month.month} className="rounded-xl border border-[#EADDE0] p-3">
              <p className="text-xs font-semibold text-stone-500">{month.month} · {month.total} reconciled</p>
              <p className="mt-1 text-xl font-semibold text-[#800020]">{month.accuracyPercent}% within 10%</p>
              <p className="mt-1 text-xs text-stone-600">Final profit: {formatCurrency(month.profit,currency)}</p>
            </div>)}</div>
          </div>}
          {accuracy?.rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th className="py-2 pr-4">Completed garment</th><th className="py-2 pr-4 text-right">Estimated profit</th><th className="py-2 pr-4 text-right">Final profit / loss</th></tr></thead><tbody>{accuracy.rows.map(x=><tr key={x.orderId} className="border-t border-[#EEDFE3] cursor-pointer" onClick={()=>go("order",{id:x.orderId})}><td className="py-3 pr-4">{x.garment}<span className="block text-xs text-stone-500">{formatDate(x.date)}</span></td><td className="py-3 pr-4 text-right tabular-nums">{formatCurrency(x.estimatedProfit,currency)}</td><td className={cn("py-3 pr-4 text-right tabular-nums font-semibold",x.actualProfit<0?"text-red-700":"text-emerald-700")}>{formatCurrency(x.actualProfit,currency)}</td></tr>)}</tbody></table></div>:<p className="text-sm text-stone-500">{accuracyError || accuracyLoading ? "" : "No completed orders with confirmed actual costs yet. Reconcile a completed order to see final profit and quote accuracy here."}</p>}
        </div>
      </SectionCard>}
      <SectionCard title="Orders: cost vs price and estimated profit">
        <div className="grid gap-2 p-3 sm:grid-cols-2"><input aria-label="Search costed orders" placeholder="Search garment or customer" value={search} onChange={e=>setSearch(e.target.value)} className="min-w-0 rounded-lg border p-2 text-sm"/><select aria-label="Profitability filter" value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-lg border p-2 text-sm"><option value="all">All orders</option><option value="profit">Profitable</option><option value="loss">Loss-making</option><option value="even">Break-even</option></select></div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3 text-sm text-stone-600"><span role="status">{shown.length} of {rows.length} costed orders</span><button type="button" className="min-h-10 text-[#800020] underline" onClick={()=>{setSearch("");setFilter("all")}}>Reset filters</button></div>
        {rows.length > 0 && shown.length === 0 && <p className="p-3 text-sm text-stone-500">No orders match these filters.</p>}
        {isLoading ? (
          <p className="p-6 text-sm text-stone-400">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Calculator}
            title="No priced orders yet"
            description="When you book an order and enter its materials, labour and other costs, its true cost and suggested price appear here."
            action={
              <PremiumButton size="sm" onClick={() => go("new-order")}>
                <Plus className="w-4 h-4" /> Create an order
              </PremiumButton>
            }
          />
        ) : (
          <div className="overflow-x-auto" role="region" aria-label="Cost versus price by order" tabIndex={0}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-4 py-2.5">Order</th>
                  <th className="px-4 py-2.5 text-right">True cost</th>
                  <th className="px-4 py-2.5 text-right">Suggested</th>
                  <th className="px-4 py-2.5 text-right">Final price</th>
                  <th className="px-4 py-2.5 text-right">Profit / loss</th>
                  <th className="px-4 py-2.5 text-right">Margin</th>
                  <th className="px-4 py-2.5 text-right">Mark-up</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={r.order.id}
                    onClick={() => go("order", { id: r.order.id })}
                    className="cursor-pointer border-t border-[#EEDFE3]"
                  >
                    <td className="px-4 py-3">
                      <button type="button" className="text-left font-medium text-[#2F151B] hover:underline" onClick={e=>{e.stopPropagation();go("order",{id:r.order.id})}}>{r.order.garmentDesign}</button>
                      <p className="text-xs text-stone-500">
                        {r.order.customer?.name || "—"} · {formatDate(r.order.orderDate)}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={r.order.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r.trueCost, currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r.suggested, currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="font-medium text-[#2F151B]">{formatCurrency(r.price, currency)}</span>
                      {r.diff !== 0 && (
                        <span className="block text-xs text-stone-400">
                          {r.diff > 0 ? "+" : "−"}
                          {formatCurrency(Math.abs(r.diff), currency)} vs suggested
                        </span>
                      )}
                    </td>
                    <td className={cn("px-4 py-3 text-right tabular-nums font-semibold",r.profit<0?"text-red-700":"text-emerald-700")}>{formatCurrency(r.profit,currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.margin==null?"—":`${r.margin.toFixed(1)}%`}</td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right tabular-nums font-medium",
                        r.belowCost ? "text-amber-700" : "text-emerald-700"
                      )}
                    >
                      {r.achieved == null ? "—" : `${r.achieved.toFixed(0)}%`}
                      {r.belowCost && <span className="block text-xs font-normal">below cost</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  note,
  warn,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#E4DEDD] bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-stone-600">
        <Icon className="w-4 h-4 text-stone-400" /> {label}
      </div>
      <p className={cn("mt-2 break-words font-sans text-2xl font-semibold tabular-nums", warn ? "text-amber-700" : "text-[#800020]")}>{value}</p>
      <p className="mt-1 text-xs text-stone-500">{note}</p>
    </div>
  );
}
