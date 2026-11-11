"use client";

import { useEffect, useMemo, useState } from "react";
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
  GraduationCap,
  Scissors,
  MessageSquare,
  ShoppingBag,
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
  orderTrueCost,
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
  TrainingLog,
  CommunityPost,
} from "@/lib/types";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";
import { useAuth } from "@/stores/auth";
import { getPlanEntitlements } from "@/lib/plans";
import { GettingStartedDialog } from "@/components/atelier/GettingStartedDialog";

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

function orderCostTotal(order: Order, settings?: Settings | null) {
  return orderTrueCost(order, settings);
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
  Confirmed: "text-[#571A84]",
  "Deposit Paid": "text-[#571A84]",
  "In Production": "text-[#7A4568]",
  Fitting: "text-[#8A5A2B]",
  Alterations: "text-[#8A5A2B]",
  Ready: "text-[#4A6B53]",
  "Collected/Delivered": "text-[#4A6B53]",
  Completed: "text-[#4A6B53]",
};

/* ---------- gradient avatar palette ---------- */
const AVATAR_GRADIENTS = [
  "from-[#6A1FA0] to-[#6A1FA0]",
  "from-[#483E59] to-[#483E59]",
  "from-[#8a5a2b] to-[#8a5a2b]",
  "from-[#4d6b4a] to-[#4d6b4a]",
  "from-[#4F4560] to-[#4F4560]",
  "from-[#6b3f5e] to-[#6b3f5e]",
];

function avatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/* ---------- main view ---------- */

export default function Dashboard() {
  const { user } = useAuth();
  const { isTrainee } = useRole();

  // Trainee gets a focused apprenticeship dashboard.
  if (user && isTrainee()) {
    return <TraineeDashboard userId={user.id} />;
  }
  return <MainDashboard />;
}

