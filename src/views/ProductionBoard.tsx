"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { LayoutGrid, AlertCircle, GripVertical, Scissors, ClipboardCheck, Clock3, CheckCircle2 } from "lucide-react";

import { apiGet, apiPatch } from "@/lib/api";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";
import { formatCurrency, shortDate, isOverdue } from "@/lib/format";
import type { Order, User } from "@/lib/types";

import { PageHeader } from "@/components/atelier/PageHeader";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { EmptyState } from "@/components/atelier/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ColumnDef = {
  key: string;
  title: string;
  statuses: string[];
};

const BOARD_COLUMNS: ColumnDef[] = [
  { key: "consultation", title: "Consultation", statuses: ["Enquiry", "Quoted", "Consultation"] },
  { key: "confirmed", title: "Confirmed", statuses: ["Confirmed", "Deposit Paid"] },
  { key: "production", title: "In Production", statuses: ["In Production"] },
  { key: "fitting", title: "Fitting & Alterations", statuses: ["Fitting", "Alterations"] },
  { key: "ready", title: "Ready", statuses: ["Ready"] },
  { key: "done", title: "Delivered & Done", statuses: ["Collected/Delivered", "Completed"] },
];

const AVATAR_GRADIENTS = [
  "from-[#800020] to-[#800020]",
  "from-[#5F464C] to-[#5F464C]",
  "from-[#4d6b4a] to-[#4d6b4a]",
  "from-[#8a5a2b] to-[#8a5a2b]",
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

export default function ProductionBoard() {
  const { go } = useNav();
  const qc = useQueryClient();
  const { canSeeBusiness } = useRole();
  // Owner + trainer oversee the whole shop and can filter by staff member.
  // Everyone else only ever gets their own (+ unassigned) orders back from
  // the API — that's enforced server-side, so there's nothing to filter
  // client-side, and nothing here needs to wait on auth to hydrate.
  const canFilterByStaff = canSeeBusiness();
  const [staffFilter, setStaffFilter] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const {
    data: orders,
    isLoading,
    isError: ordersError,
    error: ordersErrorValue,
    refetch: refetchOrders,
  } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/api/orders"),
  });
  const { data: users } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiGet<User[]>("/api/users"),
  });

  // Filter + group orders into columns
  const columns = useMemo(() => {
    const list = (orders || [])
      .filter((o) => staffFilter === "all" || o.assignedStaffId === staffFilter)
      .map((o) => ({
        ...o,
        paid:
          o.payments?.reduce(
            (sum, p) => sum + (Number(p.amount) || 0),
            0
          ) ?? 0,
      }));
    return BOARD_COLUMNS.map((col) => ({
      ...col,
      cards: list
        .filter((o) => col.statuses.includes(o.status))
        .sort((a, b) => {
          const ad = a.deliveryDate || "9999-12-31";
          const bd = b.deliveryDate || "9999-12-31";
          return ad.localeCompare(bd);
        }),
    }));
  }, [orders, staffFilter]);

  const flatOrders = useMemo(() => {
    const map = new Map<string, Order & { paid?: number }>();
    (orders || [])
      .map((o) => ({
        ...o,
        paid:
          o.payments?.reduce(
            (sum, p) => sum + (Number(p.amount) || 0),
            0
          ) ?? 0,
      }))
      .forEach((o) => map.set(o.id, o));
    return map;
  }, [orders]);

  // Drag → PATCH status
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch<Order>(`/api/orders/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["orders"] });
      const prev = qc.getQueryData<Order[]>(["orders"]);
      if (prev) {
        qc.setQueryData<Order[]>(
          ["orders"],
          prev.map((o) =>
            o.id === id ? { ...o, status: status as Order["status"] } : o
          )
        );
      }
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["orders"], ctx.prev);
      toast.error(e.message);
    },
    onSuccess: (_updated, variables) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order"] });
      const destination = BOARD_COLUMNS.find((column) =>
        column.statuses.includes(variables.status)
      );
      toast.success(destination ? `Moved to ${destination.title}` : "Order updated");
    },
  });

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const orderId = String(active.id);
    const targetKey = String(over.id);
    const col = BOARD_COLUMNS.find((c) => c.key === targetKey);
    if (!col) return;
    const order = flatOrders.get(orderId);
    if (!order) return;
    if (col.statuses.includes(order.status)) return; // already in this column
    const newStatus = col.statuses[0];
    statusMut.mutate({ id: orderId, status: newStatus });
  }

  const activeOrder = activeId ? flatOrders.get(activeId) : null;

  return (
    <div className="p-5 md:p-8 w-full">
      <PageHeader
        eyebrow="Live workflow"
        eyebrowIcon={LayoutGrid}
        title="Production Board"
        subtitle={
          canFilterByStaff
            ? "Every order by stage — drag to move."
            : "Your assigned orders by stage — drag to move."
        }
        actions={
          canFilterByStaff ? (
            <div className="w-full md:w-56">
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="rounded-md w-full bg-white">
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
          ) : undefined
        }
      />

      {/* Operational snapshot */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-[#EEDFE3] bg-white p-3.5 shadow-[0_2px_10px_rgba(53,18,29,.03)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#F8EDF0] text-[#800020]"><ClipboardCheck className="size-5"/></span>
          <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-stone-500">Active orders</p><p className="mt-0.5 text-xl font-semibold tabular-nums text-[#35121D]">{(orders || []).filter((o) => !["Collected/Delivered", "Completed"].includes(o.status)).length}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#EEDFE3] bg-white p-3.5 shadow-[0_2px_10px_rgba(53,18,29,.03)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700"><Clock3 className="size-5"/></span>
          <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-stone-500">Due soon</p><p className="mt-0.5 text-xl font-semibold tabular-nums text-[#35121D]">{(orders || []).filter((o) => o.deliveryDate && new Date(o.deliveryDate).getTime() >= Date.now() && new Date(o.deliveryDate).getTime() <= Date.now() + 7 * 86400000 && !["Collected/Delivered", "Completed"].includes(o.status)).length}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#EEDFE3] bg-white p-3.5 shadow-[0_2px_10px_rgba(53,18,29,.03)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700"><AlertCircle className="size-5"/></span>
          <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-stone-500">Overdue</p><p className="mt-0.5 text-xl font-semibold tabular-nums text-[#35121D]">{(orders || []).filter((o) => o.deliveryDate && isOverdue(o.deliveryDate) && !["Collected/Delivered", "Completed"].includes(o.status)).length}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#EEDFE3] bg-white p-3.5 shadow-[0_2px_10px_rgba(53,18,29,.03)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><CheckCircle2 className="size-5"/></span>
          <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-stone-500">Completed</p><p className="mt-0.5 text-xl font-semibold tabular-nums text-[#35121D]">{(orders || []).filter((o) => ["Collected/Delivered", "Completed"].includes(o.status)).length}</p></div>
        </div>
      </div>

      {/* Board */}
      {ordersError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[#2F151B]">We couldn't load your production board</h3>
              <p className="mt-1 text-sm text-stone-600">{ordersErrorValue instanceof Error ? ordersErrorValue.message : "Check your connection and try again."}</p>
              <PremiumButton className="mt-3" onClick={() => void refetchOrders()}>Try again</PremiumButton>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-slim">
          {BOARD_COLUMNS.map((col) => (
            <div
              key={col.key}
              className="w-[85vw] max-w-80 sm:w-80 shrink-0 snap-start rounded-xl border border-[#EEDFE3] bg-[#FCF8F9]/60 p-2.5 space-y-2.5"
            >
              <div className="h-8 w-2/3 shimmer rounded" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-lg border border-[#EEDFE3] bg-white shimmer"
                />
              ))}
            </div>
          ))}
        </div>
      ) : (orders || []).length === 0 ? (
        <div className="surface-premium border border-[#EEDFE3] rounded-lg elevate-sm p-6">
          <EmptyState
            icon={LayoutGrid}
            title="No orders on the board"
            description="Create your first commission to populate the production board."
            action={
              <PremiumButton onClick={() => go("new-order")}>
                New Order
              </PremiumButton>
            }
          />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-5 snap-x snap-mandatory scroll-slim sm:mx-0 sm:gap-4 sm:px-0">
            {columns.map((col) => (
              <Column
                key={col.key}
                col={col}
                cards={col.cards}
                onOpen={(id) => go("order", { id })}
                onMove={(id, status) => statusMut.mutate({ id, status })}
                isUpdating={statusMut.isPending}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeOrder ? (
              <Card
                order={activeOrder}
                dragging
                overlay
                onClick={() => {}}
                onMove={() => {}}
                isUpdating
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

/* ---------- Column ---------- */

type CardOrder = Order & { paid?: number };

function Column({
  col,
  cards,
  onOpen,
  onMove,
  isUpdating,
}: {
  col: ColumnDef;
  cards: CardOrder[];
  onOpen: (id: string) => void;
  onMove: (id: string, status: string) => void;
  isUpdating: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-[82vw] max-w-[340px] sm:w-[310px] lg:w-[320px] xl:w-[330px] shrink-0 snap-start rounded-2xl border bg-[#FBF8F8] shadow-[0_5px_18px_rgba(53,18,29,.045)] flex flex-col transition-all",
        isOver
          ? "border-[#800020]/55 ring-2 ring-[#800020]/10 bg-[#F9F0F2]"
          : "border-[#E8DDE0]"
      )}
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-[#E8DDE0] flex items-center justify-between bg-white/80 rounded-t-2xl">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#51343C]">
          {col.title}
        </h3>
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-semibold text-[#2F151B] tabular-nums bg-white border border-[#EEDFE3] rounded-full">
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="max-h-[calc(100dvh-330px)] min-h-[220px] overflow-y-auto scroll-slim space-y-3 p-3">
        {cards.length === 0 ? (
          <div className="text-[11px] text-stone-500 text-center py-8 italic">
            Drop orders here
          </div>
        ) : (
          cards.map((o) => (
            <Card
              key={o.id}
              order={o}
              onClick={() => onOpen(o.id)}
              onMove={onMove}
              isUpdating={isUpdating}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ---------- Card ---------- */

function Card({
  order,
  onClick,
  dragging,
  overlay,
  onMove,
  isUpdating = false,
}: {
  order: CardOrder;
  onClick: () => void;
  dragging?: boolean;
  overlay?: boolean;
  onMove: (id: string, status: string) => void;
  isUpdating?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: order.id, disabled: overlay });

  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging && !overlay ? 0.4 : 1,
    zIndex: overlay ? 50 : isDragging ? 30 : undefined,
  };

  const overdue = !!order.deliveryDate && isOverdue(order.deliveryDate);
  const paid =
    order.paid ??
    order.payments?.reduce((s, p) => s + (Number(p.amount) || 0), 0) ??
    0;
  const paidPct =
    order.sellingPrice > 0
      ? Math.min(100, Math.round((paid / order.sellingPrice) * 100))
      : 0;
  const grad =
    AVATAR_GRADIENTS[
      hashIndex(order.customer?.id || order.id, AVATAR_GRADIENTS.length)
    ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "rounded-xl bg-white border border-[#E9DEE1] p-3.5 shadow-[0_2px_9px_rgba(53,18,29,.045)] transition-all hover:-translate-y-0.5 hover:border-[#D8B8C0] hover:shadow-[0_8px_20px_rgba(53,18,29,.08)] cursor-grab active:cursor-grabbing touch-pan-y",
        (dragging || overlay) && "shadow-lg border-[#800020]/40",
        overlay && "rotate-1"
      )}
    >
      {/* Top row: customer + drag handle */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[9px] font-semibold shrink-0",
              grad
            )}
          >
            {initials(order.customer?.name || "?")}
          </div>
          <div className="text-[11px] text-stone-500 truncate font-medium">
            {order.customer?.name || "—"}
          </div>
        </div>
        <GripVertical className="w-3.5 h-3.5 text-stone-300 shrink-0 mt-0.5" />
      </div>

      {/* Style picture */}
      <div className="mt-2.5 h-24 w-full rounded-md overflow-hidden bg-[#FAF0F2] border border-[#EEDFE3] flex items-center justify-center">
        {order.designImage ? (
           
          <img
            src={order.designImage}
            alt={`${order.garmentDesign} style`}
            loading="lazy"
            draggable={false}
            className="w-full h-full object-cover"
          />
        ) : (
          <Scissors className="w-5 h-5 text-stone-300" />
        )}
      </div>

      {/* Garment */}
      <div className="text-[13px] text-[#2F151B] font-medium leading-snug line-clamp-2 mt-2">
        {order.garmentDesign}
      </div>

      {/* Status + priority */}
      <div className="flex items-center gap-1.5 flex-wrap mt-2">
        <StatusBadge status={order.status} />
        {order.priority === "High" && (
          <span
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#800020] font-semibold"
            title="High priority"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#800020]" />
            High
          </span>
        )}
      </div>

      {/* Paid progress bar */}
      {order.sellingPrice > 0 && (
        <div className="mt-2.5">
          <div className="flex justify-between text-[9px] uppercase tracking-wide text-stone-400 mb-0.5">
            <span>Paid</span>
            <span className="tabular-nums">{paidPct}%</span>
          </div>
          <div className="h-1 w-full bg-[#EEDFE3] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                paidPct >= 100 ? "bg-emerald-500" : "bg-[#800020]"
              )}
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Mobile-friendly status control: drag remains available on larger screens. */}
      {!overlay && (
        <div className="mt-3" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
          <label className="sr-only" htmlFor={`move-${order.id}`}>Move {order.garmentDesign} to another stage</label>
          <select
            id={`move-${order.id}`}
            value={order.status}
            disabled={isUpdating}
            onChange={(event) => onMove(order.id, event.target.value)}
            className="w-full min-h-10 rounded-lg border border-[#EEDFE3] bg-[#FCF8F9] px-3 text-xs font-medium text-[#4B2630] outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/10 disabled:opacity-60"
          >
            {BOARD_COLUMNS.flatMap((column) => column.statuses).map((status) => (
              <option key={status} value={status}>{`Move to: ${status}`}</option>
            ))}
          </select>
        </div>
      )}

      {/* Footer: delivery */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-[#EEDFE3]/70">
        <span
          className={cn(
            "text-[11px] flex items-center gap-1 tabular-nums",
            overdue ? "text-amber-700 font-semibold" : "text-stone-500"
          )}
        >
          {overdue && <AlertCircle className="w-3 h-3 shrink-0" />}
          {order.deliveryDate ? shortDate(order.deliveryDate) : "No due date"}
        </span>
        <span
          className={cn(
            "text-[10px] tabular-nums",
            paidPct >= 100 && order.sellingPrice > 0
              ? "text-emerald-700 font-semibold"
              : "text-stone-400"
          )}
        >
          {paidPct >= 100 && order.sellingPrice > 0
            ? "Paid in full"
            : `${formatCurrency(paid)}`}
        </span>
      </div>
    </div>
  );
}
