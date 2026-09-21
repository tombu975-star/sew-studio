"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, ArrowLeft, AlertCircle } from "lucide-react";

import { apiGet } from "@/lib/api";
import { useNav } from "@/stores/nav";
import {
  formatCurrency,
  shortDate,
  isOverdue,
  ORDER_STATUSES,
} from "@/lib/format";
import type { Order, User } from "@/lib/types";

import { AtelierCard } from "@/components/atelier/AtelierCard";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default function Orders() {
  const { go } = useNav();
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

  const rows = useMemo(() => {
    if (!orders) return [];
    const q = search.trim().toLowerCase();
    return orders
      .filter((o) => statusFilter === "all" || o.status === statusFilter)
      .filter((o) => staffFilter === "all" || o.assignedStaffId === staffFilter)
      .filter(
        (o) =>
          !q ||
          o.garmentDesign?.toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q)
      )
      .map((o) => ({
        ...o,
        paid:
          o.payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) ?? 0,
      }));
  }, [orders, statusFilter, staffFilter, search]);

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="font-display font-semibold text-[#1C1917] leading-tight"
            style={{ fontSize: "clamp(28px, 4vw, 36px)" }}
          >
            Orders
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {isLoading
              ? "Loading…"
              : `${rows.length} order${rows.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button
          onClick={() => go("new-order")}
          className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-2"
        >
          <Plus className="w-4 h-4" /> New Order
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search garment or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-sm h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px] rounded-sm h-9 text-sm">
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
        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="w-[170px] rounded-sm h-9 text-sm">
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
      </div>

      {/* List */}
      {isLoading ? (
        <AtelierCard>
          <div className="py-10 text-center text-sm text-stone-400">
            Loading orders…
          </div>
        </AtelierCard>
      ) : rows.length === 0 ? (
        <AtelierCard>
          <div className="py-12 text-center">
            <AlertCircle className="w-6 h-6 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500">No orders found.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 rounded-sm"
              onClick={() => {
                setStatusFilter("all");
                setStaffFilter("all");
                setSearch("");
              }}
            >
              Clear filters
            </Button>
          </div>
        </AtelierCard>
      ) : (
        <div className="border border-[#E7E5E4] rounded-sm bg-white divide-y divide-[#E7E5E4] overflow-hidden">
          {/* Table header (desktop) */}
          <div className="hidden md:grid grid-cols-[1.4fr_2fr_0.8fr_0.8fr_1fr_0.9fr_0.9fr] gap-3 px-4 py-2.5 bg-[#FBF9F7] text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            <span>Customer</span>
            <span>Garment</span>
            <span>Ordered</span>
            <span>Delivery</span>
            <span>Status</span>
            <span className="text-right">Price</span>
            <span className="text-right">Paid</span>
          </div>

          {rows.map((o) => {
            const overdue = !!o.deliveryDate && isOverdue(o.deliveryDate);
            return (
              <button
                key={o.id}
                onClick={() => go("order", { id: o.id })}
                className="w-full text-left px-4 py-3.5 hover:bg-[#FBF9F7] transition-colors grid grid-cols-2 md:grid-cols-[1.4fr_2fr_0.8fr_0.8fr_1fr_0.9fr_0.9fr] gap-3 items-center"
              >
                {/* Customer */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#800020]/10 text-[#800020] flex items-center justify-center text-[11px] font-semibold shrink-0">
                    {initials(o.customer?.name || "?")}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#1C1917] truncate">
                      {o.customer?.name || "—"}
                    </div>
                    {o.priority === "High" && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#800020] font-semibold mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#800020]" />
                        High priority
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
                <div className="text-[12px] text-stone-500">
                  <span className="md:hidden text-[10px] uppercase tracking-wide text-stone-400 block">
                    Ordered
                  </span>
                  {shortDate(o.orderDate)}
                </div>

                {/* Delivery */}
                <div
                  className={cn(
                    "text-[12px]",
                    overdue ? "text-amber-700 font-semibold" : "text-stone-500"
                  )}
                >
                  <span className="md:hidden text-[10px] uppercase tracking-wide text-stone-400 block">
                    Delivery
                  </span>
                  {o.deliveryDate ? shortDate(o.deliveryDate) : "—"}
                  {overdue && (
                    <span className="ml-1 text-[10px] uppercase tracking-wide">
                      · overdue
                    </span>
                  )}
                </div>

                {/* Status */}
                <div className="md:col-auto col-span-2">
                  <StatusBadge status={o.status} />
                </div>

                {/* Price */}
                <div className="text-sm font-medium text-[#1C1917] md:text-right">
                  <span className="md:hidden text-[10px] uppercase tracking-wide text-stone-400 block">
                    Price
                  </span>
                  {formatCurrency(o.sellingPrice)}
                </div>

                {/* Paid */}
                <div className="text-sm md:text-right">
                  <span className="md:hidden text-[10px] uppercase tracking-wide text-stone-400 block">
                    Paid
                  </span>
                  <span
                    className={cn(
                      o.paid >= Number(o.sellingPrice) && o.sellingPrice > 0
                        ? "text-emerald-700 font-semibold"
                        : "text-stone-600"
                    )}
                  >
                    {formatCurrency(o.paid)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

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