function MainDashboard() {
  const { go } = useNav();
  const { user } = useAuth();
  const {
    ownerLabel,
    isStaff,
    isOwner,
    isTrainer,
    canCreateOrders,
  } = useRole();
  // The "workbench" view applies to staff, trainee-fallback (never reached
  // here because trainee returns early above) and trainers. Only the owner
  // (madam) sees the full atelier overview with money + business health.
  const staff = isStaff() || isTrainer();
  const owner = isOwner();
  const trainer = isTrainer();

  const [insights, setInsights] = useState<string[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => apiGet<DashboardData>("/api/dashboard"),
    retry: 1,
    refetchOnMount: true,
  });

  const m = useMemo(() => {
    if (!data) return null;
    const { orders, payments, fittings, tasks, users, customers, settings } = data;
    const now = new Date();
    const outstandingAlertThreshold = Number(settings?.outstandingBalanceAlertThreshold) || 2000;
    const staffCapacity = Math.max(1, Number(settings?.typicalActiveOrdersPerStaff) || 4);

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
      (s, o) => s + (Number(o.sellingPrice) || 0) - orderCostTotal(o, settings),
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

    const staffWorkload = (users || []).map((u) => {
      const activeOrders = orders.filter(
        (o) => o.assignedStaffId === u.id && ACTIVE.includes(o.status)
      ).length;
      return {
        user: u,
        openTasks: tasks.filter(
          (t) => t.staffId === u.id && t.status !== "Done"
        ).length,
        activeOrders,
        capacityPct: Math.min(100, Math.round((activeOrders / staffCapacity) * 100)),
        overCapacity: activeOrders > staffCapacity,
      };
    });

    const margins = orders.map(
      (o) => (Number(o.sellingPrice) || 0) - orderCostTotal(o, settings)
    );
    const avgMargin =
      margins.length > 0
        ? margins.reduce((a, b) => a + b, 0) / margins.length
        : 0;

    const healthStatus =
      outstanding > outstandingAlertThreshold || overdueTasks.length > 3
        ? "At Risk"
        : outstanding > outstandingAlertThreshold * 0.4 || overdueTasks.length > 0
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
    if (outstanding > outstandingAlertThreshold) {
      attentionItems.unshift(
        `Outstanding balance is ${formatCurrency(outstanding)} — above your ${formatCurrency(
          outstandingAlertThreshold
        )} alert threshold. Chase payments on open orders.`
      );
    }
    const overCapacityStaff = staffWorkload.filter((w) => w.overCapacity);
    if (overCapacityStaff.length > 0) {
      attentionItems.unshift(
        `${overCapacityStaff.length} staff member${
          overCapacityStaff.length > 1 ? "s are" : " is"
        } over typical capacity (${staffCapacity} active orders) — consider reassigning work.`
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
      outstandingAlertThreshold,
      outstandingOverThreshold: outstanding > outstandingAlertThreshold,
      staffCapacity,
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

  /* ----- Getting started pop-up (trial plan only) ----- */
  const [gettingStartedOpen, setGettingStartedOpen] = useState(false);
  const shop = user?.shop;
  const shopId = shop?.id;
  const onActiveTrial =
    !!shop &&
    shop.plan === "trial" &&
    !getPlanEntitlements(shop.plan, shop.trial_ends_at).trialExpired;
  const ordersCount = m?.orders.length;
  useEffect(() => {
    if (!owner || !onActiveTrial || !shopId || ordersCount !== 0) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(`getting-started-dismissed:${shopId}`) === "1";
    } catch {
      /* storage unavailable: show it */
    }
    if (!dismissed) setGettingStartedOpen(true);
  }, [owner, onActiveTrial, shopId, ordersCount]);
  const handleGettingStartedChange = (open: boolean) => {
    setGettingStartedOpen(open);
    if (!open && shopId) {
      try {
        localStorage.setItem(`getting-started-dismissed:${shopId}`, "1");
      } catch {
        /* ignore */
      }
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
        <div className="grid grid-cols-1 xl:grid-cols-3 xl:items-start gap-4">
          <div className="xl:col-span-2 flex flex-col gap-4">
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
      : "bg-[#6A1FA0]/10 text-[#6A1FA0] border-[#6A1FA0]/30";
  const healthDotClass =
    m.healthStatus === "On Track"
      ? "bg-emerald-500"
      : m.healthStatus === "Needs Attention"
      ? "bg-amber-500"
      : "bg-[#6A1FA0]";

  return (
    <div className="p-5 md:p-8 max-w-[1400px] mx-auto w-full">
      {/* ---------- PageHeader ---------- */}
      <PageHeader
        eyebrow={`Atelier overview · ${today}`}
        eyebrowIcon={CalendarDays}
        title={
          owner
            ? `${ownerLabel}'s Atelier`
            : trainer
            ? "Mentor's Workbench"
            : "Your Workbench"
        }
        subtitle={
          owner
            ? "A snapshot of the studio today."
            : trainer
            ? "Your trainees, fittings and orders across the atelier."
            : "Your orders, fittings and tasks across the studio — keep production moving today."
        }
        actions={
          canCreateOrders() ? (
            <PremiumButton
              variant="primary"
              size="md"
              onClick={() => go(m.customers.length > 0 ? "new-order" : "customers")}
            >
              <Plus className="w-4 h-4" />
              {m.customers.length > 0 ? "Create an order" : "Add a customer"}
            </PremiumButton>
          ) : undefined
        }
      />

      <GettingStartedDialog
        open={gettingStartedOpen}
        onOpenChange={handleGettingStartedChange}
        hasCustomers={m.customers.length > 0}
        onStart={() => {
          handleGettingStartedChange(false);
          go(m.customers.length > 0 ? "new-order" : "customers");
        }}
      />

      {/* ---------- Money row (Madam only) ---------- */}
      {!staff && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 animate-fade-in-up">
          <PremiumMetric
            label="Sales This Month"
            tone="violet"
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
            tone="green"
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
            tone="amber"
            icon={AlertCircle}
            accent={m.outstandingOverThreshold}
            sub={
              m.outstandingOverThreshold
                ? `Above your ${formatCurrency(m.outstandingAlertThreshold)} alert threshold`
                : "From open orders"
            }
            value={<AnimatedNumber value={m.outstanding} format="currency" />}
          />
          <PremiumMetric
            label="Estimated Profit"
            tone="blue"
            icon={Sparkles}
            sub="Sales − fabric − labour − overhead"
            value={<AnimatedNumber value={m.profit} format="currency" />}
          />
        </div>
      )}

      {/* ---------- Work + People grid ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 xl:items-start gap-4 mb-4">
        {/* Left 2/3 column — stack of section cards */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Active Orders */}
          <div className="animate-fade-in-up">
            <SectionCard
              title="Active Orders"
              action={
                <button
                  onClick={() => go("orders")}
                  className="text-[11px] text-[#6A1FA0] font-medium hover:underline flex items-center gap-1"
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
                  description="When you create an order for a customer, its progress will appear here."
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
                      className="text-left shrink-0 w-60 rounded-lg border border-[#E6DFEE] p-4 lift hover:border-[#6A1FA0]/30 transition group bg-white"
                    >
                      <p className="text-sm font-medium text-[#1F1430] leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-[#6A1FA0]">
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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-2.5">
              {m.statusCounts.map(({ status, count }) => (
                <div
                  key={status}
                  className="rounded-lg border border-[#E6DFEE] px-3.5 py-3 hover:border-[#6A1FA0]/30 transition-colors bg-[#FFFFFF]"
                >
                  <div
                    className={`font-display text-2xl font-semibold leading-none tabular-nums ${
                      STATUS_CATEGORY_COLOR[status] || "text-stone-700"
                    }`}
                  >
                    {count}
                  </div>
                  <div className="text-[12px] text-stone-500 mt-2 leading-tight break-words">
                    {status.replace("/", "/\u200b")}
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
                className="text-[11px] text-[#6A1FA0] font-medium hover:underline flex items-center gap-1"
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
              <div className="divide-y divide-[#E6DFEE]">
                {m.upcomingFittings.map((f) => {
                  const order = m.orders.find((o) => o.id === f.orderId);
                  return (
                    <button
                      key={f.id}
                      onClick={() => order && go("order", { id: order.id })}
                      className="flex items-center justify-between px-5 py-3.5 w-full text-left hover:bg-[#F6EFFB] transition group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1F1430] group-hover:text-[#6A1FA0] truncate">
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

        {/* Right 1/3 — Staff Workload / My Open Tasks / My Trainees (trainer) */}
        {trainer ? (
          <TrainerTraineesCard users={m.staffWorkload.map((w) => w.user)} />
        ) : (
        <SectionCard
          title={staff ? "My Open Tasks" : "Staff Workload"}
          action={
            <button
              onClick={() => go("tasks")}
              className="text-[11px] text-[#6A1FA0] font-medium hover:underline flex items-center gap-1"
            >
              {staff ? "Open" : "All tasks"}
              <ChevronRight className="w-3 h-3" />
            </button>
          }
          bodyClassName={staff ? "p-5" : "p-0"}
        >
          {staff ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="font-display text-6xl font-semibold text-[#6A1FA0] leading-none">
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
            <div className="divide-y divide-[#E6DFEE]">
              {m.staffWorkload.map(({ user, openTasks, activeOrders, capacityPct, overCapacity }) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F6EFFB] transition"
                >
                  <div
                    className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(
                      user.id || user.email || "?"
                    )} flex items-center justify-center text-xs font-semibold text-white shrink-0 shadow-sm`}
                  >
                    {(user.fullName || user.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1F1430] truncate">
                      {user.fullName || user.email}
                    </p>
                    <p
                      className={`text-[11px] ${
                        overCapacity ? "text-[#8E3232] font-medium" : "text-stone-400"
                      }`}
                    >
                      {activeOrders} active order{activeOrders !== 1 ? "s" : ""}
                      {overCapacity ? " — over capacity" : ""}
                    </p>
                    <div className="mt-1.5 h-1 w-full max-w-[140px] rounded-full bg-[#E6DFEE] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          overCapacity ? "bg-[#8E3232]" : "bg-[#6A1FA0]"
                        }`}
                        style={{ width: `${Math.max(4, capacityPct)}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center justify-center min-w-7 h-6 px-2 text-[11px] font-semibold text-white bg-[#6A1FA0] rounded-full"
                    title={`${openTasks} open task${openTasks !== 1 ? "s" : ""}`}
                  >
                    {openTasks}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        )}
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
                  <span className="text-[#1F1430] font-semibold tabular-nums">
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
                          stopColor="#6A1FA0"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#6A1FA0"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#E6DFEE"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#7B6F8C" }}
                      axisLine={{ stroke: "#E6DFEE" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#7B6F8C" }}
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
                        border: "1px solid #E6DFEE",
                        borderRadius: 8,
                        fontSize: 12,
                        background: "#FFFFFF",
                      }}
                      labelStyle={{ color: "#1F1430", fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#6A1FA0"
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
                    className="flex items-start gap-2.5 text-sm p-2.5 -mx-2.5 rounded-md hover:bg-[#F6EFFB] transition lift"
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
              action={<Sparkles className="w-4 h-4 text-[#6A1FA0]" />}
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#6A1FA0]/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-[#6A1FA0]" />
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
                  <ul className="space-y-2.5 border-t border-[#E6DFEE] pt-4">
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
                  <div className="border-t border-[#E6DFEE] pt-4">
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
      {canCreateOrders() && (
        <button
          onClick={() => go("new-order")}
          className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-[#6A1FA0] text-white flex items-center justify-center shadow-lg hover:bg-[#571A84] transition"
          aria-label="New Custom Order"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
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
    <div className="rounded-lg border border-[#E6DFEE] p-3.5 bg-white hover:border-[#6A1FA0]/20 transition">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-stone-400" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
          {label}
        </span>
      </div>
      <div className="font-display font-semibold text-xl text-[#1F1430] tabular-nums">
        <AnimatedNumber value={value} format={format} />
      </div>
    </div>
  );
}

/* ---------- trainer right-column: My Trainees summary ---------- */

function TrainerTraineesCard({ users }: { users: User[] }) {
  const { go } = useNav();
  const trainees = useMemo(
    () =>
      users
        .filter((u) => u.role === "trainee")
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [users]
  );

  const logsQ = useQuery<TrainingLog[]>({
    queryKey: ["training-logs"],
    queryFn: () => apiGet<TrainingLog[]>("/api/training-logs"),
  });

  const perTrainee = useMemo(() => {
    const map = new Map<
      string,
      { total: number; proficient: number; practicing: number; learning: number }
    >();
    for (const log of logsQ.data ?? []) {
      const tid = log.traineeId;
      if (!tid) continue;
      const entry = map.get(tid) ?? {
        total: 0,
        proficient: 0,
        practicing: 0,
        learning: 0,
      };
      entry.total++;
      if (log.status === "Proficient") entry.proficient++;
      else if (log.status === "Practicing") entry.practicing++;
      else if (log.status === "Learning") entry.learning++;
      map.set(tid, entry);
    }
    return map;
  }, [logsQ.data]);

  return (
    <SectionCard
      title="My Trainees"
      action={
        <button
          onClick={() => go("progress")}
          className="text-[11px] text-[#6A1FA0] font-medium hover:underline flex items-center gap-1"
        >
          All trainees
          <ChevronRight className="w-3 h-3" />
        </button>
      }
      bodyClassName="p-0"
    >
      {trainees.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No trainees yet"
          description="Add trainees from the Team view to follow their progress."
        />
      ) : (
        <div className="divide-y divide-[#E6DFEE]">
          {trainees.map((t) => {
            const stats = perTrainee.get(t.id) ?? {
              total: 0,
              proficient: 0,
              practicing: 0,
              learning: 0,
            };
            return (
              <button
                key={t.id}
                onClick={() => go("progress", { id: t.id })}
                className="flex items-center gap-3 px-5 py-3.5 w-full text-left hover:bg-[#F6EFFB] transition group"
              >
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(
                    t.id || t.email || "?"
                  )} flex items-center justify-center text-xs font-semibold text-white shrink-0 shadow-sm`}
                >
                  {(t.fullName || t.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1F1430] truncate group-hover:text-[#6A1FA0] transition-colors">
                    {t.fullName || t.email}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    {stats.total === 0
                      ? "No logs yet"
                      : `${stats.total} log${stats.total !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {stats.proficient > 0 && (
                    <span className="inline-flex items-center justify-center min-w-6 h-5 px-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full tabular-nums">
                      {stats.proficient}P
                    </span>
                  )}
                  {stats.practicing > 0 && (
                    <span className="inline-flex items-center justify-center min-w-6 h-5 px-1.5 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-full tabular-nums">
                      {stats.practicing}p
                    </span>
                  )}
                  {stats.learning > 0 && (
                    <span className="inline-flex items-center justify-center min-w-6 h-5 px-1.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full tabular-nums">
                      {stats.learning}L
                    </span>
                  )}
                  {stats.total === 0 && (
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-[#6A1FA0] transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

/* ---------- trainee apprenticeship dashboard ---------- */

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function TraineeDashboard({ userId }: { userId: string }) {
  const { go } = useNav();

  const tasksQ = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => apiGet<Task[]>("/api/tasks"),
  });
  const logsQ = useQuery<TrainingLog[]>({
    queryKey: ["training-logs", userId],
    queryFn: () =>
      apiGet<TrainingLog[]>(`/api/training-logs?traineeId=${userId}`),
  });
  const ordersQ = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/api/orders"),
  });
  const communityQ = useQuery<CommunityPost[]>({
    queryKey: ["community"],
    queryFn: () => apiGet<CommunityPost[]>("/api/community"),
  });

  const myOpenTasks = useMemo(
    () =>
      (tasksQ.data ?? [])
        .filter((t) => t.staffId === userId && t.status !== "Done")
        .sort((a, b) => {
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return ad - bd;
        }),
    [tasksQ.data, userId]
  );

  const myOrders = useMemo(
    () =>
      (ordersQ.data ?? [])
        .filter((o) => o.assignedStaffId === userId)
        .sort(
          (a, b) =>
            new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
        )
        .slice(0, 5),
    [ordersQ.data, userId]
  );

  const skills = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        latest: TrainingLog | null;
        proficient: number;
        practicing: number;
        learning: number;
      }
    >();
    for (const log of logsQ.data ?? []) {
      const skill = log.skill?.trim() || "General";
      const entry = map.get(skill) ?? {
        count: 0,
        latest: null as TrainingLog | null,
        proficient: 0,
        practicing: 0,
        learning: 0,
      };
      entry.count++;
      if (log.status === "Proficient") entry.proficient++;
      else if (log.status === "Practicing") entry.practicing++;
      else if (log.status === "Learning") entry.learning++;
      if (
        !entry.latest ||
        new Date(log.date).getTime() > new Date(entry.latest.date).getTime()
      ) {
        entry.latest = log;
      }
      map.set(skill, entry);
    }
    return Array.from(map.entries())
      .map(([skill, data]) => ({ skill, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [logsQ.data]);

  const recentPosts = useMemo(
    () => (communityQ.data ?? []).slice(0, 2),
    [communityQ.data]
  );

  const loading =
    tasksQ.isLoading || logsQ.isLoading || ordersQ.isLoading;

  if (loading) {
    return (
      <div className="p-5 md:p-8 max-w-[1400px] mx-auto w-full">
        <div className="mb-8">
          <div className="h-3 w-32 shimmer rounded mb-3" />
          <div className="h-9 w-72 shimmer rounded mb-3" />
          <div className="h-3 w-80 shimmer rounded" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 xl:items-start gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="mt-4">
          <SkeletonList rows={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-[1400px] mx-auto w-full">
      <PageHeader
        eyebrow="My apprenticeship"
        eyebrowIcon={GraduationCap}
        title="My Workbench"
        subtitle="Your tasks, training and assigned work at the atelier — keep honing your craft today."
      />

      {/* Hero metric — My Open Tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-3 xl:items-start gap-4 mb-4">
        <div className="xl:col-span-1 animate-fade-in-up">
          <PremiumMetric
            label="My Open Tasks"
            accent
            icon={ClipboardList}
            sub={
              myOpenTasks.length === 0
                ? "All caught up — nice work."
                : "Tasks assigned to you in the studio"
            }
            value={<AnimatedNumber value={myOpenTasks.length} />}
          />
          <PremiumButton
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => go("tasks")}
          >
            Go to Tasks
            <ArrowRight className="w-3.5 h-3.5" />
          </PremiumButton>
        </div>

        {/* My Training Progress */}
        <div className="xl:col-span-2">
          <SectionCard
            title="My Training Progress"
            action={
              <button
                onClick={() => go("progress")}
                className="text-[11px] text-[#6A1FA0] font-medium hover:underline flex items-center gap-1"
              >
                View progress
                <ChevronRight className="w-3 h-3" />
              </button>
            }
            bodyClassName="p-0"
          >
            {skills.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No training logs yet"
                description="Log your first learning from the Progress view to start tracking your skills."
                action={
                  <PremiumButton
                    variant="outline"
                    size="sm"
                    onClick={() => go("progress")}
                  >
                    Go to Progress
                  </PremiumButton>
                }
              />
            ) : (
              <div className="divide-y divide-[#E6DFEE]/70">
                {skills.slice(0, 5).map((s) => (
                  <div
                    key={s.skill}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <div className="w-8 h-8 rounded-md bg-[#6A1FA0]/8 border border-[#6A1FA0]/15 flex items-center justify-center shrink-0">
                      <Scissors className="w-3.5 h-3.5 text-[#6A1FA0]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#1F1430] truncate">
                        {s.skill}
                      </div>
                      <div className="text-[11px] text-stone-400 tabular-nums">
                        {s.count} {s.count === 1 ? "entry" : "entries"}
                        {s.proficient > 0 && ` · ${s.proficient} proficient`}
                      </div>
                    </div>
                    {s.latest && (
                      <StatusBadge status={s.latest.status} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* My Assigned Orders + Recent Community */}
      <div className="grid grid-cols-1 xl:grid-cols-3 xl:items-start gap-4">
        {/* My Assigned Orders (NO prices) */}
        <div className="xl:col-span-2">
          <SectionCard
            title="My Assigned Orders"
            action={
              <button
                onClick={() => go("orders")}
                className="text-[11px] text-[#6A1FA0] font-medium hover:underline flex items-center gap-1"
              >
                All orders
                <ChevronRight className="w-3 h-3" />
              </button>
            }
            bodyClassName="p-0"
          >
            {myOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No orders assigned yet"
                description="When the studio assigns you a garment, it'll appear here for you to follow."
              />
            ) : (
              <div className="divide-y divide-[#E6DFEE]/70">
                {myOrders.map((o) => {
                  const overdue = !!o.deliveryDate && isOverdue(o.deliveryDate);
                  return (
                    <button
                      key={o.id}
                      onClick={() => go("order", { id: o.id })}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-[#F6EFFB] transition group"
                    >
                      <div className="w-11 h-11 rounded-md overflow-hidden bg-[#F6EFFB] border border-[#E6DFEE] flex items-center justify-center shrink-0">
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
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#1F1430] truncate group-hover:text-[#6A1FA0] transition-colors">
                          {o.garmentDesign || "Untitled garment"}
                        </div>
                        <div className="text-[11px] text-stone-400 truncate">
                          {o.customer?.name || "—"}
                          {o.deliveryDate
                            ? ` · due ${shortDate(o.deliveryDate)}`
                            : ""}
                          {overdue && (
                            <span className="text-amber-700 font-medium">
                              {" "}
                              · overdue
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={o.status} />
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Recent Community teaser */}
        <div>
          <SectionCard
            title="Recent Community"
            action={
              <button
                onClick={() => go("community")}
                className="text-[11px] text-[#6A1FA0] font-medium hover:underline flex items-center gap-1"
              >
                Wall
                <ChevronRight className="w-3 h-3" />
              </button>
            }
            bodyClassName="p-0"
          >
            {recentPosts.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No posts yet"
                description="Share an update or question on the studio wall."
                action={
                  <PremiumButton
                    variant="outline"
                    size="sm"
                    onClick={() => go("community")}
                  >
                    Open Community
                  </PremiumButton>
                }
              />
            ) : (
              <div className="divide-y divide-[#E6DFEE]/70">
                {recentPosts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => go("community")}
                    className="w-full text-left px-5 py-3.5 hover:bg-[#F6EFFB] transition group"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-full bg-[#6A1FA0] flex items-center justify-center text-[10px] font-semibold text-white shrink-0">
                        {(p.authorName || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[11px] text-stone-500 truncate">
                        {p.authorName}
                      </span>
                      <span className="text-[10px] text-stone-400 ml-auto shrink-0">
                        {timeAgo(p.createdAt)}
                      </span>
                    </div>
                    {p.title && (
                      <div className="text-sm font-medium text-[#1F1430] truncate group-hover:text-[#6A1FA0] transition-colors">
                        {p.title}
                      </div>
                    )}
                    <p className="text-[12px] text-stone-500 line-clamp-2 mt-0.5">
                      {p.body}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
