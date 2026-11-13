"use client";

import { useMemo } from "react";
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
  const { canSeeBusiness } = useRole();
  const canSee = canSeeBusiness();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/api/orders"),
    enabled: canSee,
  });
  const { data: settings } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => apiGet<Settings>("/api/settings"),
    enabled: canSee,
  });
  const currency = settings?.currency || "GHS";

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
        };
      })
      .sort((a, b) => new Date(b.order.orderDate).getTime() - new Date(a.order.orderDate).getTime());
  }, [orders, settings]);

  if (!canSee) {
    return (
      <div className="p-5 md:p-8 max-w-[820px] mx-auto w-full">
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

  const rate = overheadRecoveryRatePercent(settings);
  const markup = defaultMarkupPercent(settings);
  const belowCostCount = rows.filter((r) => r.belowCost).length;
  const totalCost = rows.reduce((s, r) => s + r.trueCost, 0);
  const totalPrice = rows.reduce((s, r) => s + r.price, 0);
  const blended = totalCost > 0 ? (totalPrice / totalCost - 1) * 100 : null;

  return (
    <div className="p-5 md:p-8 max-w-[1180px] mx-auto w-full">
      <PageHeader
        eyebrow="Pricing"
        eyebrowIcon={Calculator}
        title="True Costing"
        subtitle="Price every order from what it really costs: materials, labour, other costs and your studio overhead, plus a mark-up."
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

      <SectionCard title="Orders: cost vs price">
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
                  <th className="px-4 py-2.5 text-right">Mark-up</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.order.id}
                    onClick={() => go("order", { id: r.order.id })}
                    className="cursor-pointer border-t border-[#EEDFE3]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#2F151B] line-clamp-1">{r.order.garmentDesign}</p>
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
    <div className="rounded-xl border border-[#E6D4D8] bg-white p-4 shadow-xs">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
        <Icon className="w-4 h-4 text-stone-400" /> {label}
      </div>
      <p className={cn("mt-2 font-display text-2xl font-semibold tabular-nums", warn ? "text-amber-700" : "text-[#800020]")}>{value}</p>
      <p className="mt-1 text-xs text-stone-500">{note}</p>
    </div>
  );
}
