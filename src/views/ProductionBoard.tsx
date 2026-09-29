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
import { LayoutGrid, AlertCircle, GripVertical, Scissors } from "lucide-react";

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
  "from-[#9E5A44] to-[#9E5A44]",
  "from-[#3d5166] to-[#3d5166]",
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

  const { data: orders, isLoading } = useQuery<Order[]>({
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order"] });
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
    toast.success(`Moved to ${col.title}`);
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

      {/* Board */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((col) => (
            <div
              key={col.key}
              className="w-80 shrink-0 rounded-xl border border-[#EAE6DF] bg-[#FAFAF7]/60 p-2.5 space-y-2.5"
            >
              <div className="h-8 w-2/3 shimmer rounded" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-lg border border-[#EAE6DF] bg-white shimmer"
                />
              ))}
            </div>
          ))}
        </div>
      ) : (orders || []).length === 0 ? (
        <div className="surface-premium border border-[#EAE6DF] rounded-lg elevate-sm p-6">
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
          <div className="flex gap-4 overflow-x-auto pb-4 scroll-slim">
            {columns.map((col) => (
              <Column
                key={col.key}
                col={col}
                cards={col.cards}
                onOpen={(id) => go("order", { id })}
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
}: {
  col: ColumnDef;
  cards: CardOrder[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-80 shrink-0 rounded-xl border bg-[#FAFAF7]/60 elevate-sm flex flex-col transition-colors",
        isOver
          ? "border-[#9E5A44]/50 ring-2 ring-[#9E5A44]/15"
          : "border-[#EAE6DF]"
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#EAE6DF]/70 flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          {col.title}
        </h3>
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-semibold text-[#1C1A18] tabular-nums bg-white border border-[#EAE6DF] rounded-full">
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="max-h-[72vh] overflow-y-auto scroll-slim space-y-2.5 p-2.5">
        {cards.length === 0 ? (
          <div className="text-[11px] text-stone-300 text-center py-8 italic">
            Drop orders here
          </div>
        ) : (
          cards.map((o) => (
            <Card key={o.id} order={o} onClick={() => onOpen(o.id)} />
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
}: {
  order: CardOrder;
  onClick: () => void;
  dragging?: boolean;
  overlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: order.id });

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
        "rounded-lg bg-white border border-[#EAE6DF] p-3.5 elevate-sm lift cursor-grab active:cursor-grabbing",
        (dragging || overlay) && "shadow-lg border-[#9E5A44]/40",
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
      <div className="mt-2.5 h-24 w-full rounded-md overflow-hidden bg-[#FAF2EC] border border-[#EAE6DF] flex items-center justify-center">
        {order.designImage ? (
          // eslint-disable-next-line @next/next/no-img-element
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
      <div className="text-[13px] text-[#1C1A18] font-medium leading-snug line-clamp-2 mt-2">
        {order.garmentDesign}
      </div>

      {/* Status + priority */}
      <div className="flex items-center gap-1.5 flex-wrap mt-2">
        <StatusBadge status={order.status} />
        {order.priority === "High" && (
          <span
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#9E5A44] font-semibold"
            title="High priority"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#9E5A44]" />
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
          <div className="h-1 w-full bg-[#EAE6DF] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                paidPct >= 100 ? "bg-emerald-500" : "bg-[#9E5A44]"
              )}
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: delivery */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-[#EAE6DF]/70">
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
