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
  Wallet,
  ArrowRight,
  ClipboardList,
  PackageCheck,
  CircleDollarSign,
  Coins,
  Timer,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

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

import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumMetric } from "@/components/atelier/PremiumMetric";
import { AnimatedNumber } from "@/components/atelier/AnimatedNumber";
import {
  EmptyState,
  SkeletonCard,
  SkeletonList,
} from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { StatusBadge } from "@/components/atelier/StatusBadge";

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

/** Build last `months` monthly buckets from a flat array using extractor fns. */
function monthlyBuckets<T>(
  items: T[],
  getDate: (x: T) => string | Date | null | undefined,
  getValue: (x: T) => number,
  months = 6
) {
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
  for (const item of items) {
    const dRaw = getDate(item);
    if (!dRaw) continue;
    const d = new Date(dRaw);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.total += Number(getValue(item)) || 0;
  }
  return buckets;
}

const ACTIVE = ACTIVE_STATUSES as readonly string[];

/** Status category → text color class for the pipeline tile count. */
const STATUS_CATEGORY_COLOR: Record<string, string> = {
  Enquiry: "text-stone-700",
  Quoted: "text-stone-700",
  Consultation: "text-stone-700",
  Confirmed: "text-blue-700",
  "Deposit Paid": "text-blue-700",
  "In Production": "text-violet-700",
  Fitting: "text-cyan-700",
  Alterations: "text-cyan-700",
  Ready: "text-emerald-700",
  "Collected/Delivered": "text-teal-700",
  Completed: "text-teal-700",
};

/* ---------- gradient avatar palette ---------- */
const AVATAR_GRADIENTS = [
  "from-[#800020] to-[#b30030]",
  "from-[#1C1917] to-[#44403c]",
  "from-[#7c2d12] to-[#b45309]",
  "from-[#15803D] to-[#22c55e]",
  "from-[#0e7490] to-[#06b6d4]",
  "from-[#7e22ce] to-[#a855f7]",
];

function avatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/* ---------- main view ---------- */

