"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

import { apiGet, apiPost } from "@/lib/api";
import { useNav } from "@/stores/nav";
import { ORDER_STATUSES, PRIORITY_LEVELS, todayISO } from "@/lib/format";
import type { Customer, Order, User } from "@/lib/types";

import { AtelierCard } from "@/components/atelier/AtelierCard";
import { Button } from "@/components/ui/button";
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

export default function NewOrder() {
  const { go, params } = useNav();
  const qc = useQueryClient();

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
  const [orderDate, setOrderDate] = useState(todayISO());
  const [deliveryDate, setDeliveryDate] = useState("");
  const [status, setStatus] = useState<string>("Enquiry");
  const [assignedStaffId, setAssignedStaffId] = useState<string>("none");
  const [sellingPrice, setSellingPrice] = useState("");
  const [fabricCost, setFabricCost] = useState("");
  const [labourCost, setLabourCost] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [notes, setNotes] = useState("");

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

  return (
    <div className="p-5 md:p-8 max-w-[800px] mx-auto w-full">
      <button
        onClick={() => go("orders")}
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#800020] transition mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
      </button>

      <h1
        className="font-display font-semibold text-[#1C1917] leading-tight mb-1"
        style={{ fontSize: "clamp(26px, 3.6vw, 34px)" }}
      >
        New Custom Order
      </h1>
      <p className="text-sm text-stone-500 mb-6">
        Capture every detail so production can begin.
      </p>

      <AtelierCard title="Order details">
        <div className="space-y-5">
          {/* Customer */}
          <div>
            <Label>
              Customer <span className="text-[#800020]">*</span>
            </Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="rounded-sm mt-1.5 w-full">
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
              className="rounded-sm mt-1.5"
            />
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
                className="rounded-sm mt-1.5"
              />
            </div>
            <div>
              <Label>Delivery Date</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="rounded-sm mt-1.5"
              />
            </div>
          </div>

          {/* Status + Staff */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-sm mt-1.5 w-full">
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
                <SelectTrigger className="rounded-sm mt-1.5 w-full">
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
                className="rounded-sm mt-1.5"
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
                className="rounded-sm mt-1.5"
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
                className="rounded-sm mt-1.5"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="rounded-sm mt-1.5 w-full sm:w-[200px]">
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
              className="rounded-sm mt-1.5"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#E7E5E4]">
            <Button
              variant="outline"
              className="rounded-sm"
              onClick={() => go("orders")}
              disabled={createMut.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-1.5"
              disabled={!valid || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              {createMut.isPending ? "Saving…" : "Create Order"}
            </Button>
          </div>
        </div>
      </AtelierCard>
    </div>
  );
}
