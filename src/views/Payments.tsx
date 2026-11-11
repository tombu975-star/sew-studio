"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Wallet } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Order, Settings } from "@/lib/types";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { MetricCard } from "@/components/atelier/MetricCard";
import { EmptyState } from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";

/** Money in: every payment received, and what each order still owes. */
export default function Payments() {
  const { go } = useNav();
  const { canSeeBusiness } = useRole();
  const canSee = canSeeBusiness();
  const { data: orders, isLoading } = useQuery<Order[]>({ queryKey: ["orders"], queryFn: () => apiGet<Order[]>("/api/orders"), enabled: canSee });
  const { data: settings } = useQuery<Settings>({ queryKey: ["settings"], queryFn: () => apiGet<Settings>("/api/settings"), enabled: canSee });
  const currency = settings?.currency || "GHS";

  const { payments, owing, received, month, outstanding } = useMemo(() => {
    const list = (orders || []).flatMap((o) => (o.payments || []).map((p) => ({ ...p, order: o })));
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const received = list.reduce((n, p) => n + Number(p.amount || 0), 0);
    const now = new Date();
    const month = list
      .filter((p) => { const d = new Date(p.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((n, p) => n + Number(p.amount || 0), 0);
    const owing = (orders || [])
      
      .map((o) => ({ order: o, balance: Number(o.sellingPrice || 0) - (o.payments || []).reduce((n, p) => n + Number(p.amount || 0), 0) }))
      .filter((r) => r.balance > 0.005)
      .sort((a, b) => b.balance - a.balance);
    return { payments: list, owing, received, month, outstanding: owing.reduce((n, r) => n + r.balance, 0) };
  }, [orders]);

  if (!canSee) {
    return (
      <div className="p-5 md:p-8 max-w-[820px] mx-auto w-full">
        <PageHeader eyebrow="Money" eyebrowIcon={Wallet} title="Payments" />
        <SectionCard><EmptyState icon={Lock} title="Payments are for the studio owner" description="Money received and owed is only shown to the owner." /></SectionCard>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-[1180px] mx-auto w-full">
      <PageHeader eyebrow="Money" eyebrowIcon={Wallet} title="Payments" subtitle="Every payment received, and what customers still owe. Record a payment from the order itself." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <MetricCard label="RECEIVED, ALL TIME" value={formatCurrency(received, currency)} />
        <MetricCard label="RECEIVED THIS MONTH" value={formatCurrency(month, currency)} accent />
        <MetricCard label="STILL OWED" value={formatCurrency(outstanding, currency)} sub={`${owing.length} order${owing.length === 1 ? "" : "s"} with a balance`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Balances to collect">
          {isLoading ? <p className="p-6 text-sm text-stone-400">Loading…</p> : owing.length === 0 ? (
            <EmptyState icon={Wallet} title="Nothing owed" description="Every order is paid up." />
          ) : (
            <ul className="divide-y divide-[#EEDFE3]">
              {owing.map(({ order, balance }) => (
                <li key={order.id}>
                  <button type="button" onClick={() => go("order", { id: order.id })} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#FBF1F3]">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium text-[#2F151B]">{order.garmentDesign}</span><span className="block text-xs text-stone-500">{order.customer?.name || "-"}</span></span>
                    <span className="text-sm font-semibold tabular-nums text-[#650019]">{formatCurrency(balance, currency)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Payments received">
          {isLoading ? <p className="p-6 text-sm text-stone-400">Loading…</p> : payments.length === 0 ? (
            <EmptyState icon={Wallet} title="No payments yet" description="Open an order and record the deposit to see it here."
              action={<PremiumButton size="sm" onClick={() => go("orders")}>Open orders</PremiumButton>} />
          ) : (
            <ul className="divide-y divide-[#EEDFE3]">
              {payments.slice(0, 50).map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => go("order", { id: p.order.id })} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#FBF1F3]">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium text-[#2F151B]">{p.order.customer?.name || "-"} · {p.order.garmentDesign}</span><span className="block text-xs text-stone-500">{formatDate(p.date)}{p.method ? ` · ${p.method}` : ""}</span></span>
                    <span className="text-sm font-semibold tabular-nums text-emerald-700">{formatCurrency(Number(p.amount), currency)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
