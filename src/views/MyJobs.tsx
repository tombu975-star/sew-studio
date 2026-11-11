"use client";

/**
 * MyJobs — the freelancer's view of orders + tasks assigned to them.
 *
 * Freelancer only (nav gates). Filters GET /api/orders to assignedStaffId ===
 * user.id and GET /api/tasks to staffId === user.id, then renders three
 * sections: Active Jobs, Open Tasks, Completed Work.
 *
 * Premium primitives: PageHeader, SectionCard, PremiumMetric, AnimatedNumber,
 * EmptyState + SkeletonList/SkeletonCard, PremiumButton, StatusBadge.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Scissors,
  CalendarDays,
  CheckCircle2,
  Image as ImageIcon,
  AlertCircle,
  ListTodo,
  Sparkles,
} from "lucide-react";

import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumMetric } from "@/components/atelier/PremiumMetric";
import { AnimatedNumber } from "@/components/atelier/AnimatedNumber";
import {
  EmptyState,
  SkeletonCard,
  SkeletonList,
} from "@/components/atelier/EmptyState";
import { StatusBadge } from "@/components/atelier/StatusBadge";

import { apiGet } from "@/lib/api";
import { ACTIVE_STATUSES, isOverdue, shortDate } from "@/lib/format";
import type { Order, Task } from "@/lib/types";
import { useAuth } from "@/stores/auth";
import { useNav } from "@/stores/nav";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// The freelancer-facing API deliberately returns a slimmer embed than the
// full Order/Task shape (see /api/orders, /api/tasks) — `extends` would
// require `customer`/`order` to still satisfy the full Customer/Order type,
// which this narrower shape doesn't, so we override the field via Omit
// instead of widening the shared type for every other caller.
type OrderWithCustomer = Omit<Order, "customer"> & {
  customer?: { id: string; name: string } | null;
};

type TaskWithOrder = Omit<Task, "order"> & {
  order?: { id: string; garmentDesign: string } | null;
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export default function MyJobs() {
  const { user } = useAuth();
  const go = useNav((s) => s.go);
  const userId = user?.id ?? "";

  const { data: orders = [], isLoading: ordersLoading } = useQuery<
    OrderWithCustomer[]
  >({
    queryKey: ["orders"],
    queryFn: () => apiGet<OrderWithCustomer[]>("/api/orders"),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<
    TaskWithOrder[]
  >({
    queryKey: ["tasks"],
    queryFn: () => apiGet<TaskWithOrder[]>("/api/tasks"),
  });

  // ----- Scoped to this freelancer -----------------------------------------
  const myOrders = useMemo(
    () => orders.filter((o) => o.assignedStaffId === userId),
    [orders, userId]
  );
  const myTasks = useMemo(
    () => tasks.filter((t) => t.staffId === userId),
    [tasks, userId]
  );

  const activeJobs = useMemo(
    () =>
      myOrders.filter((o) =>
        (ACTIVE_STATUSES as readonly string[]).includes(o.status)
      ),
    [myOrders]
  );
  const completedWork = useMemo(
    () =>
      myOrders.filter(
        (o) => o.status === "Completed" || o.status === "Collected/Delivered"
      ),
    [myOrders]
  );
  const openTasks = useMemo(
    () => myTasks.filter((t) => t.status !== "Done"),
    [myTasks]
  );

  const stats = {
    active: activeJobs.length,
    completed: completedWork.length,
    openTasks: openTasks.length,
  };

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto w-full">
      <PageHeader
        eyebrow="My commissions"
        eyebrowIcon={Briefcase}
        title="My Jobs"
        subtitle="Orders the studio has assigned to you."
      />

      {/* Premium stat strip */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6">
        <PremiumMetric
          label="Active jobs"
          value={<AnimatedNumber value={stats.active} />}
          icon={Briefcase}
          accent
        />
        <PremiumMetric
          label="Completed"
          value={<AnimatedNumber value={stats.completed} />}
          icon={CheckCircle2}
        />
        <PremiumMetric
          label="Open tasks"
          value={<AnimatedNumber value={stats.openTasks} />}
          icon={ListTodo}
        />
      </div>

      {/* Active Jobs */}
      <SectionCard
        title={`Active jobs · ${activeJobs.length}`}
        className="mb-6"
        action={
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
            Tap to open
          </span>
        }
      >
        {ordersLoading ? (
          <SkeletonList rows={3} />
        ) : activeJobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No active jobs."
            description="Orders the studio assigns to you will appear here with their delivery dates."
          />
        ) : (
          <ul className="divide-y divide-[#EEDFE3]/70">
            {activeJobs.map((order) => (
              <ActiveJobRow
                key={order.id}
                order={order}
                onClick={() => go("order", { id: order.id })}
              />
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Open Tasks */}
      <SectionCard
        title={`Open tasks · ${openTasks.length}`}
        className="mb-6"
      >
        {tasksLoading ? (
          <SkeletonList rows={3} />
        ) : openTasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="No open tasks."
            description="Tasks the studio assigns to you will appear here with their due dates."
          />
        ) : (
          <ul className="divide-y divide-[#EEDFE3]/70">
            {openTasks.map((task) => (
              <OpenTaskRow key={task.id} task={task} />
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Completed Work */}
      <SectionCard title={`Completed work · ${completedWork.length}`}>
        {ordersLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : completedWork.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No completed work yet."
            description="Finished commissions will collect here as a mini portfolio of your atelier output."
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {completedWork.map((order) => (
              <CompletedCard
                key={order.id}
                order={order}
                onClick={() => go("order", { id: order.id })}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DesignThumb({
  src,
  alt,
  size = "md",
}: {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-12 h-12" : "w-full aspect-[4/5]";
  if (src) {
    return (
      <img
        src={src}
        alt={alt || ""}
        className={cn(
          dim,
          "rounded-lg object-cover border border-[#EEDFE3] shrink-0 bg-[#FCF8F9]"
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        dim,
        "rounded-lg bg-gradient-to-br from-[#FCF8F9] to-[#F7EFF1] border border-[#EEDFE3] flex items-center justify-center shrink-0"
      )}
    >
      <Scissors className="w-4 h-4 text-stone-400" />
    </div>
  );
}

function ActiveJobRow({
  order,
  onClick,
}: {
  order: OrderWithCustomer;
  onClick: () => void;
}) {
  const overdue =
    order.deliveryDate && isOverdue(order.deliveryDate) && order.status !== "Ready";
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-4 py-3.5 px-1 hover:bg-[#FAF0F2]/60 rounded-md transition-colors text-left group"
      >
        <DesignThumb src={order.designImage} alt={order.garmentDesign} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#2F151B] truncate group-hover:text-[#800020] transition-colors">
            {order.garmentDesign}
          </p>
          <p className="text-xs text-stone-500 mt-0.5 truncate">
            {order.customer?.name || "Unassigned customer"}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={order.status} />
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px]",
                overdue ? "text-amber-700 font-medium" : "text-stone-500"
              )}
            >
              {overdue ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <CalendarDays className="w-3 h-3" />
              )}
              {order.deliveryDate ? shortDate(order.deliveryDate) : "No due date"}
            </span>
          </div>
        </div>
        <Briefcase className="w-4 h-4 text-stone-300 group-hover:text-[#800020] transition-colors shrink-0" />
      </button>
    </li>
  );
}

function OpenTaskRow({ task }: { task: TaskWithOrder }) {
  const overdue = task.dueDate && isOverdue(task.dueDate) && task.status !== "Done";
  return (
    <li className="py-3.5 px-1 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-[#FAF0F2] border border-[#EEDFE3] flex items-center justify-center shrink-0">
        <ListTodo className="w-4 h-4 text-stone-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#2F151B] truncate">
          {task.title}
        </p>
        {task.order && (
          <p className="text-xs text-stone-400 mt-0.5 truncate">
            → {task.order.garmentDesign}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={task.priority} />
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px]",
            overdue ? "text-amber-700 font-medium" : "text-stone-500"
          )}
        >
          {overdue ? (
            <AlertCircle className="w-3 h-3" />
          ) : (
            <CalendarDays className="w-3 h-3" />
          )}
          {task.dueDate ? shortDate(task.dueDate) : "No due date"}
        </span>
      </div>
    </li>
  );
}

function CompletedCard({
  order,
  onClick,
}: {
  order: OrderWithCustomer;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg border border-[#EEDFE3] surface-premium elevate-sm lift overflow-hidden group"
    >
      <div className="aspect-[4/5] bg-[#FCF8F9] overflow-hidden">
        {order.designImage ? (
          <img
            src={order.designImage}
            alt={order.garmentDesign}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#FCF8F9] to-[#F7EFF1] flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-stone-300" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-[#2F151B] truncate group-hover:text-[#800020] transition-colors">
          {order.garmentDesign}
        </p>
        <p className="text-xs text-stone-500 mt-0.5 truncate">
          {order.customer?.name || "—"}
        </p>
        <div className="flex items-center justify-between gap-2 mt-2">
          <StatusBadge status={order.status} />
          <span className="inline-flex items-center gap-1 text-[10px] text-stone-400 tabular-nums">
            <CalendarDays className="w-3 h-3" />
            {order.deliveryDate ? shortDate(order.deliveryDate) : "—"}
          </span>
        </div>
      </div>
    </button>
  );
}
