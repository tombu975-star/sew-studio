"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Plus,
  CalendarDays,
  AlertCircle,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Check,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  shortDate,
  isWithinDays,
  isOverdue,
  ORDER_STATUSES,
  ACTIVE_STATUSES,
  ENTRY_SOURCES,
} from "@/lib/format";
import type {
  Order,
  Payment,
  Fitting,
  Task,
  User,
  Customer,
  Settings,
  StyleConcept,
} from "@/lib/types";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";
import { MetricCard } from "@/components/atelier/MetricCard";
import { AtelierCard } from "@/components/atelier/AtelierCard";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { Button } from "@/components/ui/button";

interface DashboardData {
  orders: Order[];
  payments: Payment[];
  fittings: Fitting[];
  tasks: Task[];
  users: User[];
  customers: Customer[];
  settings: Settings | null;
  styleConcepts: StyleConcept[];
}

/* ---------- local helpers ---------- */

function orderPaidTotal(orderId: string, payments: Payment[]) {
  return payments
    .filter((p) => p.orderId === orderId)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
}

function orderCostTotal(order: Order) {
  return (Number(order.fabricCost) || 0) + (Number(order.labourCost) || 0);
}

function sameMonth(d: string | Date | null | undefined, ref: Date) {
  if (!d) return false;
  const x = new Date(d);
  if (isNaN(x.getTime())) return false;
  return x.getMonth() === ref.getMonth() && x.getFullYear() === ref.getFullYear();
}

/** Build last `months` monthly income buckets from a flat payments array. */
function monthlyIncome(payments: Payment[], months = 6) {
  const now = new Date();
  const buckets: { key: string; label: string; total: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-GB", { month: "short" }),
      total: 0,
    });
  }
  for (const p of payments) {
    if (!p.date) continue;
    const d = new Date(p.date);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.total += Number(p.amount) || 0;
  }
  return buckets;
}

const ACTIVE = ACTIVE_STATUSES as readonly string[];

/* ---------- main view ---------- */

