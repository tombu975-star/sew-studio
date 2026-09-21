"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  CalendarDays,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  StickyNote,
} from "lucide-react";

import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useNav } from "@/stores/nav";
import {
  formatCurrency,
  formatDate,
  shortDate,
  todayISO,
  isOverdue,
  ORDER_STATUSES,
  PRIORITY_LEVELS,
} from "@/lib/format";
import type { Order } from "@/lib/types";

import { AtelierCard } from "@/components/atelier/AtelierCard";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { StatusStepper } from "@/components/atelier/StatusStepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function OrderDetail() {
  const { selectedId, go } = useNav();
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["order", selectedId],
    queryFn: () => apiGet<Order>(`/api/orders/${selectedId}`),
    enabled: !!selectedId,
  });

  const paid = useMemo(
    () =>
      order?.payments?.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
      ) ?? 0,
    [order]
  );
  const outstanding = useMemo(() => {
    const selling = Number(order?.sellingPrice) || 0;
    return Math.max(0, selling - paid);
  }, [order, paid]);
  const estMargin = useMemo(() => {
    const selling = Number(order?.sellingPrice) || 0;
    const fabric = Number(order?.fabricCost) || 0;
    const labour = Number(order?.labourCost) || 0;
    return selling - fabric - labour;
  }, [order]);

  // Status change mutation
  const statusMut = useMutation({
    mutationFn: (status: string) =>
      apiPatch<Order>(`/api/orders/${selectedId}`, { status }),
    onSuccess: (updated) => {
      toast.success(`Status updated to ${updated.status}`);
      qc.setQueryData(["order", selectedId], updated);
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Payment mutation
  const payMut = useMutation({
    mutationFn: (body: { amount: number; method?: string; note?: string }) =>
      apiPost(`/api/orders/${selectedId}/payments`, body),
    onSuccess: async () => {
      toast.success("Payment recorded");
      await qc.invalidateQueries({ queryKey: ["order", selectedId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Fitting mutation
  const fitMut = useMutation({
    mutationFn: (body: { date: string; notes?: string }) =>
      apiPost(`/api/orders/${selectedId}/fittings`, {
        ...body,
        status: "Scheduled",
      }),
    onSuccess: async () => {
      toast.success("Fitting scheduled");
      await qc.invalidateQueries({ queryKey: ["order", selectedId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Task mutation (uses /api/tasks with orderId)
  const taskMut = useMutation({
    mutationFn: (body: {
      title: string;
      priority: string;
      dueDate?: string;
    }) =>
      apiPost(`/api/tasks`, {
        ...body,
        orderId: selectedId,
        status: "To Do",
      }),
    onSuccess: async () => {
      toast.success("Task added");
      await qc.invalidateQueries({ queryKey: ["order", selectedId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Notes mutation
  const notesMut = useMutation({
    mutationFn: (notes: string) =>
      apiPatch<Order>(`/api/orders/${selectedId}`, { notes }),
    onSuccess: async (updated) => {
      toast.success("Notes saved");
      qc.setQueryData(["order", selectedId], updated);
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!selectedId) {
    return (
      <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        <AtelierCard>
          <div className="py-12 text-center text-sm text-stone-500">
            No order selected.
          </div>
        </AtelierCard>
      </div>
    );
  }

  if (isLoading || !order) {
    return (
      <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        <div className="h-4 w-24 bg-stone-200 rounded mb-6 animate-pulse" />
        <AtelierCard>
          <div className="py-10 text-center text-sm text-stone-400">
            Loading order…
          </div>
        </AtelierCard>
      </div>
    );
  }

  const overdue = !!order.deliveryDate && isOverdue(order.deliveryDate);

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
      <button
        onClick={() => go("orders")}
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#800020] transition mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
      </button>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 mb-6">
        <div className="min-w-0">
          <h1
            className="font-display font-semibold text-[#1C1917] leading-tight"
            style={{ fontSize: "clamp(26px, 3.6vw, 34px)" }}
          >
            {order.garmentDesign}
          </h1>
          <button
            onClick={() => go("customer", { id: order.customerId })}
            className="text-sm text-[#800020] hover:underline mt-1.5 font-medium"
          >
            {order.customer?.name || "—"}
          </button>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-[12px] text-stone-500">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Ordered {formatDate(order.orderDate)}
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5",
                overdue && "text-amber-700 font-semibold"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              Delivery {order.deliveryDate ? formatDate(order.deliveryDate) : "—"}
              {overdue && (
                <span className="text-[10px] uppercase tracking-wide">
                  · overdue
                </span>
              )}
            </span>
            {order.priority === "High" && (
              <span className="flex items-center gap-1 text-[#800020] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#800020]" />
                High priority
              </span>
            )}
            {order.assignedStaff && (
              <span>Staff: {order.assignedStaff.fullName}</span>
            )}
          </div>
        </div>

        {/* Status changer */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={order.status} />
          <Select
            value={order.status}
            onValueChange={(v) => statusMut.mutate(v)}
            disabled={statusMut.isPending}
          >
            <SelectTrigger className="w-[180px] rounded-sm h-9 text-sm">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Order Journey / Stepper */}
      <AtelierCard
        title="Order Journey"
        className="mb-4"
        bodyClassName="pt-6"
      >
        <StatusStepper current={order.status} />
      </AtelierCard>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Financials */}
          <AtelierCard
            title="Financials"
            action={<PaymentDialog onConfirm={(b) => payMut.mutate(b)} />}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <Stat
                label="Selling price"
                value={formatCurrency(order.sellingPrice)}
                primary
              />
              <Stat label="Paid so far" value={formatCurrency(paid)} />
              <Stat
                label="Outstanding"
                value={formatCurrency(outstanding)}
                tone={outstanding > 0 ? "warn" : "ok"}
              />
              <Stat label="Fabric cost" value={formatCurrency(order.fabricCost)} />
              <Stat label="Labour cost" value={formatCurrency(order.labourCost)} />
              <Stat
                label="Est. margin"
                value={formatCurrency(estMargin)}
                tone={estMargin >= 0 ? "ok" : "warn"}
              />
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-2">
                Payments
              </div>
              {order.payments && order.payments.length > 0 ? (
                <div className="divide-y divide-[#E7E5E4] border border-[#E7E5E4] rounded-sm">
                  {order.payments.map((p) => (
                    <div
                      key={p.id}
                      className="px-3 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#1C1917]">
                          {formatCurrency(p.amount)}
                        </div>
                        <div className="text-[11px] text-stone-400">
                          {formatDate(p.date)}
                          {p.method ? ` · ${p.method}` : ""}
                          {p.note ? ` · ${p.note}` : ""}
                        </div>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-400">
                  No payments recorded yet.
                </p>
              )}
            </div>
          </AtelierCard>

          {/* Fittings */}
          <AtelierCard
            title="Fittings"
            action={<FittingDialog onConfirm={(b) => fitMut.mutate(b)} />}
          >
            {order.fittings && order.fittings.length > 0 ? (
              <div className="space-y-2">
                {order.fittings.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-start justify-between gap-3 p-3 border border-[#E7E5E4] rounded-sm"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1C1917]">
                        {formatDate(f.date)}
                      </div>
                      {f.notes && (
                        <div className="text-[12px] text-stone-500 mt-0.5">
                          {f.notes}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={f.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400">No fittings scheduled.</p>
            )}
          </AtelierCard>

          {/* Tasks */}
          <AtelierCard
            title="Tasks"
            action={<TaskDialog onConfirm={(b) => taskMut.mutate(b)} />}
          >
            {order.tasks && order.tasks.length > 0 ? (
              <div className="space-y-2">
                {order.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 p-3 border border-[#E7E5E4] rounded-sm"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1C1917] truncate">
                        {t.title}
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        {t.dueDate ? `Due ${shortDate(t.dueDate)}` : "No due date"}
                        {t.staff ? ` · ${t.staff.fullName}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400">No tasks for this order.</p>
            )}
          </AtelierCard>

          {/* Notes */}
          <AtelierCard title="Notes">
            <NotesEditor
              initial={order.notes || ""}
              onSave={(v) => notesMut.mutate(v)}
              saving={notesMut.isPending}
            />
          </AtelierCard>
        </div>

        {/* RIGHT 1/3 */}
        <div className="space-y-4">
          {/* Customer snapshot */}
          <AtelierCard title="Customer Snapshot">
            {order.customer ? (
              <div className="space-y-3">
                <div>
                  <button
                    onClick={() =>
                      go("customer", { id: order.customerId })
                    }
                    className="text-sm font-semibold text-[#800020] hover:underline"
                  >
                    {order.customer.name}
                  </button>
                  {order.customer.customerType && (
                    <div className="text-[11px] uppercase tracking-wide text-stone-400 mt-0.5">
                      {order.customer.customerType}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 text-[12px] text-stone-600">
                  {order.customer.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      {order.customer.phone}
                    </div>
                  )}
                  {order.customer.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      {order.customer.email}
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-[#E7E5E4] space-y-1.5 text-[12px]">
                  <Row label="Entry" value={order.customer.entrySource} />
                  <Row
                    label="Styles"
                    value={order.customer.preferredStyles}
                  />
                  <Row label="City" value={order.customer.city} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-sm mt-1"
                  onClick={() => go("customer", { id: order.customerId })}
                >
                  Open full profile
                </Button>
              </div>
            ) : (
              <p className="text-sm text-stone-400">No customer linked.</p>
            )}
          </AtelierCard>

          {/* Timeline (simple) */}
          <AtelierCard title="Timeline">
            <div className="space-y-2 text-[12px] text-stone-600">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-stone-400" />
                Created {formatDate(order.createdAt)}
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-stone-400" />
                Current status: {order.status}
              </div>
            </div>
          </AtelierCard>
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function Stat({
  label,
  value,
  primary,
  tone,
}: {
  label: string;
  value: string;
  primary?: boolean;
  tone?: "ok" | "warn";
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-semibold">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-lg font-display font-semibold",
          primary && "text-[#1C1917]",
          tone === "ok" && "text-emerald-700",
          tone === "warn" && "text-amber-700",
          !primary && !tone && "text-[#1C1917]"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-stone-400">{label}</span>
      <span className="text-[#1C1917] text-right">{value}</span>
    </div>
  );
}

function NotesEditor({
  initial,
  onSave,
  saving,
}: {
  initial: string;
  onSave: (v: string) => void;
  saving: boolean;
}) {
  const [val, setVal] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setVal(initial);
  }

  if (!editing) {
    return (
      <div>
        {initial ? (
          <p className="text-sm text-stone-700 whitespace-pre-wrap">
            {initial}
          </p>
        ) : (
          <p className="text-sm text-stone-400">No notes yet.</p>
        )}
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm"
            onClick={() => setEditing(true)}
          >
            <StickyNote className="w-3.5 h-3.5" /> Edit notes
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <Textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        rows={5}
        placeholder="Notes about this order…"
        className="rounded-sm"
      />
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm"
          disabled={saving}
          onClick={() => {
            onSave(val);
            setEditing(false);
          }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-sm"
          onClick={() => {
            setVal(initial);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ---------- Dialogs ---------- */

function PaymentDialog({
  onConfirm,
}: {
  onConfirm: (b: { amount: number; method?: string; note?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setAmount("");
          setNote("");
          setMethod("Cash");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Amount (GHS) *</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="rounded-sm mt-1"
            />
          </div>
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="rounded-sm mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Cash", "Transfer", "Card", "Cheque"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Note</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional"
              className="rounded-sm mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm"
            disabled={!amount || Number(amount) <= 0}
            onClick={() => {
              onConfirm({
                amount: Number(amount),
                method,
                note: note || undefined,
              });
              setOpen(false);
            }}
          >
            Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FittingDialog({
  onConfirm,
}: {
  onConfirm: (b: { date: string; notes?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setNotes("");
          setDate(todayISO());
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="rounded-sm gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Schedule Fitting
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Fitting</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-sm mt-1"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any prep notes for this fitting…"
              className="rounded-sm mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm"
            onClick={() => {
              onConfirm({ date, notes: notes || undefined });
              setOpen(false);
            }}
          >
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({
  onConfirm,
}: {
  onConfirm: (b: { title: string; priority: string; dueDate?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setTitle("");
          setPriority("Medium");
          setDueDate("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-sm gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Source fabric"
              className="rounded-sm mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="rounded-sm mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_LEVELS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-sm mt-1"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm"
            disabled={!title.trim()}
            onClick={() => {
              onConfirm({
                title: title.trim(),
                priority,
                dueDate: dueDate || undefined,
              });
              setOpen(false);
            }}
          >
            Add task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
