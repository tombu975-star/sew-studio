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
import type { Order, User } from "@/lib/types";

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
  "from-[#800020] to-[#800020]",
  "from-[#3d5166] to-[#3d5166]",
  "from-[#4d6b4a] to-[#4d6b4a]",
  "from-[#8a5a2b] to-[#8a5a2b]",
  "from-[#800020] to-[#800020]",
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
            {/* Table header (desktop) */}
            <div
              className={cn(
                "hidden md:grid gap-3 px-5 py-3 border-b border-[#E7E5E4] bg-[#faf8f5]/60 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500",
                canSeeMoney
                  ? "grid-cols-[0.5fr_1.4fr_2.1fr_0.85fr_0.85fr_1fr_0.95fr_1fr]"
                  : "grid-cols-[0.5fr_1.4fr_2.1fr_0.85fr_0.85fr_1fr]"
              )}
            >
              <span className="sr-only">Image</span>
              <span>Customer</span>
              <span>Garment</span>
              <span>Ordered</span>
              <span>Delivery</span>
              <span>Status</span>
              {canSeeMoney && (
                <>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Paid</span>
                </>
              )}
            </div>

            <div className="divide-y divide-[#E7E5E4]/70">
              {rows.map((o) => {
                const overdue = !!o.deliveryDate && isOverdue(o.deliveryDate);
                const paidPct =
                  o.sellingPrice > 0
                    ? Math.min(100, Math.round((o.paid / o.sellingPrice) * 100))
                    : 0;
                const grad =
                  AVATAR_GRADIENTS[
                    hashIndex(o.customer?.id || o.id, AVATAR_GRADIENTS.length)
                  ];
                return (
                  <button
                    key={o.id}
                    onClick={() => go("order", { id: o.id })}
                    className={cn(
                      "w-full text-left px-5 py-3.5 hover:bg-[#faf8f5] transition-colors grid grid-cols-2 md:gap-3 items-center group",
                      canSeeMoney
                        ? "md:grid-cols-[0.5fr_1.4fr_2.1fr_0.85fr_0.85fr_1fr_0.95fr_1fr]"
                        : "md:grid-cols-[0.5fr_1.4fr_2.1fr_0.85fr_0.85fr_1fr]"
                    )}
                  >
                    {/* Design image thumbnail (or placeholder) */}
                    <div className="hidden md:flex w-12 h-12 rounded-md overflow-hidden bg-[#FBF9F7] border border-[#E7E5E4] items-center justify-center shrink-0">
                      {o.designImage ? (
                        <img
                          src={o.designImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Scissors className="w-4 h-4 text-stone-400" />
                      )}
                    </div>

                    {/* Customer */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[11px] font-semibold shrink-0 elevate-xs",
                          grad
                        )}
                      >
                        {initials(o.customer?.name || "?")}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#1C1917] truncate group-hover:text-[#800020] transition-colors">
                          {o.customer?.name || "—"}
                        </div>
                        {o.priority === "High" && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-[#800020] font-semibold mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#800020]" />
                            Priority
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Garment */}
                    <div className="min-w-0">
                      <div className="text-sm text-[#1C1917] truncate">
                        {o.garmentDesign || "—"}
                      </div>
                      {o.assignedStaff && (
                        <div className="text-[11px] text-stone-400 truncate md:hidden">
                          {o.assignedStaff.fullName}
                        </div>
                      )}
                    </div>

                    {/* Ordered */}
                    <div className="text-[12px] text-stone-500 tabular-nums">
                      <span className="md:hidden text-[10px] uppercase tracking-wide text-stone-400 block">
                        Ordered
                      </span>
                      {shortDate(o.orderDate)}
                    </div>

                    {/* Delivery */}
                    <div
                      className={cn(
                        "text-[12px] tabular-nums flex items-center gap-1",
                        overdue
                          ? "text-amber-700 font-semibold"
                          : "text-stone-500"
                      )}
                    >
                      <span className="md:hidden text-[10px] uppercase tracking-wide text-stone-400 block">
                        Delivery
                      </span>
                      {overdue && <AlertCircle className="w-3 h-3 shrink-0" />}
                      {o.deliveryDate ? shortDate(o.deliveryDate) : "—"}
                    </div>

                    {/* Status */}
                    <div className="md:col-auto col-span-2">
                      <StatusBadge status={o.status} />
                    </div>

                    {/* Amount + Paid — money viewers only */}
                    {canSeeMoney && (
                      <>
                        <div className="text-sm font-medium text-[#1C1917] md:text-right tabular-nums">
                          <span className="md:hidden text-[10px] uppercase tracking-wide text-stone-400 block">
                            Amount
                          </span>
                          {formatCurrency(o.sellingPrice)}
                        </div>

                        <div className="text-sm md:text-right">
                          <span className="md:hidden text-[10px] uppercase tracking-wide text-stone-400 block">
                            Paid
                          </span>
                          <div
                            className={cn(
                              "font-medium tabular-nums",
                              paidPct >= 100 && o.sellingPrice > 0
                                ? "text-emerald-700"
                                : paidPct > 0
                                  ? "text-[#1C1917]"
                                  : "text-stone-400"
                            )}
                          >
                            {formatCurrency(o.paid)}
                          </div>
                          {o.sellingPrice > 0 && (
                            <div className="mt-1 h-1 w-full md:w-20 md:ml-auto bg-[#E7E5E4] rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  paidPct >= 100
                                    ? "bg-emerald-500"
                                    : "bg-[#800020]"
                                )}
                                style={{ width: `${paidPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>

      {/* Back link */}
      <button
        onClick={() => go("dashboard")}
        className="mt-6 inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#800020] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
      </button>
    </div>
  );
}