export default function Dashboard() {
  const { go } = useNav();
  const { isStaff, ownerLabel } = useRole();
  const staff = isStaff();

  const [insights, setInsights] = useState<string[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => apiGet<DashboardData>("/api/dashboard"),
  });

  const m = useMemo(() => {
    if (!data) return null;
    const { orders, payments, fittings, tasks, users, customers } = data;
    const now = new Date();

    const salesThisMonth = orders
      .filter((o) => sameMonth(o.orderDate, now))
      .reduce((s, o) => s + (Number(o.sellingPrice) || 0), 0);

    const receivedThisMonth = payments
      .filter((p) => sameMonth(p.date, now))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const outstanding = orders
      .filter((o) => o.status !== "Completed")
      .reduce((s, o) => {
        const paid = orderPaidTotal(o.id, payments);
        return s + Math.max(0, (Number(o.sellingPrice) || 0) - paid);
      }, 0);

    const profit = orders.reduce(
      (s, o) => s + (Number(o.sellingPrice) || 0) - orderCostTotal(o),
      0
    );

    const activeOrders = orders.filter((o) => ACTIVE.includes(o.status));

    const statusCounts = ORDER_STATUSES.map((s) => ({
      status: s,
      count: orders.filter((o) => o.status === s).length,
    }));

    const upcomingFittings = fittings
      .filter((f) => f.status === "Scheduled")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);

    const overdueTasks = tasks.filter(
      (t) => t.status !== "Done" && isOverdue(t.dueDate)
    );
    const openTasks = tasks.filter((t) => t.status !== "Done");
    const readyOrders = orders.filter((o) => o.status === "Ready");
    const dueSoon = orders.filter(
      (o) =>
        o.status !== "Completed" &&
        o.status !== "Collected/Delivered" &&
        isWithinDays(o.deliveryDate, 7)
    );

    const staffWorkload = (users || []).map((u) => ({
      user: u,
      openTasks: tasks.filter(
        (t) => t.staffId === u.id && t.status !== "Done"
      ).length,
      activeOrders: orders.filter(
        (o) => o.assignedStaffId === u.id && ACTIVE.includes(o.status)
      ).length,
    }));

    const margins = orders.map(
      (o) => (Number(o.sellingPrice) || 0) - orderCostTotal(o)
    );
    const avgMargin =
      margins.length > 0
        ? margins.reduce((a, b) => a + b, 0) / margins.length
        : 0;

    const healthStatus =
      outstanding > 5000 || overdueTasks.length > 3
        ? "At Risk"
        : outstanding > 1000 || overdueTasks.length > 0
        ? "Needs Attention"
        : "On Track";

    const incomeSeries = monthlyIncome(payments, 6);

    /* ----- Needs Attention items ----- */
    const attentionItems: string[] = [];
    dueSoon.slice(0, 3).forEach((o) => {
      attentionItems.push(
        `“${(o.garmentDesign || "Untitled garment").slice(0, 36)}” is due ${shortDate(
          o.deliveryDate
        )} — confirm progress with the customer.`
      );
    });
    if (overdueTasks.length > 0) {
      attentionItems.push(
        `${overdueTasks.length} overdue task${
          overdueTasks.length > 1 ? "s" : ""
        } need attention — review on the Tasks board.`
      );
    }
    if (readyOrders.length > 0) {
      attentionItems.push(
        `${readyOrders.length} order${
          readyOrders.length > 1 ? "s are" : " is"
        } Ready and awaiting collection.`
      );
    }
    const enquiryCount = orders.filter((o) => o.status === "Enquiry").length;
    if (enquiryCount > 3) {
      attentionItems.push(
        `${enquiryCount} enquiries are still open — follow up to convert them into confirmed orders.`
      );
    }
    const quotedCount = orders.filter((o) => o.status === "Quoted").length;
    if (quotedCount > 2) {
      attentionItems.push(
        `${quotedCount} quotes sent are awaiting a deposit — nudge the clients.`
      );
    }
    if (attentionItems.length === 0) {
      attentionItems.push(
        "Nothing pressing — the studio is in good shape today."
      );
    }

    return {
      salesThisMonth,
      receivedThisMonth,
      outstanding,
      profit,
      activeOrders,
      statusCounts,
      upcomingFittings,
      staffWorkload,
      avgMargin,
      healthStatus,
      overdueTaskCount: overdueTasks.length,
      openTasks,
      readyOrders,
      incomeSeries,
      attentionItems: attentionItems.slice(0, 6),
      orders,
      payments,
      customers,
      fittingsCount: fittings.length,
      upcomingFittingsCount: upcomingFittings.length,
    };
  }, [data]);

  /* ----- AI Trend Suggestions ----- */
  const generateInsights = async () => {
    if (!m) return;
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const statusBreakdown: Record<string, number> = {};
      ORDER_STATUSES.forEach((s) => {
        statusBreakdown[s] = m.orders.filter((o) => o.status === s).length;
      });
      const customerSources: Record<string, number> = {};
      ENTRY_SOURCES.forEach((s) => {
        customerSources[s] = m.customers.filter((c) => c.entrySource === s).length;
      });
      const payload = {
        orders: {
          orderCount: m.orders.length,
          totalSales: m.orders.reduce(
            (s, o) => s + (Number(o.sellingPrice) || 0),
            0
          ),
          outstanding: m.outstanding,
          statusBreakdown,
        },
        payments: {
          paymentsThisMonth: m.receivedThisMonth,
          totalReceived: m.payments.reduce(
            (s, p) => s + (Number(p.amount) || 0),
            0
          ),
        },
        customers: {
          count: m.customers.length,
          customerSources,
        },
        fittings: {
          upcomingCount: m.upcomingFittingsCount,
        },
      };
      const res = await apiPost<{ suggestions: string[] }>(
        "/api/insights/trends",
        payload
      );
      setInsights(res.suggestions || []);
    } catch (e) {
      setInsightsError(
        e instanceof Error ? e.message : "Failed to generate insights."
      );
    } finally {
      setInsightsLoading(false);
    }
  };

  /* ----- render guards ----- */
  if (isLoading || !m) {
    return (
      <div className="p-10 text-stone-400 text-sm">Loading the atelier…</div>
    );
  }
  if (isError) {
    return (
      <div className="p-10 text-stone-400 text-sm">
        Could not load the atelier overview. Please refresh in a moment.
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const healthBadgeClass =
    m.healthStatus === "On Track"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : m.healthStatus === "Needs Attention"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-[#800020]/10 text-[#800020] border-[#800020]/30";

  return (
    <div className="p-5 md:p-8 max-w-[1400px] mx-auto w-full">
      {/* ---------- Banner ---------- */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5" />
            {today}
          </p>
          <h1
            className="font-display font-semibold text-[#1C1917] leading-none"
            style={{ fontSize: "clamp(32px, 5vw, 44px)" }}
          >
            {staff ? "Your Workbench" : `${ownerLabel}'s Atelier`}
          </h1>
          <p className="text-sm text-stone-500 mt-2 max-w-xl">
            {staff
              ? "Orders and tasks across the studio — keep production moving today."
              : "A snapshot of the studio today — production, money and momentum at a glance."}
          </p>
        </div>
        <Button
          onClick={() => go("new-order")}
          className="hidden md:inline-flex bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm h-11 px-5"
        >
          <Plus className="w-4 h-4" />
          New Custom Order
        </Button>
      </div>

      {/* ---------- Money row (Madam only) ---------- */}
      {!staff && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-5">
          <MetricCard
            label="Sales This Month"
            value={formatCurrency(m.salesThisMonth)}
            sub={`${
              m.orders.filter((o) => sameMonth(o.orderDate, new Date())).length
            } orders booked`}
          />
          <MetricCard
            label="Money Received"
            value={formatCurrency(m.receivedThisMonth)}
            accent
            sub="Payments collected this month"
          />
          <MetricCard
            label="Outstanding"
            value={formatCurrency(m.outstanding)}
            sub="From non-completed orders"
          />
          <MetricCard
            label="Estimated Profit"
            value={formatCurrency(m.profit)}
            accent
            sub="Sales − fabric − labour"
          />
        </div>
      )}

      {/* ---------- Work + People grid ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-5">
        {/* Left 2/3 column — stack */}
        <div className="lg:col-span-2 flex flex-col gap-3 md:gap-4">
          {/* Active Orders */}
          <AtelierCard
            title="Active Orders"
            action={
              <button
                onClick={() => go("orders")}
                className="text-[11px] text-[#800020] font-medium hover:underline flex items-center gap-1"
              >
                View all
                <ChevronRight className="w-3 h-3" />
              </button>
            }
          >
            {m.activeOrders.length === 0 ? (
              <p className="text-sm text-stone-400 py-6 text-center">
                No active orders right now. Start one with “New Custom Order”.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto scroll-slim pb-2 -mx-1 px-1">
                {m.activeOrders.slice(0, 10).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => go("order", { id: o.id })}
                    className="text-left shrink-0 w-56 border border-[#E7E5E4] rounded-sm p-4 hover:border-[#800020]/40 transition group"
                  >
                    <p className="text-sm font-medium text-[#1C1917] truncate group-hover:text-[#800020]">
                      {o.garmentDesign?.slice(0, 40) || "Untitled garment"}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      Deliver {shortDate(o.deliveryDate)}
                    </p>
                    <div className="mt-3">
                      <StatusBadge status={o.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </AtelierCard>

          {/* Status Pipeline */}
          <AtelierCard title="Status Pipeline">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {m.statusCounts.map(({ status, count }) => (
                <div
                  key={status}
                  className="border border-[#E7E5E4] rounded-sm px-3 py-2.5"
                >
                  <div className="font-display text-2xl font-semibold text-[#1C1917] leading-none">
                    {count}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1.5 leading-tight">
                    {status}
                  </div>
                </div>
              ))}
            </div>
          </AtelierCard>

          {/* Upcoming Fittings */}
          <AtelierCard title="Upcoming Fittings">
            {m.upcomingFittings.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">
                No fittings scheduled. Add one from an order’s detail page.
              </p>
            ) : (
              <div className="divide-y divide-[#E7E5E4]">
                {m.upcomingFittings.map((f) => {
                  const order = m.orders.find((o) => o.id === f.orderId);
                  return (
                    <button
                      key={f.id}
                      onClick={() => order && go("order", { id: order.id })}
                      className="flex items-center justify-between py-3 w-full text-left group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1C1917] group-hover:text-[#800020] truncate">
                          {order?.garmentDesign?.slice(0, 40) ||
                            "Order fitting"}
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {formatDate(f.date)}
                        </p>
                      </div>
                      <StatusBadge status={f.status} />
                    </button>
                  );
                })}
              </div>
            )}
          </AtelierCard>
        </div>

        {/* Right 1/3 column — Staff Workload / My Open Tasks */}
        <AtelierCard
          title={staff ? "My Open Tasks" : "Staff Workload"}
          action={
            <button
              onClick={() => go("tasks")}
              className="text-[11px] text-[#800020] font-medium hover:underline flex items-center gap-1"
            >
              {staff ? "Open" : "All tasks"}
              <ChevronRight className="w-3 h-3" />
            </button>
          }
        >
          {staff ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="font-display text-5xl font-semibold text-[#800020] leading-none">
                {m.openTasks.length}
              </div>
              <p className="text-xs text-stone-400 mt-2">
                open tasks in the studio
              </p>
              <button
                onClick={() => go("tasks")}
                className="mt-4 text-[11px] text-[#800020] font-medium hover:underline"
              >
                Go to Tasks →
              </button>
            </div>
          ) : m.staffWorkload.length === 0 ? (
            <p className="text-sm text-stone-400 py-6 text-center">
              No team members yet. Add staff in Settings to see workload here.
            </p>
          ) : (
            <div className="divide-y divide-[#E7E5E4]">
              {m.staffWorkload.map(({ user, openTasks, activeOrders }) => (
                <div key={user.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center text-xs font-semibold text-[#800020] shrink-0">
                    {(user.fullName || user.email || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1C1917] truncate">
                      {user.fullName || user.email}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      {activeOrders} active order{activeOrders !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center justify-center min-w-7 h-6 px-2 text-[11px] font-semibold text-[#800020] bg-[#800020]/10 rounded-full"
                    title={`${openTasks} open task${openTasks !== 1 ? "s" : ""}`}
                  >
                    {openTasks}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AtelierCard>
      </div>

      {/* ---------- Madam-only sections ---------- */}
      {!staff && (
        <>
          {/* Income Trend */}
          <div className="mb-4 md:mb-5">
            <AtelierCard
              title="Income Trend"
              action={
                <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  Last 6 months
                </span>
              }
            >
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={m.incomeSeries}
                    margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
                  >
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#800020"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#800020"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#E7E5E4"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#A8A29E" }}
                      axisLine={{ stroke: "#E7E5E4" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#A8A29E" }}
                      axisLine={false}
                      tickLine={false}
                      width={64}
                      tickFormatter={(v: number | string) =>
                        formatCurrency(Number(v))
                      }
                    />
                    <Tooltip
                      formatter={(value: number | string) => [
                        formatCurrency(Number(value)),
                        "Received",
                      ]}
                      contentStyle={{
                        border: "1px solid #E7E5E4",
                        borderRadius: 4,
                        fontSize: 12,
                        background: "#FBF9F7",
                      }}
                      labelStyle={{ color: "#1C1917", fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#800020"
                      strokeWidth={2}
                      fill="url(#incomeGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </AtelierCard>
          </div>

          {/* Business Health + Needs Attention */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-5">
            <AtelierCard title="Business Health">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`inline-flex items-center px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide border rounded-sm ${healthBadgeClass}`}
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {m.healthStatus}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-500">Avg margin per order</span>
                  <span className="font-medium text-[#1C1917]">
                    {formatCurrency(m.avgMargin)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-500">Outstanding total</span>
                  <span className="font-medium text-[#1C1917]">
                    {formatCurrency(m.outstanding)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-500">Overdue tasks</span>
                  <span className="font-medium text-[#1C1917]">
                    {m.overdueTaskCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-500">Ready for collection</span>
                  <span className="font-medium text-[#1C1917]">
                    {m.readyOrders.length}
                  </span>
                </div>
              </div>
            </AtelierCard>

            <AtelierCard title="Needs Attention">
              <ul className="space-y-3">
                {m.attentionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-stone-600 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </AtelierCard>
          </div>

          {/* AI Trend Suggestions */}
          <div className="mb-4 md:mb-5">
            <AtelierCard title="Trend Suggestions">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#800020]/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-[#800020]" />
                  </div>
                  <p className="text-sm text-stone-600 leading-snug flex-1">
                    Generate AI insights from your studio’s recent orders,
                    payments and customer mix. Suggestions focus on cash flow,
                    status mix and where to focus next.
                  </p>
                  <Button
                    onClick={generateInsights}
                    disabled={insightsLoading}
                    className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm shrink-0"
                  >
                    {insightsLoading ? "Generating…" : "Generate insights"}
                  </Button>
                </div>

                {insightsError && (
                  <p className="text-xs text-[#800020]">{insightsError}</p>
                )}

                {insights && insights.length > 0 && (
                  <ul className="space-y-2.5 border-t border-[#E7E5E4] pt-4">
                    {insights.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-emerald-700" />
                        </span>
                        <span className="text-stone-700 leading-snug">{s}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {insights && insights.length === 0 && !insightsError && (
                  <p className="text-xs text-stone-400 border-t border-[#E7E5E4] pt-4">
                    No suggestions returned. Try again later.
                  </p>
                )}
              </div>
            </AtelierCard>
          </div>
        </>
      )}

      {/* ---------- Mobile floating New Order ---------- */}
      <button
        onClick={() => go("new-order")}
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-[#800020] text-white flex items-center justify-center shadow-lg hover:bg-[#6b0018] transition"
        aria-label="New Custom Order"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
