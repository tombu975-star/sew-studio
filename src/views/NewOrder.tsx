"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil, TrendingUp } from "lucide-react";

import { apiGet, apiPost } from "@/lib/api";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";
import { ORDER_STATUSES, PRIORITY_LEVELS, todayISO, formatCurrency } from "@/lib/format";
import type { Customer, Order, User } from "@/lib/types";

import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { AnimatedNumber } from "@/components/atelier/AnimatedNumber";
import { EmptyState } from "@/components/atelier/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, Lock } from "lucide-react";

export default function NewOrder() {
  const { go, params } = useNav();
  const qc = useQueryClient();
  const { canCreateOrders } = useRole();
  const canCreate = canCreateOrders();

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => apiGet<Customer[]>("/api/customers"),
  });
  const { data: users } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiGet<User[]>("/api/users"),
  });

  // Prefill from params (decode garment if present)
  const decodedGarment = useMemo(() => {
    if (!params.garment) return "";
    try {
      return decodeURIComponent(params.garment);
    } catch {
      return params.garment;
    }
  }, [params.garment]);

  const [customerId, setCustomerId] = useState(params.customerId || "");
  const [garmentDesign, setGarmentDesign] = useState(decodedGarment);
  const [designImage, setDesignImage] = useState("");
  const [orderDate, setOrderDate] = useState(todayISO());
  const [deliveryDate, setDeliveryDate] = useState("");
  const [status, setStatus] = useState<string>("Enquiry");
  const [assignedStaffId, setAssignedStaffId] = useState<string>("none");
  const [sellingPrice, setSellingPrice] = useState("");
  const [fabricCost, setFabricCost] = useState("");
  const [labourCost, setLabourCost] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [notes, setNotes] = useState("");

  const estMargin = useMemo(() => {
    const s = Number(sellingPrice) || 0;
    const f = Number(fabricCost) || 0;
    const l = Number(labourCost) || 0;
    return s - f - l;
  }, [sellingPrice, fabricCost, labourCost]);

  const createMut = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        customerId,
        garmentDesign: garmentDesign.trim(),
        orderDate,
        status,
        priority,
        sellingPrice: Number(sellingPrice) || 0,
        fabricCost: Number(fabricCost) || 0,
        labourCost: Number(labourCost) || 0,
        notes: notes.trim() || undefined,
      };
      if (deliveryDate) body.deliveryDate = deliveryDate;
      if (assignedStaffId && assignedStaffId !== "none")
        body.assignedStaffId = assignedStaffId;
      if (designImage.trim()) body.designImage = designImage.trim();
      return apiPost<Order>("/api/orders", body);
    },
    onSuccess: async (created) => {
      toast.success("Order created");
      await qc.invalidateQueries({ queryKey: ["orders"] });
      go("order", { id: created.id });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = !!customerId && !!garmentDesign.trim() && !!orderDate;

  // Safety-net guard: only owners can create orders. The nav hides this view
  // from non-owners, but if a trainee/staff reaches it directly we render an
  // EmptyState instead of the form.
  if (!canCreate) {
    return (
      <div className="p-5 md:p-8 max-w-[820px] mx-auto w-full">
        <button
          onClick={() => go("orders")}
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#800020] transition mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
        </button>
        <PageHeader
          eyebrow="New commission"
          eyebrowIcon={Pencil}
          title="New Custom Order"
          subtitle="Capture every detail so production can begin."
        />
        <SectionCard>
          <EmptyState
            icon={Lock}
            title="You don't have permission to create orders"
            description="Only the studio owner can commission new orders. If you believe this is a mistake, please speak with Madam."
            action={
              <PremiumButton
                variant="outline"
                size="sm"
                onClick={() => go("dashboard")}
              >
                Back to dashboard
              </PremiumButton>
            }
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-[820px] mx-auto w-full">
      <button
        onClick={() => go("orders")}
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#800020] transition mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
      </button>

      <PageHeader
        eyebrow="New commission"
        eyebrowIcon={Pencil}
        title="New Custom Order"
        subtitle="Capture every detail so production can begin."
      />

      <SectionCard title="Order Details" className="animate-fade-in-up">
        <div className="space-y-5">
          {/* Customer */}
          <div>
            <Label>
              Customer <span className="text-[#800020]">*</span>
            </Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="rounded-md mt-1.5 w-full bg-white">
                <SelectValue placeholder="Select a customer…" />
              </SelectTrigger>
              <SelectContent>
                {(customers || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {customers && customers.length === 0 && (
              <p className="text-[11px] text-stone-400 mt-1">
                No customers found. Add one from the Customers view.
              </p>
            )}
          </div>

          {/* Garment */}
          <div>
            <Label>
              Garment Design <span className="text-[#800020]">*</span>
            </Label>
            <Textarea
              value={garmentDesign}
              onChange={(e) => setGarmentDesign(e.target.value)}
              rows={3}
              placeholder="Describe the garment: silhouette, fabric, detailing…"
              className="rounded-md mt-1.5"
            />
          </div>

          {/* Design image URL (optional, with live preview) */}
          <div>
            <Label>Design Image URL</Label>
            <Input
              value={designImage}
              onChange={(e) => setDesignImage(e.target.value)}
              placeholder="https://… (optional)"
              className="rounded-md mt-1.5"
            />
            <p className="text-[11px] text-stone-400 mt-1.5">
              Paste a photo or illustration URL to attach a style reference to this order.
            </p>
            {designImage.trim() && (
              <div className="mt-3 aspect-video rounded-lg overflow-hidden bg-[#FBF9F7] border border-[#E7E5E4] animate-fade-in">
                <img
                  src={designImage.trim()}
                  alt="Design preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {!designImage.trim() && (
              <div className="mt-3 aspect-video rounded-lg border-2 border-dashed border-[#E7E5E4] bg-[#FBF9F7] flex flex-col items-center justify-center gap-1.5">
                <ImageIcon className="w-5 h-5 text-stone-400" />
                <span className="text-[11px] text-stone-400">Live preview will appear here</span>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>
                Order Date <span className="text-[#800020]">*</span>
              </Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="rounded-md mt-1.5"
              />
            </div>
            <div>
              <Label>Delivery Date</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="rounded-md mt-1.5"
              />
            </div>
          </div>

          {/* Status + Staff */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-md mt-1.5 w-full bg-white">
                  <SelectValue />
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
            <div>
              <Label>Assigned Staff</Label>
              <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
                <SelectTrigger className="rounded-md mt-1.5 w-full bg-white">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(users || []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Selling Price (GHS)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0"
                className="rounded-md mt-1.5 tabular-nums"
              />
            </div>
            <div>
              <Label>Fabric Cost (GHS)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={fabricCost}
                onChange={(e) => setFabricCost(e.target.value)}
                placeholder="0"
                className="rounded-md mt-1.5 tabular-nums"
              />
            </div>
            <div>
              <Label>Labour Cost (GHS)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={labourCost}
                onChange={(e) => setLabourCost(e.target.value)}
                placeholder="0"
                className="rounded-md mt-1.5 tabular-nums"
              />
            </div>
          </div>

          {/* Live margin preview */}
          {(sellingPrice || fabricCost || labourCost) && (
            <div
              className={cn(
                "flex items-center justify-between gap-3 p-4 rounded-md border elevate-sm animate-fade-in",
                estMargin >= 0
                  ? "bg-emerald-50/60 border-emerald-200"
                  : "bg-amber-50/60 border-amber-200"
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    estMargin >= 0
                      ? "bg-emerald-100"
                      : "bg-amber-100"
                  )}
                >
                  <TrendingUp
                    className={cn(
                      "w-4 h-4",
                      estMargin >= 0 ? "text-emerald-600" : "text-amber-600"
                    )}
                  />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-semibold">
                    Estimated Margin
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Selling − Fabric − Labour
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "font-display font-semibold tabular-nums",
                  estMargin >= 0 ? "text-emerald-700" : "text-amber-700"
                )}
                style={{ fontSize: "clamp(22px, 2.6vw, 28px)" }}
              >
                <AnimatedNumber value={estMargin} format="currency" duration={400} />
              </div>
            </div>
          )}

          {/* Priority */}
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="rounded-md mt-1.5 w-full sm:w-[220px] bg-white">
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

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any special instructions, deadlines, references…"
              className="rounded-md mt-1.5"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[#E7E5E4]/70">
            <PremiumButton
              variant="outline"
              onClick={() => go("orders")}
              disabled={createMut.isPending}
            >
              Cancel
            </PremiumButton>
            <PremiumButton
              className="w-full sm:w-auto"
              loading={createMut.isPending}
              disabled={!valid || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Saving…" : "Create Order"}
            </PremiumButton>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
