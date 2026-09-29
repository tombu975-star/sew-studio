"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  ArrowLeft,
  AlertCircle,
  ShoppingBag,
  CheckCircle2,
  Clock,
  Scissors,
} from "lucide-react";

import { apiGet } from "@/lib/api";
import { useNav } from "@/stores/nav";
import { useAuth } from "@/stores/auth";
import { useRole } from "@/stores/role";
import {
  formatCurrency,
  shortDate,
  isOverdue,
  ORDER_STATUSES,
  ACTIVE_STATUSES,
} from "@/lib/format";
import type { Order, Settings, User } from "@/lib/types";

import { invoiceNumber } from "@/components/atelier/Invoice";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumMetric } from "@/components/atelier/PremiumMetric";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { EmptyState, SkeletonList } from "@/components/atelier/EmptyState";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const AVATAR_GRADIENTS = [
  "from-[#9E5A44] to-[#9E5A44]",
  "from-[#3d5166] to-[#3d5166]",
  "from-[#4d6b4a] to-[#4d6b4a]",
  "from-[#8a5a2b] to-[#8a5a2b]",
  "from-[#9E5A44] to-[#9E5A44]",
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function hashIndex(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

function sameMonth(dateStr?: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  );
}

export default function Orders() {
  const { go } = useNav();
  const { user } = useAuth();
  const {
    isTrainee,
    isStaff,
    canSeeBusiness,
    canCreateOrders,
    canSeeAllCustomers,
  } = useRole();
  // Trainees always see only their own orders. Staff (non-trainee, non-trainer)
  // also see only their own orders since they can't see all customers.
  const scopeToMine =
    !!user && (isTrainee() || (isStaff() && !canSeeAllCustomers()));
  const canSeeMoney = canSeeBusiness();
  const canCreate = canCreateOrders();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/api/orders"),
  });
  const { data: settings } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => apiGet<Settings>("/api/settings"),
  });
  const invoicePrefix = settings?.invoicePrefix;
  const { data: users } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiGet<User[]>("/api/users"),
  });

  const enriched = useMemo(() => {
    const base = (orders || []).map((o) => ({
      ...o,
      paid:
        o.payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) ?? 0,
    }));
    if (scopeToMine && user) {
      return base.filter((o) => o.assignedStaffId === user.id);
    }
    return base;
  }, [orders, scopeToMine, user]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const active = enriched.filter((o) =>
      ACTIVE_STATUSES.includes(
        o.status as (typeof ACTIVE_STATUSES)[number]
      )
    ).length;
    const ready = enriched.filter((o) => o.status === "Ready").length;
    const completedThisMonth = enriched.filter(
      (o) => o.status === "Completed" && sameMonth(o.orderDate)
    ).length;
    return { total, active, ready, completedThisMonth };
  }, [enriched]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched
      .filter((o) => statusFilter === "all" || o.status === statusFilter)
      .filter(
        (o) => staffFilter === "all" || o.assignedStaffId === staffFilter
      )
      .filter(
        (o) =>
          !q ||
          o.garmentDesign?.toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q)
      );
  }, [enriched, statusFilter, staffFilter, search]);

  const clearFilters = () => {
    setStatusFilter("all");
    setStaffFilter("all");
    setSearch("");
  };

  return (
    <div className="p-5 md:p-8 max-w-[1300px] mx-auto w-full">
      <PageHeader
        eyebrow={scopeToMine ? "My work" : "Production"}
        eyebrowIcon={ShoppingBag}
        title="Orders"
        subtitle={
          scopeToMine
            ? "Garments assigned to you in the studio."
            : "Every garment, from enquiry to collection."
        }
        actions={
          canCreate ? (
            <PremiumButton onClick={() => go("new-order")}>
              <Plus className="w-4 h-4" /> New Order
            </PremiumButton>
          ) : undefined
        }
      />

      {/* Premium stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PremiumMetric
          label="Total Orders"
          value={isLoading ? "—" : stats.total}
          icon={ShoppingBag}
          accent
        />
        <PremiumMetric
          label="Active"
          value={isLoading ? "—" : stats.active}
          icon={Clock}
        />
        <PremiumMetric
          label="Ready for Collection"
          value={isLoading ? "—" : stats.ready}
          icon={CheckCircle2}
        />
        <PremiumMetric
          label="Completed This Month"
          value={isLoading ? "—" : stats.completedThisMonth}
          icon={CheckCircle2}
        />
      </div>

      {/* Filter bar */}
      <SectionCard className="mb-6" bodyClassName="py-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <Input
              placeholder="Search by garment or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-md h-9 bg-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[190px] rounded-md h-9 text-sm bg-white">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!scopeToMine && (
            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger className="w-full md:w-[180px] rounded-md h-9 text-sm bg-white">
                <SelectValue placeholder="All staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {(users || []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </SectionCard>

      {/* Orders table */}
      <SectionCard bodyClassName="p-0">
        {isLoading ? (
          <SkeletonList rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={
              scopeToMine
                ? "No orders assigned to you yet"
                : "No orders match your filters"
            }
            description={
              scopeToMine
                ? "When the studio assigns you a garment, it'll appear here."
                : "Try adjusting your search or filters, or create a new commission."
            }
            action={
              scopeToMine ? undefined : (
                <PremiumButton variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </PremiumButton>
              )
            }
          />
        ) : (
          <>
            {/* Desktop: invoice register table */}
            <div className="hidden xl:block overflow-x-auto scroll-slim">
              <table className="w-full min-w-[900px] table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[132px]" />
                  <col />
                  <col />
                  <col className="w-[92px]" />
                  <col className="w-[92px]" />
                  <col className="w-[150px]" />
                  {canSeeMoney && (
                    <>
                      <col className="w-[112px]" />
                      <col className="w-[112px]" />
                      <col className="w-[112px]" />
                    </>
                  )}
                </colgroup>
                <thead>
                  <tr className="border-b border-[#EAE6DF] bg-[#FAFAF7]/60 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                    <th className="px-3 py-3 text-left font-semibold">Customer</th>
                    <th className="px-3 py-3 text-left font-semibold">Garment</th>
                    <th className="px-3 py-3 text-left font-semibold">Ordered</th>
                    <th className="px-3 py-3 text-left font-semibold">Delivery</th>
                    <th className="px-3 py-3 text-left font-semibold">Status</th>
                    {canSeeMoney && (
                      <>
                        <th className="px-3 py-3 text-right font-semibold">Amount</th>
                        <th className="px-3 py-3 text-right font-semibold">Paid</th>
                        <th className="px-4 py-3 text-right font-semibold">Balance</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6DF]/70">
                  {rows.map((o) => {
                    const overdue = !!o.deliveryDate && isOverdue(o.deliveryDate);
                    const balance = Math.max(0, (Number(o.sellingPrice) || 0) - o.paid);
                    const settled = o.sellingPrice > 0 && balance === 0;
                    return (
                      <tr
                        key={o.id}
                        onClick={() => go("order", { id: o.id })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            go("order", { id: o.id });
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        className="group cursor-pointer align-middle hover:bg-[#FAFAF7] focus-visible:bg-[#FAFAF7] focus-visible:outline-none transition-colors"
                      >
                        <td className="px-4 py-3.5 text-[12px] font-medium tabular-nums text-stone-600 whitespace-nowrap">
                          {invoiceNumber(o, invoicePrefix)}
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-semibold shrink-0",
                                AVATAR_GRADIENTS[hashIndex(o.customer?.id || o.id, AVATAR_GRADIENTS.length)]
                              )}
                            >
                              {initials(o.customer?.name || "?")}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-[#1C1A18] group-hover:text-[#9E5A44] transition-colors">
                                {o.customer?.name || "—"}
                              </div>
                              {o.priority === "High" && (
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-[#9E5A44] font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#9E5A44]" />
                                  Priority
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="truncate text-[#1C1A18]">{o.garmentDesign || "—"}</div>
                          {o.assignedStaff && (
                            <div className="truncate text-[11px] text-stone-400">
                              {o.assignedStaff.fullName}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-[12px] text-stone-500 tabular-nums whitespace-nowrap">
                          {shortDate(o.orderDate)}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-3.5 text-[12px] tabular-nums whitespace-nowrap",
                            overdue ? "text-amber-700 font-semibold" : "text-stone-500"
                          )}
                        >
                          <span className="inline-flex items-center gap-1">
                            {overdue && <AlertCircle className="w-3 h-3 shrink-0" />}
                            {o.deliveryDate ? shortDate(o.deliveryDate) : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusBadge status={o.status} />
                        </td>
                        {canSeeMoney && (
                          <>
                            <td className="px-3 py-3.5 text-right font-medium tabular-nums text-[#1C1A18] whitespace-nowrap">
                              {formatCurrency(o.sellingPrice)}
                            </td>
                            <td className="px-3 py-3.5 text-right tabular-nums text-stone-600 whitespace-nowrap">
                              {formatCurrency(o.paid)}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3.5 text-right font-semibold tabular-nums whitespace-nowrap",
                                settled ? "text-emerald-700" : balance > 0 ? "text-[#9E5A44]" : "text-stone-400"
                              )}
                            >
                              {settled ? "Settled" : formatCurrency(balance)}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: one card per invoice */}
            <ul className="xl:hidden divide-y divide-[#EAE6DF]/70 md:divide-y-0 md:grid md:grid-cols-2 md:gap-3 md:p-4">
              {rows.map((o) => {
                const overdue = !!o.deliveryDate && isOverdue(o.deliveryDate);
                const balance = Math.max(0, (Number(o.sellingPrice) || 0) - o.paid);
                const settled = o.sellingPrice > 0 && balance === 0;
                return (
                  <li key={o.id} className="md:border md:border-[#EAE6DF] md:rounded-lg md:overflow-hidden md:bg-white">
                    <button
                      onClick={() => go("order", { id: o.id })}
                      className="w-full h-full text-left px-4 py-4 active:bg-[#FAFAF7] hover:bg-[#FAFAF7] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-[#1C1A18]">
                            {o.customer?.name || "—"}
                          </div>
                          <div className="truncate text-[13px] text-stone-600">
                            {o.garmentDesign || "—"}
                          </div>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-stone-400">
                        <span className="tabular-nums">{invoiceNumber(o, invoicePrefix)}</span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 tabular-nums",
                            overdue && "text-amber-700 font-semibold"
                          )}
                        >
                          {overdue && <AlertCircle className="w-3 h-3" />}
                          Due {o.deliveryDate ? shortDate(o.deliveryDate) : "—"}
                        </span>
                      </div>
                      {canSeeMoney && (
                        <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-md bg-[#FAFAF7] px-3 py-2 text-[12px] tabular-nums">
                          <div>
                            <div className="text-[9px] uppercase tracking-wide text-stone-400">Amount</div>
                            <div className="font-medium text-[#1C1A18]">{formatCurrency(o.sellingPrice)}</div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase tracking-wide text-stone-400">Paid</div>
                            <div className="text-stone-600">{formatCurrency(o.paid)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] uppercase tracking-wide text-stone-400">Balance</div>
                            <div className={cn("font-semibold", settled ? "text-emerald-700" : balance > 0 ? "text-[#9E5A44]" : "text-stone-400")}>
                              {settled ? "Settled" : formatCurrency(balance)}
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </SectionCard>

      {/* Back link */}
      <button
        onClick={() => go("dashboard")}
        className="mt-6 inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#9E5A44] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
      </button>
    </div>
  );
}
