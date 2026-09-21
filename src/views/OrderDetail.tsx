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
  Pencil,
  UserCircle2,
  MapPin,
  Sparkles,
  Image as ImageIcon,
  Link2,
} from "lucide-react";

import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";
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

import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { StatusStepper } from "@/components/atelier/StatusStepper";
import { EmptyState, SkeletonCard } from "@/components/atelier/EmptyState";
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

const AVATAR_GRADIENTS = [
  "from-[#800020] to-[#b45309]",
  "from-[#0e7490] to-[#800020]",
  "from-[#15803D] to-[#0e7490]",
  "from-[#b45309] to-[#800020]",
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

export default function OrderDetail() {
  const { selectedId, go } = useNav();
  const qc = useQueryClient();
  const { canSeeBusiness } = useRole();
  const canSeeMoney = canSeeBusiness();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [generatingPortal, setGeneratingPortal] = useState(false);

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

  const paidPct = order && order.sellingPrice > 0
    ? Math.min(100, Math.round((paid / order.sellingPrice) * 100))
    : 0;

  const daysInProduction = useMemo(() => {
    if (!order) return 0;
    const start = new Date(order.createdAt).getTime();
    const end = Date.now();
    return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
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

  // Design image mutation
  const imageMut = useMutation({
    mutationFn: (designImage: string) =>
      apiPatch<Order>(`/api/orders/${selectedId}`, { designImage }),
    onSuccess: async (updated) => {
      toast.success("Design image updated");
      qc.setQueryData(["order", selectedId], updated);
      qc.invalidateQueries({ queryKey: ["orders"] });
      setImageDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!selectedId) {
    return (
      <div className="p-5 md:p-8 max-w-[1300px] mx-auto w-full">
        <SectionCard>
          <EmptyState
            icon={AlertCircle}
            title="No order selected"
            description="Choose an order from the list to view its detail."
          />
        </SectionCard>
      </div>
    );
  }

  if (isLoading || !order) {
    return (
      <div className="p-5 md:p-8 max-w-[1300px] mx-auto w-full">
        <button
          onClick={() => go("orders")}
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#800020] transition mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
        </button>
        <div className="h-28 w-full rounded-xl bg-[#faf8f5] border border-[#E7E5E4] shimmer mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  const overdue = !!order.deliveryDate && isOverdue(order.deliveryDate);
  const custGrad =
    AVATAR_GRADIENTS[
      hashIndex(order.customer?.id || order.id, AVATAR_GRADIENTS.length)
    ];

  return (
    <div className="p-5 md:p-8 max-w-[1300px] mx-auto w-full">
      <button
        onClick={() => go("orders")}
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#800020] transition mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
      </button>

      {/* Hero design image */}
      {order.designImage ? (
        <div className="relative mb-6 animate-fade-in-up">
          <img
            src={order.designImage}
            alt={order.garmentDesign || "Design image"}
            className="w-full aspect-video rounded-xl object-cover elevate-md bg-[#FBF9F7]"
          />
          {canSeeMoney && (
            <button
              onClick={() => setImageDialogOpen(true)}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/95 backdrop-blur border border-[#E7E5E4] rounded-md hover:bg-white transition elevate-sm"
            >
              <Pencil className="w-3 h-3" /> Edit image
            </button>
          )}
        </div>
      ) : canSeeMoney ? (
        <button
          onClick={() => setImageDialogOpen(true)}
          className="w-full mb-6 aspect-video rounded-xl border-2 border-dashed border-[#E7E5E4] bg-[#FBF9F7] flex flex-col items-center justify-center gap-2 hover:border-[#800020]/40 hover:bg-[#faf8f5] transition group animate-fade-in-up"
        >
          <div className="w-10 h-10 rounded-full bg-white border border-[#E7E5E4] flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-stone-400 group-hover:text-[#800020] transition" />
          </div>
          <span className="text-xs text-stone-500 group-hover:text-[#800020] font-medium">
            Add a design image
          </span>
          <span className="text-[10px] text-stone-400">
            Paste a photo or illustration URL
          </span>
        </button>
      ) : null}

      {/* Premium header band */}
      <div className="rounded-xl elevate-md surface-premium border border-[#E7E5E4] p-6 mb-6 animate-fade-in-up">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <h1
              className="font-display font-semibold text-[#1C1917] leading-[1.1]"
              style={{ fontSize: "clamp(26px, 3.4vw, 34px)" }}
            >
              {order.garmentDesign}
            </h1>
            <button
              onClick={() => go("customer", { id: order.customerId })}
              className="inline-flex items-center gap-2 mt-2 group"
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-semibold",
                  custGrad
                )}
              >
                {initials(order.customer?.name || "?")}
              </div>
              <span className="text-sm text-[#800020] hover:underline font-medium">
                {order.customer?.name || "—"}
              </span>
            </button>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-[12px] text-stone-500">
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
                Delivery{" "}
                {order.deliveryDate ? formatDate(order.deliveryDate) : "—"}
                {overdue && (
                  <span className="text-[10px] uppercase tracking-wide ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> overdue
                  </span>
                )}
              </span>
              {order.priority && (
                <StatusBadge status={order.priority} dot={false} />
              )}
              {order.assignedStaff && (
                <span className="flex items-center gap-1.5">
                  <UserCircle2 className="w-3.5 h-3.5" />
                  {order.assignedStaff.fullName}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canSeeMoney ? (
              <Select
                value={order.status}
                onValueChange={(v) => statusMut.mutate(v)}
                disabled={statusMut.isPending}
              >
                <SelectTrigger className="w-[180px] rounded-md h-9 text-sm bg-white">
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
            ) : (
              <StatusBadge status={order.status} />
            )}
          </div>
        </div>
      </div>

      {/* Order Journey / Stepper */}
      <SectionCard
        title="Order Journey"
        className="mb-6"
        bodyClassName="pt-6"
      >
        <StatusStepper current={order.status} />
      </SectionCard>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Financials (money viewers) OR Production (non-money viewers) */}
          {canSeeMoney ? (
          <SectionCard
            title="Financials"
            action={<PaymentDialog onConfirm={(b) => payMut.mutate(b)} />}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
              <Stat
                label="Selling Price"
                value={formatCurrency(order.sellingPrice)}
                primary
              />
              <Stat
                label="Paid So Far"
                value={formatCurrency(paid)}
                sub={`${paidPct}% of total`}
              />
              <Stat
                label="Outstanding Balance"
                value={formatCurrency(outstanding)}
                tone={outstanding > 0 ? "warn" : "ok"}
              />
              <Stat
                label="Fabric Cost"
                value={formatCurrency(order.fabricCost)}
              />
              <Stat
                label="Labour Cost"
                value={formatCurrency(order.labourCost)}
              />
              <Stat
                label="Est. Margin"
                value={formatCurrency(estMargin)}
                tone={estMargin >= 0 ? "ok" : "warn"}
              />
            </div>

            {/* Paid progress bar */}
            {order.sellingPrice > 0 && (
              <div className="mb-5">
                <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-1.5">
                  <span>Payment progress</span>
                  <span className="tabular-nums">{paidPct}%</span>
                </div>
                <div className="h-2 w-full bg-[#E7E5E4] rounded-full overflow-hidden">
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

            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-2.5">
                Payments
              </div>
              {order.payments && order.payments.length > 0 ? (
                <div className="divide-y divide-[#E7E5E4]/70 border border-[#E7E5E4] rounded-md overflow-hidden">
                  {order.payments
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((p) => (
                      <div
                        key={p.id}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#faf8f5]/60"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#1C1917] tabular-nums">
                              {formatCurrency(p.amount)}
                            </div>
                            <div className="text-[11px] text-stone-400">
                              {formatDate(p.date)}
                              {p.method ? ` · ${p.method}` : ""}
                              {p.note ? ` · ${p.note}` : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-stone-400">
                  No payments recorded yet.
                </p>
              )}
            </div>
          </SectionCard>
          ) : (
            <SectionCard title="Production">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                <Stat
                  label="Current Status"
                  valueNode={<StatusBadge status={order.status} />}
                />
                <Stat
                  label="Days in Production"
                  value={`${daysInProduction}`}
                  sub={daysInProduction === 1 ? "day" : "days"}
                />
                <Stat
                  label="Fittings"
                  value={`${order.fittings?.length ?? 0}`}
                  sub={
                    (order.fittings?.length ?? 0) === 1 ? "scheduled" : "scheduled"
                  }
                />
                <Stat
                  label="Open Tasks"
                  value={`${(order.tasks ?? []).filter((t) => t.status !== "Done").length}`}
                  sub={`${order.tasks?.length ?? 0} total`}
                />
                <Stat
                  label="Priority"
                  valueNode={
                    order.priority ? (
                      <StatusBadge status={order.priority} dot={false} />
                    ) : (
                      <span className="text-stone-400">—</span>
                    )
                  }
                />
                <Stat
                  label="Assigned To"
                  value={order.assignedStaff?.fullName || "Unassigned"}
                />
              </div>
              <div className="rounded-md border border-[#E7E5E4] bg-[#FBF9F7] p-3.5 text-[12px] text-stone-600 leading-relaxed">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-1.5">
                  <Sparkles className="w-3 h-3 text-[#800020]" />
                  Note
                </div>
                Financial details are managed by the studio. Focus on the
                production milestones below — fittings and tasks keep the
                garment moving.
              </div>
            </SectionCard>
          )}

          {/* Fittings */}
          <SectionCard
            title="Fittings"
            action={<FittingDialog onConfirm={(b) => fitMut.mutate(b)} />}
          >
            {order.fittings && order.fittings.length > 0 ? (
              <div className="space-y-2.5">
                {order.fittings.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-start justify-between gap-3 p-3.5 border border-[#E7E5E4] rounded-md hover:bg-[#faf8f5]/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1C1917] flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-stone-400" />
                        {formatDate(f.date)}
                      </div>
                      {f.notes && (
                        <div className="text-[12px] text-stone-500 mt-1">
                          {f.notes}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={f.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No fittings scheduled"
                description="Schedule the first fitting when production begins."
              />
            )}
          </SectionCard>

          {/* Tasks */}
          <SectionCard
            title="Tasks"
            action={<TaskDialog onConfirm={(b) => taskMut.mutate(b)} />}
          >
            {order.tasks && order.tasks.length > 0 ? (
              <div className="space-y-2.5">
                {order.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 p-3.5 border border-[#E7E5E4] rounded-md hover:bg-[#faf8f5]/50 transition-colors"
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
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge status={t.priority} dot={false} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="No tasks for this order"
                description="Break the work into steps so nothing falls through the cracks."
              />
            )}
          </SectionCard>

          {/* Notes */}
          <SectionCard title="Notes">
            <NotesEditor
              initial={order.notes || ""}
              onSave={(v) => notesMut.mutate(v)}
              saving={notesMut.isPending}
            />
          </SectionCard>
        </div>

        {/* RIGHT 1/3 */}
        <div className="space-y-4">
          {/* Customer snapshot */}
          <SectionCard title="Customer Snapshot">
            {order.customer ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-semibold elevate-xs",
                      custGrad
                    )}
                  >
                    {initials(order.customer.name)}
                  </div>
                  <div className="min-w-0">
                    <button
                      onClick={() =>
                        go("customer", { id: order.customerId })
                      }
                      className="text-sm font-semibold text-[#1C1917] hover:text-[#800020] transition-colors truncate block"
                    >
                      {order.customer.name}
                    </button>
                    {order.customer.customerType && (
                      <div className="mt-0.5">
                        <StatusBadge
                          status={order.customer.customerType}
                          dot={false}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-[12px] text-stone-600">
                  {order.customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      {order.customer.phone}
                    </div>
                  )}
                  {order.customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{order.customer.email}</span>
                    </div>
                  )}
                  {order.customer.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      {order.customer.city}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E7E5E4]/70 space-y-2 text-[12px]">
                  <Row
                    label="Entry Source"
                    value={order.customer.entrySource}
                  />
                  <Row
                    label="Preferred Styles"
                    value={order.customer.preferredStyles}
                  />
                </div>

                <PremiumButton
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => go("customer", { id: order.customerId })}
                >
                  <UserCircle2 className="w-3.5 h-3.5" /> View profile
                </PremiumButton>

                {canSeeMoney && (
                  <PremiumButton
                    variant="outline"
                    size="sm"
                    className="w-full"
                    loading={generatingPortal}
                    onClick={async () => {
                      setGeneratingPortal(true);
                      try {
                        const res = await apiPost<{ token: string; url: string }>(
                          `/api/customers/${order.customerId}/portal-token`,
                          {}
                        );
                        const fullUrl = `${window.location.origin}${res.url}`;
                        await navigator.clipboard.writeText(fullUrl);
                        toast.success("Portal link copied — share it with the customer.");
                      } catch {
                        toast.error("Could not generate the portal link.");
                      } finally {
                        setGeneratingPortal(false);
                      }
                    }}
                  >
                    <Link2 className="w-3.5 h-3.5" /> Copy tracking link
                  </PremiumButton>
                )}
              </div>
            ) : (
              <p className="text-sm text-stone-400">No customer linked.</p>
            )}
          </SectionCard>

          {/* Timeline */}
          <SectionCard title="Timeline">
            <div className="space-y-3 text-[12px] text-stone-600">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-stone-400" />
                <span>
                  Created{" "}
                  <span className="text-[#1C1917] font-medium">
                    {formatDate(order.createdAt)}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>
                  Last updated{" "}
                  <span className="text-[#1C1917] font-medium">
                    {formatDate(order.createdAt)}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#800020]" />
                <span>
                  In production for{" "}
                  <span className="text-[#1C1917] font-medium tabular-nums">
                    {daysInProduction} day{daysInProduction === 1 ? "" : "s"}
                  </span>
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Design image editor */}
      <EditImageDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        initial={order.designImage || ""}
        saving={imageMut.isPending}
        onSave={(url) => imageMut.mutate(url)}
      />
    </div>
  );
}

/* ---------- Helpers ---------- */

function Stat({
  label,
  value,
  valueNode,
  primary,
  tone,
  sub,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  primary?: boolean;
  tone?: "ok" | "warn";
  sub?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-semibold">
        {label}
      </div>
      {valueNode ? (
        <div className="mt-1.5">{valueNode}</div>
      ) : (
        <div
          className={cn(
            "mt-1 text-lg font-display font-semibold tabular-nums",
            primary && "text-[#1C1917]",
            tone === "ok" && "text-emerald-700",
            tone === "warn" && "text-amber-700",
            !primary && !tone && "text-[#1C1917]"
          )}
        >
          {value}
        </div>
      )}
      {sub && <div className="text-[10px] text-stone-400 mt-0.5">{sub}</div>}
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
          <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
            {initial}
          </p>
        ) : (
          <p className="text-sm text-stone-400">No notes yet.</p>
        )}
        <div className="mt-3">
          <PremiumButton
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <StickyNote className="w-3.5 h-3.5" /> Edit notes
          </PremiumButton>
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
        className="rounded-md"
      />
      <div className="flex gap-2 mt-3">
        <PremiumButton
          size="sm"
          loading={saving}
          disabled={saving}
          onClick={() => {
            onSave(val);
            setEditing(false);
          }}
        >
          Save
        </PremiumButton>
        <PremiumButton
          variant="outline"
          size="sm"
          onClick={() => {
            setVal(initial);
            setEditing(false);
          }}
        >
          Cancel
        </PremiumButton>
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
        <PremiumButton size="sm">
          <Plus className="w-3.5 h-3.5" /> Record Payment
        </PremiumButton>
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
              className="rounded-md mt-1 tabular-nums"
            />
          </div>
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="rounded-md mt-1 w-full">
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
              className="rounded-md mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <PremiumButton
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </PremiumButton>
          <PremiumButton
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
          </PremiumButton>
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
        <PremiumButton variant="outline" size="sm">
          <Plus className="w-3.5 h-3.5" /> Schedule Fitting
        </PremiumButton>
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
              className="rounded-md mt-1"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any prep notes for this fitting…"
              className="rounded-md mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <PremiumButton variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </PremiumButton>
          <PremiumButton
            onClick={() => {
              onConfirm({ date, notes: notes || undefined });
              setOpen(false);
            }}
          >
            Schedule
          </PremiumButton>
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
        <PremiumButton variant="outline" size="sm">
          <Plus className="w-3.5 h-3.5" /> Add Task
        </PremiumButton>
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
              className="rounded-md mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="rounded-md mt-1 w-full">
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
                className="rounded-md mt-1"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <PremiumButton variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </PremiumButton>
          <PremiumButton
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
          </PremiumButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Design image editor ---------- */

function EditImageDialog({
  open,
  onOpenChange,
  initial,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: string;
  saving: boolean;
  onSave: (url: string) => void;
}) {
  const [url, setUrl] = useState(initial);
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setUrl(initial);
  }

  const trimmed = url.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setUrl(initial);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Design image</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Image URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="rounded-md mt-1"
            />
            <p className="text-[11px] text-stone-400 mt-1.5">
              Paste a photo or illustration URL. Leave empty to remove the
              current image.
            </p>
          </div>
          {trimmed ? (
            <div className="aspect-video rounded-md overflow-hidden bg-[#FBF9F7] border border-[#E7E5E4]">
              <img
                src={trimmed}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video rounded-md border-2 border-dashed border-[#E7E5E4] bg-[#FBF9F7] flex flex-col items-center justify-center gap-1.5">
              <ImageIcon className="w-5 h-5 text-stone-400" />
              <span className="text-[11px] text-stone-400">No preview yet</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <PremiumButton
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </PremiumButton>
          <PremiumButton
            loading={saving}
            disabled={saving}
            onClick={() => onSave(trimmed)}
          >
            Save image
          </PremiumButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
