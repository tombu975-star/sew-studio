"use client";

import { useMemo, useState } from "react";
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
  const { data: orders, isLoading, isError, refetch } = useQuery<Order[]>({ queryKey: ["orders"], queryFn: () => apiGet<Order[]>("/api/orders"), enabled: canSee });
  const { data: settings } = useQuery<Settings>({ queryKey: ["settings"], queryFn: () => apiGet<Settings>("/api/settings"), enabled: canSee });
  const [search,setSearch] = useState("");
  const [period,setPeriod] = useState("all");
  const [method,setMethod] = useState("all");
  const [limit,setLimit] = useState(50);
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

  const matches = (o: Order) => `${o.customer?.name ?? ""} ${o.garmentDesign ?? ""}`.toLowerCase().includes(search.trim().toLowerCase());
  const methods = Array.from(new Set(payments.map(p=>p.method).filter((m): m is string => typeof m === "string" && m.trim().length > 0)));
  const filtered = payments.filter(p=> { const d=new Date(p.date), now=new Date(); return matches(p.order) && (method==="all" || p.method===method) && (period==="all" || (d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear())); });
  const balances = owing.filter(r=>matches(r.order));
  const exportPayments = () => {
    if (!canSee || isError || isLoading) return;
    const cell = (v: unknown) => { const raw=String(v??""); const safe=typeof v==="string" && /^\s*[=+@-]/.test(raw) ? "\u0027"+raw : raw; return '"'+safe.replace(/"/g,'""')+'"'; };
    const csv = [["Date","Customer","Garment","Method","Amount", "Currency"],...filtered.map(p=>[p.date,p.order.customer?.name,p.order.garmentDesign,p.method,Number(p.amount),currency])].map(row=>row.map(cell).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"})); const a=document.createElement("a"); a.href=url; a.download="sewsiness-payments.csv"; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  if (!canSee) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pt-5 max-w-[820px] mx-auto w-full">
        <PageHeader eyebrow="Money" eyebrowIcon={Wallet} title="Payments" />
        <SectionCard><EmptyState icon={Lock} title="Payments are for the studio owner" description="Money received and owed is only shown to the owner." /></SectionCard>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pt-5 max-w-[1180px] mx-auto w-full">
      <PageHeader eyebrow="Money" eyebrowIcon={Wallet} title="Payments" subtitle="Every payment received, and what customers still owe. Record a payment from the order itself." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <MetricCard label="RECEIVED, ALL TIME" value={isLoading||isError?"—":formatCurrency(received, currency)} />
        <MetricCard label="RECEIVED THIS MONTH" value={isLoading||isError?"—":formatCurrency(month, currency)} accent />
        <MetricCard label="STILL OWED" value={isLoading||isError?"—":formatCurrency(outstanding, currency)} sub={isLoading||isError?"Unavailable":`${owing.length} order${owing.length === 1 ? "" : "s"} with a balance`} />
      </div>

      <SectionCard className="mb-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input aria-label="Search payments and balances" placeholder="Customer or garment" className="min-w-0 min-h-11 rounded-md border bg-white px-3 text-sm" value={search} onChange={e=>{setSearch(e.target.value);setLimit(50);}}/><select aria-label="Payment period" className="min-h-11 rounded-md border bg-white px-3 text-sm" value={period} onChange={e=>{setPeriod(e.target.value);setLimit(50);}}><option value="all">All time</option><option value="month">This month</option></select><select aria-label="Payment method" className="min-h-11 rounded-md border bg-white px-3 text-sm" value={method} onChange={e=>{setMethod(e.target.value);setLimit(50);}}><option value="all">All methods</option>{methods.map(m=><option key={m} value={m}>{m}</option>)}</select><PremiumButton disabled={isLoading||isError||!filtered.length} onClick={exportPayments}>Export payments</PremiumButton></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-sm text-stone-600">Filtered receipts: {isLoading||isError?"—":formatCurrency(filtered.reduce((n,p)=>n+Number(p.amount||0),0),currency)} · {isLoading||isError?"—":filtered.length} transactions</p><button type="button" className="min-h-10 text-sm text-[#800020] underline" onClick={()=>{setSearch("");setPeriod("all");setMethod("all");setLimit(50)}}>Reset filters</button></div></SectionCard>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Balances to collect">
          {isLoading ? <p className="p-6 text-sm text-stone-400">Loading…</p> : isError ? <p role="alert" className="p-5 text-sm">Could not load balances. <button className="underline" onClick={()=>void refetch()}>Retry</button></p> : balances.length === 0 ? (
            <EmptyState icon={Wallet} title={owing.length?"No matching balances":"Nothing owed"} description={owing.length?"Try another search.":"Every order is paid up."} />
          ) : (
            <ul className="divide-y divide-[#EEDFE3]">
              {balances.map(({ order, balance }) => (
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
          {isLoading ? <p className="p-6 text-sm text-stone-400">Loading…</p> : isError ? <p role="alert" className="p-5 text-sm">Could not load payments. <button className="underline" onClick={()=>void refetch()}>Retry</button></p> : filtered.length === 0 ? (
            <EmptyState icon={Wallet} title={payments.length?"No matching payments":"No payments yet"} description={payments.length?"Adjust your filters.":"Open an order and record the deposit to see it here."}
              action={<PremiumButton size="sm" onClick={() => go("orders")}>Open orders</PremiumButton>} />
          ) : (
            <ul className="divide-y divide-[#EEDFE3]">
              {filtered.slice(0, limit).map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => go("order", { id: p.order.id })} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#FBF1F3]">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium text-[#2F151B]">{p.order.customer?.name || "-"} · {p.order.garmentDesign}</span><span className="block text-xs text-stone-500">{formatDate(p.date)}{p.method ? ` · ${p.method}` : ""}</span></span>
                    <span className="text-sm font-semibold tabular-nums text-emerald-700">{formatCurrency(Number(p.amount), currency)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!isError && !isLoading && filtered.length>limit && <div className="p-3"><PremiumButton variant="outline" onClick={()=>setLimit(v=>v+50)}>Load more payments</PremiumButton></div>}
        </SectionCard>
      </div>
    </div>
  );
}
