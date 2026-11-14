"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil, TrendingUp, User as UserIcon, Shirt, CalendarDays, Wallet, Users, Ruler } from "lucide-react";

import { apiGet, apiPost } from "@/lib/api";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";
import { ORDER_STATUSES, PRIORITY_LEVELS, todayISO, formatCurrency, formatDate, orderOverheadMargin, overheadRecoveryRatePercent, defaultMarkupPercent, suggestedPriceFor } from "@/lib/format";
import type { Customer, MeasurementSet, Order, Settings, User } from "@/lib/types";

import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { ImageUpload } from "@/components/atelier/ImageUpload";
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
import { FIELD_BY_KEY, formatValue, toCm } from "@/lib/measurements";
import { Lock } from "lucide-react";

export default function NewOrder({ embedded = false, onClose, onCreated }: { embedded?: boolean; onClose?: () => void; onCreated?: (id: string) => void } = {}) {
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
  const [otherCost, setOtherCost] = useState("");
  // null = use the studio default from Settings until the owner types one.
  const [markupInput, setMarkupInput] = useState<string | null>(null);
  // True once the owner has typed their own final price; until then the price
  // follows the True Costing suggestion as the costs change.
  const [priceEdited, setPriceEdited] = useState(false);
  const [priority, setPriority] = useState<string>("Medium");
  const [notes, setNotes] = useState("");

  const { data: settings } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => apiGet<Settings>("/api/settings"),
  });
  const currency = settings?.currency || "GHS";
  // Standard method: overhead margin = % of the order's non-labour (fabric) cost.
  const overhead = useMemo(
    () => orderOverheadMargin({ fabricCost: Number(fabricCost) || 0 }, settings),
    [fabricCost, settings]
  );
  const overheadRate = useMemo(() => overheadRecoveryRatePercent(settings), [settings]);

  // True Costing: materials + labour + other costs + studio overhead share,
  // then the mark-up on top gives the suggested price.
  const markupPercent = markupInput !== null ? Math.max(0, Number(markupInput) || 0) : defaultMarkupPercent(settings);
  const trueCost = useMemo(
    () => (Number(fabricCost) || 0) + (Number(labourCost) || 0) + (Number(otherCost) || 0) + overhead,
    [fabricCost, labourCost, otherCost, overhead]
  );
  const suggestedPrice = useMemo(() => suggestedPriceFor(trueCost, markupPercent), [trueCost, markupPercent]);
  // The price shown in the field: the owner's own figure once they have typed
  // one, otherwise the live suggestion (blank while there is no cost yet).
  const sellingPriceValue = priceEdited ? sellingPrice : trueCost > 0 ? String(suggestedPrice) : "";
  const priceDiff = (Number(sellingPriceValue) || 0) - suggestedPrice;
  const estMargin = useMemo(() => {
    const s = Number(sellingPriceValue) || 0;
    return s - trueCost;
  }, [sellingPriceValue, trueCost]);

  // The chosen customer's latest measurements, shown beside the form so the
  // order is booked against the actual fit profile.
  const { data: customerDetail } = useQuery<{ measurements: MeasurementSet[] }>({
    queryKey: ["customer", customerId],
    queryFn: () => apiGet<{ measurements: MeasurementSet[] }>(`/api/customers/${customerId}`),
    enabled: !!customerId,
  });
  const latestMeasurement = useMemo(() => {
    const list = customerDetail?.measurements ?? [];
    return [...list].sort((a, b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime())[0];
  }, [customerDetail]);
  const selectedCustomer = (customers || []).find((c) => c.id === customerId);
  const depositPercent = Number(settings?.depositPercent) || 0;
  const price = Number(sellingPriceValue) || 0;
  const depositDue = Math.round(price * depositPercent) / 100;
  const balanceDue = price - depositDue;

  const createMut = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        customerId,
        garmentDesign: garmentDesign.trim(),
        orderDate,
        status,
        priority,
        sellingPrice: Number(sellingPriceValue) || 0,
        fabricCost: Number(fabricCost) || 0,
        labourCost: Number(labourCost) || 0,
        otherCost: Number(otherCost) || 0,
        markupPercent,
        suggestedPrice: trueCost > 0 ? suggestedPrice : null,
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
      if (onCreated) onCreated(created.id);
      else go("order", { id: created.id });
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
    <div className={embedded ? "w-full" : "p-5 md:p-8 max-w-[1180px] mx-auto w-full"}>
      {!embedded && (
        <>
          <button
            onClick={() => go("orders")}
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#800020] transition mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
          </button>

          <PageHeader
            eyebrow="Order booking"
            eyebrowIcon={Pencil}
            title="New Custom Order"
            subtitle="Book the commission, agree the price and deposit, and hand it to production."
          />
        </>
      )}

      <div className={embedded ? "grid gap-5 items-start" : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start"}>
        <div className="space-y-5">
            <SectionCard title="1. Customer" action={<UserIcon className="w-4 h-4 text-stone-400" />} className="animate-fade-in-up">
              <div className="space-y-4">
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
                    <p className="text-xs text-stone-400 mt-1">
                      No customers found. Add one from the Customers view.
                    </p>
                  )}
                </div>
                {customerId && !latestMeasurement && customerDetail && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    No measurements on file for this customer. You can still book the order and record
                    measurements from their profile.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="2. Garment & style" action={<Shirt className="w-4 h-4 text-stone-400" />} className="animate-fade-in-up">
              <div className="space-y-4">
                <div>
                  <Label>
                    Garment description <span className="text-[#800020]">*</span>
                  </Label>
                  <Textarea
                    value={garmentDesign}
                    onChange={(e) => setGarmentDesign(e.target.value)}
                    rows={3}
                    placeholder="Silhouette, fabric, colour, detailing…"
                    className="rounded-md mt-1.5"
                  />
                </div>
                <div>
                  <Label>Style reference picture</Label>
                  <div className="mt-1.5">
                    <ImageUpload
                      kind="design"
                      shape="wide"
                      value={designImage}
                      onChange={setDesignImage}
                      label="Upload picture"
                      hint="Photo or sketch of the style · optional"
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="3. Schedule & priority" action={<CalendarDays className="w-4 h-4 text-stone-400" />} className="animate-fade-in-up">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>
                      Order date <span className="text-[#800020]">*</span>
                    </Label>
                    <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="rounded-md mt-1.5" />
                  </div>
                  <div>
                    <Label>Promised delivery date</Label>
                    <Input type="date" min={orderDate} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="rounded-md mt-1.5" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="rounded-md mt-1.5 w-full bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((st) => (
                          <SelectItem key={st} value={st}>
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="rounded-md mt-1.5 w-full bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_LEVELS.map((pr) => (
                          <SelectItem key={pr} value={pr}>
                            {pr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="4. Pricing · True Costing" action={<Wallet className="w-4 h-4 text-stone-400" />} className="animate-fade-in-up">
              <div className="space-y-4">
                <p className="text-xs text-stone-500">
                  Enter what this job really costs. We add your studio overhead and your mark-up to suggest a price.
                  You can change the final price whenever you like.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Materials / fabric ({currency})</Label>
                    <Input type="number" inputMode="decimal" min="0" value={fabricCost} onChange={(e) => setFabricCost(e.target.value)} placeholder="0" className="rounded-md mt-1.5 tabular-nums" />
                  </div>
                  <div>
                    <Label>Labour ({currency})</Label>
                    <Input type="number" inputMode="decimal" min="0" value={labourCost} onChange={(e) => setLabourCost(e.target.value)} placeholder="0" className="rounded-md mt-1.5 tabular-nums" />
                  </div>
                  <div>
                    <Label>Other costs ({currency})</Label>
                    <Input type="number" inputMode="decimal" min="0" value={otherCost} onChange={(e) => setOtherCost(e.target.value)} placeholder="Thread, zips, transport…" className="rounded-md mt-1.5 tabular-nums" />
                  </div>
                </div>

                <dl className="rounded-md border border-[#EEDFE3] bg-[#FCF8F9] px-4 py-3 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-stone-500">
                      Studio overhead share
                      <span className="block text-xs text-stone-400">
                        {overheadRate > 0 ? `${overheadRate.toFixed(1)}% of materials cost, added automatically` : "Flat per-order overhead from Settings"}
                      </span>
                    </dt>
                    <dd className="font-medium tabular-nums text-[#2F151B]">{formatCurrency(overhead, currency)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-[#EEDFE3] pt-1.5">
                    <dt className="font-medium text-[#2F151B]">True cost</dt>
                    <dd className="font-semibold tabular-nums text-[#2F151B]">{formatCurrency(trueCost, currency)}</dd>
                  </div>
                </dl>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Mark-up on true cost (%)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.5"
                      value={markupInput ?? String(markupPercent)}
                      onChange={(e) => setMarkupInput(e.target.value)}
                      className="rounded-md mt-1.5 tabular-nums"
                    />
                    <p className="text-xs text-stone-400 mt-1">Starts from the default set in Settings.</p>
                  </div>
                  <div>
                    <Label>Suggested price ({currency})</Label>
                    <div className="mt-1.5 flex h-9 items-center rounded-md border border-[#EEDFE3] bg-white px-3 text-sm font-semibold tabular-nums text-[#800020]">
                      {trueCost > 0 ? formatCurrency(suggestedPrice, currency) : "Add costs to see a price"}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Final selling price ({currency})</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={sellingPriceValue}
                    onChange={(e) => {
                      setPriceEdited(true);
                      setSellingPrice(e.target.value);
                    }}
                    placeholder="0"
                    className="rounded-md mt-1.5 tabular-nums"
                  />
                  {priceEdited && trueCost > 0 ? (
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
                      <span>
                        {priceDiff === 0
                          ? "Matches the suggested price."
                          : `You set this ${formatCurrency(Math.abs(priceDiff), currency)} ${priceDiff > 0 ? "above" : "below"} the suggested price.`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPriceEdited(false);
                          setSellingPrice("");
                        }}
                        className="font-medium text-[#800020] underline underline-offset-2"
                      >
                        Use suggested price
                      </button>
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-stone-400">Filled in from the costs above. Type over it to set your own price.</p>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="5. Production" action={<Users className="w-4 h-4 text-stone-400" />} className="animate-fade-in-up">
              <div className="space-y-4">
                <div>
                  <Label>Assigned to</Label>
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
                <div>
                  <Label>Production notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Special instructions, fittings, references…" className="rounded-md mt-1.5" />
                </div>
              </div>
            </SectionCard>

        </div>

        {/* Order summary */}
        <aside className="lg:sticky lg:top-6 space-y-4">
          <SectionCard title="Order summary" className="animate-fade-in-up">
            <dl className="space-y-2.5">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <dt className="text-stone-500">Customer</dt>
                  <dd className="text-right font-medium text-[#2F151B]">{selectedCustomer?.name || "—"}</dd>
                </div>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <dt className="text-stone-500">Garment</dt>
                  <dd className="text-right font-medium text-[#2F151B]"><span className="line-clamp-2">{garmentDesign.trim() || "—"}</span></dd>
                </div>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <dt className="text-stone-500">Delivery</dt>
                  <dd className="text-right font-medium text-[#2F151B]">{deliveryDate || "Not set"}</dd>
                </div>
            </dl>
            <div className="my-4 h-px bg-[#EEDFE3]" />
            <dl className="space-y-2.5">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <dt className="text-stone-500">Selling price</dt>
                  <dd className="text-right font-medium text-[#2F151B]">{formatCurrency(price, currency)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <dt className="text-stone-500">Deposit due ({depositPercent}%)</dt>
                  <dd className="text-right font-medium text-[#2F151B]">{formatCurrency(depositDue, currency)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <dt className="text-stone-500">Balance on collection</dt>
                  <dd className="text-right font-medium text-[#2F151B]">{formatCurrency(balanceDue, currency)}</dd>
                </div>
            </dl>
            <div className={cn("mt-4 flex items-center justify-between gap-3 rounded-md border p-3", estMargin >= 0 ? "bg-emerald-50/60 border-emerald-200" : "bg-amber-50/60 border-amber-200")}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] font-semibold text-stone-500">
                <TrendingUp className={cn("w-4 h-4", estMargin >= 0 ? "text-emerald-600" : "text-amber-600")} />
                Est. margin
              </div>
              <div className={cn("font-display font-semibold tabular-nums", estMargin >= 0 ? "text-emerald-700" : "text-amber-700")}>
                <AnimatedNumber value={estMargin} format="currency" currency={currency} duration={400} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-stone-400">Selling price − true cost (materials, labour, other costs and overhead).</p>
          </SectionCard>

          <SectionCard title="Measurements on file" action={<Ruler className="w-4 h-4 text-stone-400" />}>
            {latestMeasurement ? (
                  <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
                    {(["height", "bust", "waist", "hip", "shoulder", "backLength", "sleeve", "inseam"] as const).map((key) => {
                      const raw = (latestMeasurement as unknown as Record<string, number | null | undefined>)[key];
                      const cm = toCm(raw, latestMeasurement.unit);
                      return (
                        <div key={key}>
                          <dt className="text-stone-400">{FIELD_BY_KEY[key].label.replace(/ \(.*\)$/, "")}</dt>
                          <dd className="font-semibold tabular-nums text-[#2F151B]">{cm != null ? `${formatValue(cm, "cm")} cm` : "—"}</dd>
                        </div>
                      );
                    })}
                  </dl>
                ) : (
                  <p className="text-xs text-stone-400">{customerId ? "None recorded yet." : "Select a customer to see their measurements."}</p>
                )}
            {latestMeasurement && (
              <p className="mt-3 text-[11px] text-stone-400">Last measured {formatDate(latestMeasurement.dateTaken)}</p>
            )}
          </SectionCard>

          {!embedded && <div className="flex flex-col gap-2">
            <PremiumButton
              className="w-full"
              loading={createMut.isPending}
              disabled={!valid || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Saving…" : "Create Order"}
            </PremiumButton>
            <PremiumButton variant="outline" className="w-full" onClick={() => (onClose ? onClose() : go("orders"))} disabled={createMut.isPending}>
              Cancel
            </PremiumButton>
          </div>}
        </aside>
      </div>
      {embedded && (
        <div className="sticky bottom-[calc(-1*max(1.5rem,env(safe-area-inset-bottom)))] z-10 -mx-4 mt-5 flex flex-col gap-2 border-t border-[#EEDFE3] bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:flex-row-reverse sm:px-6 [&>button]:min-h-11 sm:[&>button]:w-auto">
            <PremiumButton
              className="w-full sm:w-auto"
              loading={createMut.isPending}
              disabled={!valid || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Saving…" : "Create Order"}
            </PremiumButton>
            <PremiumButton variant="outline" className="w-full sm:w-auto" onClick={() => (onClose ? onClose() : go("orders"))} disabled={createMut.isPending}>
              Cancel
            </PremiumButton>
        </div>
      )}
    </div>
  );
}