export default function Dashboard() {
  const { go } = useNav();
  const { isStaff, ownerLabel } = useRole();
  const staff = isStaff();

  const [insights, setInsights] = useState<string[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

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
      .filter(
        (o) => o.status !== "Completed" && o.status !== "Collected/Delivered"
      )
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

    const incomeSeries = monthlyBuckets(
      payments,
      (p) => p.date,
      (p) => Number(p.amount) || 0,
      6
    );
    const salesSeries = monthlyBuckets(
      orders,
      (o) => o.orderDate,
      (o) => Number(o.sellingPrice) || 0,
      6
    );
    const totalReceived6m = incomeSeries.reduce((s, x) => s + x.total, 0);

    const salesSpark = salesSeries.map((b) => b.total);
    const paymentsSpark = incomeSeries.map((b) => b.total);

    const prevMonthIdx = incomeSeries.length - 2;
    const prevReceived = prevMonthIdx >= 0 ? incomeSeries[prevMonthIdx].total : 0;
    const receivedTrend =
      receivedThisMonth > prevReceived
        ? "up"
        : receivedThisMonth < prevReceived && prevReceived > 0
        ? "down"
        : "flat";
    const receivedTrendLabel =
      prevReceived > 0
        ? `${Math.round(
            ((receivedThisMonth - prevReceived) / prevReceived) * 100
          )}% vs last mo`
        : "vs last mo";

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
      salesSpark,
      paymentsSpark,
      receivedTrend,
      receivedTrendLabel,
      totalReceived6m,
      attentionItems: attentionItems.slice(0, 6),
      orders,
      customers,
      upcomingFittingsCount: upcomingFittings.length,
    };
  }, [data]);

  /* ----- AI Trend Suggestions ----- */
  const generateInsights = async () => {
    if (!m) return;
    setInsightsLoading(true);
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
        orderCount: m.orders.length,
        totalSales: m.orders.reduce(
          (s, o) => s + (Number(o.sellingPrice) || 0),
          0
        ),
        outstanding: m.outstanding,
        statusBreakdown,
        paymentsThisMonth: m.receivedThisMonth,
        upcomingFittings: m.upcomingFittingsCount,
        customerSources,
      };
      const res = await apiPost<{ suggestions: string[] }>(
        "/api/insights/trends",
        payload
      );
      setInsights(res.suggestions || []);
      if (!res.suggestions || res.suggestions.length === 0) {
        toast("No suggestions returned — try again later.");
      } else {
        toast.success(`${res.suggestions.length} insights generated.`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate insights.";
      toast.error(msg);
    } finally {
      setInsightsLoading(false);
    }
  };

  /* ----- loading + error guards ----- */
  if (isLoading || !m) {
    return (
      <div className="p-5 md:p-8 max-w-[1400px] mx-auto w-full">
        <div className="mb-8">
          <div className="h-3 w-32 shimmer rounded mb-3" />
          <div className="h-9 w-72 shimmer rounded mb-3" />
          <div className="h-3 w-80 shimmer rounded" />
        </div>
        {!staff && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <SkeletonCard />
            <SkeletonList rows={3} />
          </div>
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-5 md:p-8 max-w-[1400px] mx-auto w-full">
        <SectionCard title="Could not load dashboard">
          <EmptyState
            icon={AlertCircle}
            title="Dashboard unavailable"
            description="We couldn't fetch the studio overview. Please refresh the page to try again."
            action={
              <PremiumButton
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Reload
              </PremiumButton>
            }
          />
        </SectionCard>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const healthPillClass =
    m.healthStatus === "On Track"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : m.healthStatus === "Needs Attention"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-[#800020]/10 text-[#800020] border-[#800020]/30";
  const healthDotClass =
    m.healthStatus === "On Track"
      ? "bg-emerald-500"
      : m.healthStatus === "Needs Attention"
      ? "bg-amber-500"
      : "bg-[#800020]";

  return (
    <div className="p-5 md:p-8 max-w-[1400px] mx-auto w-full">
      {/* ---------- PageHeader ---------- */}
      <PageHeader
        eyebrow={`Atelier overview · ${today}`}
        eyebrowIcon={CalendarDays}
        title={staff ? "Your Workbench" : `${ownerLabel}'s Atelier`}
        subtitle={
          staff
            ? "Your orders, fittings and tasks across the studio — keep production moving today."
            : "A snapshot of the studio today."
        }
        actions={
          <PremiumButton
            variant="primary"
            size="md"
            onClick={() => go("new-order")}
            className="hidden md:inline-flex"
          >
            <Plus className="w-4 h-4" />
            New Custom Order
          </PremiumButton>
        }
      />

      {/* ---------- Money row (Madam only) ---------- */}
      {!staff && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 animate-fade-in-up">
          <PremiumMetric
            label="Sales This Month"
            accent
            icon={TrendingUp}
            spark={m.salesSpark}
            sub={`${
              m.orders.filter((o) => sameMonth(o.orderDate, new Date())).length
            } orders booked`}
            value={<AnimatedNumber value={m.salesThisMonth} format="currency" />}
          />
          <PremiumMetric
            label="Money Received"
            accent
            icon={Wallet}
            spark={m.paymentsSpark}
            trend={m.receivedTrend as "up" | "down" | "flat"}
            trendLabel={m.receivedTrendLabel}
            sub="Payments collected this month"
            value={<AnimatedNumber value={m.receivedThisMonth} format="currency" />}
          />
          <PremiumMetric
            label="Outstanding"
            icon={AlertCircle}
            sub="From open orders"
            value={<AnimatedNumber value={m.outstanding} format="currency" />}
          />
          <PremiumMetric
            label="Estimated Profit"
            icon={Sparkles}
            sub="Sales − fabric − labour"
            value={<AnimatedNumber value={m.profit} format="currency" />}
          />
        </div>
      )}

      {/* ---------- Work + People grid ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Left 2/3 column — stack of section cards */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Active Orders */}
          <div className="animate-fade-in-up">
            <SectionCard
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
              bodyClassName="p-4"
            >
              {m.activeOrders.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No active orders right now"
                  description="Start one with New Custom Order to see it appear here."
                />
              ) : (
                <div
                  className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {m.activeOrders.slice(0, 10).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => go("order", { id: o.id })}
                      className="text-left shrink-0 w-60 rounded-lg border border-[#E7E5E4] p-4 lift hover:border-[#800020]/30 transition group bg-white"
                    >
                      <p className="text-sm font-medium text-[#1C1917] leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-[#800020]">
                        {o.garmentDesign || "Untitled garment"}
                      </p>
                      <p className="text-xs text-stone-400 mt-2">
                        Deliver {shortDate(o.deliveryDate)}
                      </p>
                      <div className="mt-3">
                        <StatusBadge status={o.status} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Status Pipeline */}
          <SectionCard title="Status Pipeline">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {m.statusCounts.map(({ status, count }) => (
                <div
                  key={status}
                  className="rounded-lg border border-[#E7E5E4] p-3 hover:border-[#800020]/20 transition bg-white"
                >
                  <div
                    className={`font-display text-2xl font-semibold leading-none tabular-nums ${
                      STATUS_CATEGORY_COLOR[status] || "text-stone-700"
                    }`}
                  >
                    {count}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1.5 leading-tight uppercase tracking-wide">
                    {status}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Upcoming Fittings */}
          <SectionCard
            title="Upcoming Fittings"
            action={
              <button
                onClick={() => go("fittings")}
                className="text-[11px] text-[#800020] font-medium hover:underline flex items-center gap-1"
              >
                All fittings
                <ChevronRight className="w-3 h-3" />
              </button>
            }
            bodyClassName="p-0"
          >
            {m.upcomingFittings.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No fittings scheduled"
                description="Add one from an order's detail page."
              />
            ) : (
              <div className="divide-y divide-[#E7E5E4]">
                {m.upcomingFittings.map((f) => {
                  const order = m.orders.find((o) => o.id === f.orderId);
                  return (
                    <button
                      key={f.id}
                      onClick={() => order && go("order", { id: order.id })}
                      className="flex items-center justify-between px-5 py-3.5 w-full text-left hover:bg-[#FBF9F7] transition group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1C1917] group-hover:text-[#800020] truncate">
                          {order?.garmentDesign?.slice(0, 48) || "Order fitting"}
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
          </SectionCard>
        </div>

        {/* Right 1/3 — Staff Workload / My Open Tasks */}
        <SectionCard
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
          bodyClassName={staff ? "p-5" : "p-0"}
        >
          {staff ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="font-display text-6xl font-semibold text-[#800020] leading-none">
                <AnimatedNumber value={m.openTasks.length} />
              </div>
              <p className="text-xs text-stone-400 mt-3">
                open tasks in the studio
              </p>
              <PremiumButton
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={() => go("tasks")}
              >
                Go to Tasks
                <ArrowRight className="w-3.5 h-3.5" />
              </PremiumButton>
            </div>
          ) : m.staffWorkload.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No team members yet"
              description="Add staff in Settings to see workload here."
            />
          ) : (
            <div className="divide-y divide-[#E7E5E4]">
              {m.staffWorkload.map(({ user, openTasks, activeOrders }) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FBF9F7] transition"
                >
                  <div
                    className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(
                      user.id || user.email || "?"
                    )} flex items-center justify-center text-xs font-semibold text-white shrink-0 shadow-sm`}
                  >
                    {(user.fullName || user.email || "?").charAt(0).toUpperCase()}
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
                    className="inline-flex items-center justify-center min-w-7 h-6 px-2 text-[11px] font-semibold text-white bg-[#800020] rounded-full"
                    title={`${openTasks} open task${openTasks !== 1 ? "s" : ""}`}
                  >
                    {openTasks}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ---------- Madam-only premium sections ---------- */}
      {!staff && (
        <>
          {/* Income Trend */}
          <div className="mb-4">
            <SectionCard
              title="Income Trend"
              action={
                <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  Last 6 months · Total{" "}
                  <span className="text-[#1C1917] font-semibold tabular-nums">
                    {formatCurrency(m.totalReceived6m)}
                  </span>
                </span>
              }
              bodyClassName="p-4"
            >
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={m.incomeSeries}
                    margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
                  >
                    <defs>
                      <linearGradient
                        id="burgundyGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
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
                        borderRadius: 8,
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
                      fill="url(#burgundyGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          {/* Business Health + Needs Attention */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <SectionCard title="Business Health">
              <div className="flex items-center gap-2.5 mb-5">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide border rounded-md ${healthPillClass}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${healthDotClass}`}
                  />
                  {m.healthStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <HealthMetric
                  icon={Coins}
                  label="Avg Margin / Order"
                  value={m.avgMargin}
                  format="currency"
                />
                <HealthMetric
                  icon={CircleDollarSign}
                  label="Outstanding"
                  value={m.outstanding}
                  format="currency"
                />
                <HealthMetric
                  icon={Timer}
                  label="Overdue Tasks"
                  value={m.overdueTaskCount}
                  format="plain"
                />
                <HealthMetric
                  icon={PackageCheck}
                  label="Ready for Collection"
                  value={m.readyOrders.length}
                  format="plain"
                />
              </div>
            </SectionCard>

            <SectionCard title="Needs Attention">
              <ul className="space-y-2">
                {m.attentionItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm p-2.5 -mx-2.5 rounded-md hover:bg-[#FBF9F7] transition lift"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-stone-700 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>

          {/* AI Trend Suggestions */}
          <div className="mb-4">
            <SectionCard
              title="AI Trend Suggestions"
              action={<Sparkles className="w-4 h-4 text-[#800020]" />}
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#800020]/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-[#800020]" />
                  </div>
                  <p className="text-sm text-stone-600 leading-snug flex-1">
                    Generate AI insights from your studio's recent orders,
                    payments and customer mix. Suggestions focus on cash flow,
                    status mix and where to focus next.
                  </p>
                  <PremiumButton
                    variant="outline"
                    size="md"
                    loading={insightsLoading}
                    onClick={generateInsights}
                  >
                    {insightsLoading ? "Generating…" : "Generate insights"}
                  </PremiumButton>
                </div>

                {insights && insights.length > 0 && (
                  <ul className="space-y-2.5 border-t border-[#E7E5E4] pt-4">
                    {insights.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm animate-fade-in-up"
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-emerald-700" />
                        </span>
                        <span className="text-stone-700 leading-snug">{s}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {insights && insights.length === 0 && (
                  <div className="border-t border-[#E7E5E4] pt-4">
                    <EmptyState
                      icon={Sparkles}
                      title="No suggestions returned"
                      description="The AI couldn't generate insights this time — try again in a moment."
                    />
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </>
      )}

      {/* ---------- Mobile floating New Order ---------- */}
      <button
        onClick={() => go("new-order")}
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-[#800020] text-white flex items-center justify-center shadow-lg hover:bg-[#6b0018] transition elevate-burgundy"
        aria-label="New Custom Order"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

/* ---------- inline premium mini-metric for Business Health ---------- */

function HealthMetric({
  icon: Icon,
  label,
  value,
  format,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  format: "currency" | "plain";
}) {
  return (
    <div className="rounded-lg border border-[#E7E5E4] p-3.5 bg-white hover:border-[#800020]/20 transition">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-stone-400" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
          {label}
        </span>
      </div>
      <div className="font-display font-semibold text-xl text-[#1C1917] tabular-nums">
        <AnimatedNumber value={value} format={format} />
      </div>
    </div>
  );
}
