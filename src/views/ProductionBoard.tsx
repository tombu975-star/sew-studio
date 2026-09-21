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
import { LayoutGrid, AlertCircle, GripVertical } from "lucide-react";

import { apiGet, apiPatch } from "@/lib/api";
import { useNav } from "@/stores/nav";
import { formatCurrency, shortDate, isOverdue } from "@/lib/format";
import type { Order, User } from "@/lib/types";

import { StatusBadge } from "@/components/atelier/StatusBadge";
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

function columnForStatus(status: string): ColumnDef {
  return (
    BOARD_COLUMNS.find((c) => c.statuses.includes(status)) || BOARD_COLUMNS[0]
  );
}

export default function ProductionBoard() {
  const { go } = useNav();
  const qc = useQueryClient();
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
    const map = new Map<string, Order>();
    (orders || []).forEach((o) => map.set(o.id, o));
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
          prev.map((o) => (o.id === id ? { ...o, status: status as Order["status"] } : o))
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
    // Pick the most appropriate status in target column:
    // - If current status already maps, keep it
    // - Otherwise default to the first status in the column
    const newStatus = col.statuses[0];
    statusMut.mutate({ id: orderId, status: newStatus });
    toast.success(`Moved to ${col.title}`);
  }

  const activeOrder = activeId ? flatOrders.get(activeId) : null;

  return (
    <div className="p-5 md:p-8 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6 max-w-[1400px]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2">
            <LayoutGrid className="w-3.5 h-3.5" /> Live workflow
          </p>
          <h1
            className="font-display font-semibold text-[#1C1917] leading-none"
            style={{ fontSize: "clamp(30px, 4.5vw, 42px)" }}
          >
            Production Board
          </h1>
          <p className="text-sm text-stone-500 mt-2 max-w-[560px]">
            Every order by stage — drag a card between columns to update its
            status, or tap a card to open it.
          </p>
        </div>
        <div className="w-full md:w-56">
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="rounded-sm w-full">
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
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="p-10 text-stone-400 text-sm">Loading board…</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex gap-3 overflow-x-auto pb-4">
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
              <Card order={activeOrder} dragging overlay onClick={() => {}} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Legend / empty hint */}
      {!isLoading && (orders || []).length === 0 && (
        <div className="mt-8 border border-[#E7E5E4] rounded-sm bg-white p-10 text-center">
          <AlertCircle className="w-6 h-6 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500">
            No orders yet. Create one to populate the board.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- Column ---------- */

function Column({
  col,
  cards,
  onOpen,
}: {
  col: ColumnDef;
  cards: (Order & { paid: number })[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 shrink-0 bg-[#FBF9F7] border rounded-sm flex flex-col",
        isOver
          ? "border-[#800020]/50 ring-2 ring-[#800020]/15"
          : "border-[#E7E5E4]"
      )}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#E7E5E4] flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          {col.title}
        </h3>
        <span className="text-[11px] font-semibold text-stone-400 tabular-nums">
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="max-h-[70vh] overflow-y-auto scroll-slim space-y-2 p-2">
        {cards.length === 0 ? (
          <div className="text-[11px] text-stone-300 text-center py-6 italic">
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

type CardOrder = Order & { paid?: number };

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
    transform: transform
      ? CSS.Translate.toString(transform)
      : undefined,
    opacity: isDragging && !overlay ? 0.4 : 1,
    zIndex: overlay ? 50 : isDragging ? 30 : undefined,
  };

  const overdue = !!order.deliveryDate && isOverdue(order.deliveryDate);
  const paid =
    order.paid ??
    order.payments?.reduce((s, p) => s + (Number(p.amount) || 0), 0) ??
    0;
  const outstanding = Math.max(0, Number(order.sellingPrice) - paid);
  const paidFull = paid > 0 && outstanding <= 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "bg-white border border-[#E7E5E4] rounded-sm p-3 hover:border-[#800020]/40 cursor-pointer transition-colors",
        (dragging || overlay) && "shadow-lg border-[#800020]/40",
        overlay && "rotate-1"
      )}
    >
      {/* Top row: customer + drag handle */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] text-stone-500 truncate font-medium">
            {order.customer?.name || "—"}
          </div>
          <div className="text-[13px] text-[#1C1917] font-medium leading-snug line-clamp-2 mt-0.5">
            {order.garmentDesign}
          </div>
        </div>
        <GripVertical className="w-3.5 h-3.5 text-stone-300 shrink-0 mt-0.5" />
      </div>

      {/* Status + priority */}
      <div className="flex items-center gap-1.5 flex-wrap mt-2">
        <StatusBadge status={order.status} />
        {order.priority === "High" && (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#800020] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#800020]" />
            High
          </span>
        )}
      </div>

      {/* Footer: delivery + paid */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-[#E7E5E4]">
        <span
          className={cn(
            "text-[11px] flex items-center gap-1",
            overdue ? "text-amber-700 font-semibold" : "text-stone-500"
          )}
        >
          {overdue && <AlertCircle className="w-3 h-3" />}
          {order.deliveryDate ? shortDate(order.deliveryDate) : "No due date"}
        </span>
        <span
          className={cn(
            "text-[11px] tabular-nums",
            paidFull ? "text-emerald-700 font-semibold" : "text-stone-400"
          )}
        >
          {paidFull
            ? "Paid"
            : outstanding > 0
              ? `Due ${formatCurrency(outstanding)}`
              : ""}
        </span>
      </div>
    </div>
  );
}
