"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Sparkles,
  Star,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Scissors,
  Pencil,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

import { apiGet, apiPost, apiPatch } from "@/lib/api";
import type {
  Customer,
  Order,
  MeasurementSet,
  StyleConcept,
  CustomerFeedback,
} from "@/lib/types";
import {
  ENTRY_SOURCES,
  CUSTOMER_TYPES,
  PREFERRED_STYLES,
  formatCurrency,
  formatDate,
  shortDate,
} from "@/lib/format";
import { useNav } from "@/stores/nav";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AtelierCard } from "@/components/atelier/AtelierCard";
import { StatusBadge } from "@/components/atelier/StatusBadge";

const GENDERS = ["Female", "Male", "Other"];

interface CustomerDetail {
  customer: Customer;
  orders: Order[];
  measurements: MeasurementSet[];
  feedback: CustomerFeedback[];
  styleConcepts: StyleConcept[];
}

export default function CustomerProfile() {
  const { selectedId, go } = useNav();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<CustomerDetail>({
    queryKey: ["customer", selectedId],
    queryFn: () => {
      if (!selectedId) throw new Error("No customer selected");
      return apiGet<CustomerDetail>(`/api/customers/${selectedId}`);
    },
    enabled: !!selectedId,
  });

  if (!selectedId) {
    return (
      <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        <div className="border border-[#E7E5E4] rounded-sm bg-white p-10 text-center">
          <p className="text-stone-500">Select a customer to view their profile.</p>
          <Button
            className="mt-4 bg-[#800020] hover:bg-[#6b0018] text-white border-0 rounded-sm"
            onClick={() => go("customers")}
          >
            Browse Customers
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        <div className="h-9 w-40 bg-stone-100 rounded-sm animate-pulse mb-6" />
        <div className="flex gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-stone-100 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-7 w-56 bg-stone-100 rounded-sm animate-pulse" />
            <div className="h-4 w-72 bg-stone-100 rounded-sm animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-full bg-stone-100 rounded-sm animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        <button
          onClick={() => go("customers")}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#800020] mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </button>
        <div className="border border-[#E7E5E4] rounded-sm bg-white p-10 text-center">
          <p className="text-stone-500">
            We couldn’t load this customer’s profile.
          </p>
          <Button
            variant="outline"
            className="mt-4 rounded-sm border-[#E7E5E4]"
            onClick={() => refetch()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const { customer, orders, measurements, feedback, styleConcepts } = data;

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ["customer", selectedId] });
    qc.invalidateQueries({ queryKey: ["customers"] });
    setEditOpen(false);
    toast.success("Customer updated");
  };

  const handleMeasurementSaved = () => {
    qc.invalidateQueries({ queryKey: ["customer", selectedId] });
    setMeasureOpen(false);
    toast.success("Measurements added");
  };

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
      {/* Back link */}
      <button
        onClick={() => go("customers")}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#800020] mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6 mb-6">
        <div
          className="w-16 h-16 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center text-[#800020] font-display font-semibold text-2xl shrink-0"
          aria-hidden
        >
          {(customer.name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="font-display font-semibold text-[#1C1917]"
              style={{ fontSize: "clamp(24px, 3.5vw, 32px)" }}
            >
              {customer.name}
            </h1>
            {customer.customerType && (
              <StatusBadge status={customer.customerType} />
            )}
            {customer.status && customer.status !== "Active" && (
              <StatusBadge status={customer.status} />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500 mt-1">
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex items-center gap-1 hover:text-[#800020] transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> {customer.phone}
              </a>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="inline-flex items-center gap-1 hover:text-[#800020] transition-colors"
              >
                <Mail className="w-3.5 h-3.5" /> {customer.email}
              </a>
            )}
            {customer.whatsapp && (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> {customer.whatsapp}
              </span>
            )}
            {customer.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {customer.city}
              </span>
            )}
            {!customer.phone &&
              !customer.email &&
              !customer.whatsapp &&
              !customer.city && (
                <span className="italic text-stone-400">No contact info</span>
              )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
            {customer.entrySource && (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  Source
                </span>
                <span className="text-[#1C1917] font-medium">
                  {customer.entrySource}
                </span>
              </span>
            )}
            {customer.referredBy && customer.entrySource === "Referral" && (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  Referred by
                </span>
                <span className="text-[#1C1917] font-medium">
                  {customer.referredBy}
                </span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                Loyalty
              </span>
              <span className="text-[#800020] font-semibold">
                {customer.loyaltyPoints ?? 0} pts
              </span>
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => setEditOpen(true)}
            className="border-[#E7E5E4] rounded-sm"
          >
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          <Button
            onClick={() => go("style-assist", { id: selectedId })}
            className="bg-[#800020] hover:bg-[#6b0018] text-white border-0 rounded-sm"
          >
            <Sparkles className="w-4 h-4" /> Open Style Assist
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white border border-[#E7E5E4] rounded-sm h-auto p-1 overflow-x-auto scroll-slim max-w-full inline-flex w-auto">
          <TabsTrigger value="overview" className="rounded-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="measurements" className="rounded-sm">
            Measurements
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-sm">
            Orders
          </TabsTrigger>
          <TabsTrigger value="style" className="rounded-sm">
            Style
          </TabsTrigger>
          <TabsTrigger value="notes" className="rounded-sm">
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <AtelierCard title="Profile" className="lg:col-span-2">
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Fact label="Customer Since" value={formatDate(customer.createdAt)} />
                <Fact label="Occupation" value={customer.occupation} />
                <Fact label="Gender" value={customer.gender} />
                <Fact
                  label="Height / Weight"
                  value={
                    customer.height || customer.weight
                      ? `${customer.height ?? "—"} cm / ${customer.weight ?? "—"} kg`
                      : null
                  }
                />
                <Fact label="Preferred Fit" value={customer.preferredFit} />
                <Fact label="Skin Tone" value={customer.skinTone} />
              </dl>
            </AtelierCard>
            <AtelierCard title="Style Snapshot">
              <div className="space-y-3 text-sm">
                <StyleRow
                  label="Favourite Colours"
                  value={customer.favouriteColours}
                />
                <StyleRow
                  label="Colours to Avoid"
                  value={customer.coloursToAvoid}
                />
                <StyleRow
                  label="Favourite Fabrics"
                  value={customer.favouriteFabrics}
                />
                <StyleRow
                  label="Preferred Styles"
                  value={customer.preferredStyles}
                />
              </div>
            </AtelierCard>
          </div>

          {feedback.length > 0 && (
            <AtelierCard title="Recent Feedback" className="mt-4">
              <ul className="space-y-3">
                {feedback.slice(0, 5).map((f) => (
                  <li
                    key={f.id}
                    className="border-l-2 border-[#E7E5E4] pl-3"
                  >
                    <div className="flex items-center gap-2">
                      <Stars value={f.rating} />
                      <span className="text-[10px] uppercase tracking-wider text-stone-400">
                        {f.type}
                      </span>
                      <span className="text-xs text-stone-400 ml-auto">
                        {formatDate(f.date)}
                      </span>
                    </div>
                    {f.feedback && (
                      <p className="text-sm text-stone-600 mt-1">
                        {f.feedback}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </AtelierCard>
          )}
        </TabsContent>

        {/* Measurements */}
        <TabsContent value="measurements" className="mt-4">
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-sm text-stone-500">
              {measurements.length} measurement{" "}
              {measurements.length === 1 ? "set" : "sets"}
            </p>
            <Button
              onClick={() => setMeasureOpen(true)}
              className="bg-[#800020] hover:bg-[#6b0018] text-white border-0 rounded-sm"
            >
              <Plus className="w-4 h-4" /> Add Measurement
            </Button>
          </div>
          {measurements.length === 0 ? (
            <EmptyState
              icon={<Scissors className="w-5 h-5" />}
              title="No measurements recorded"
              subtitle="Add this customer's first measurement set."
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {measurements.map((m) => (
                <AtelierCard key={m.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-[#1C1917]">
                      {formatDate(m.dateTaken)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-stone-400">
                      {m.unit}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <Meas label="Bust" value={m.bust} unit={m.unit} />
                    <Meas label="Waist" value={m.waist} unit={m.unit} />
                    <Meas label="Hip" value={m.hip} unit={m.unit} />
                    <Meas label="Shoulder" value={m.shoulder} unit={m.unit} />
                    <Meas label="Length" value={m.length} unit={m.unit} />
                    <Meas label="Sleeve" value={m.sleeve} unit={m.unit} />
                  </div>
                  {m.notes && (
                    <p className="text-xs text-stone-500 mt-3 italic">
                      {m.notes}
                    </p>
                  )}
                </AtelierCard>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders" className="mt-4">
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-sm text-stone-500">
              {orders.length} {orders.length === 1 ? "order" : "orders"}
            </p>
            <Button
              onClick={() =>
                go("new-order", { params: { customerId: selectedId } })
              }
              className="bg-[#800020] hover:bg-[#6b0018] text-white border-0 rounded-sm"
            >
              <Plus className="w-4 h-4" /> New Order for{" "}
              {customer.name.split(" ")[0]}
            </Button>
          </div>
          {orders.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="w-5 h-5" />}
              title="No orders yet"
              subtitle="Start a new order for this customer."
            />
          ) : (
            <div className="border border-[#E7E5E4] rounded-sm bg-white divide-y divide-[#E7E5E4] overflow-hidden">
              {orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => go("order", { id: o.id })}
                  className="w-full flex flex-wrap items-center gap-3 p-4 text-left hover:bg-[#FBF9F7] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#1C1917] truncate">
                      {o.garmentDesign}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 mt-0.5">
                      <span>Ordered {shortDate(o.orderDate)}</span>
                      {o.assignedStaff && (
                        <span>· {o.assignedStaff.fullName}</span>
                      )}
                      {o.deliveryDate && (
                        <span>· Due {shortDate(o.deliveryDate)}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                  <div className="text-right">
                    <div className="text-sm font-semibold text-[#1C1917]">
                      {formatCurrency(o.sellingPrice)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Style */}
        <TabsContent value="style" className="mt-4">
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-sm text-stone-500">
              {styleConcepts.filter((c) => c.status !== "Rejected").length}{" "}
              active{" "}
              {styleConcepts.filter((c) => c.status !== "Rejected").length === 1
                ? "concept"
                : "concepts"}
            </p>
            <Button
              onClick={() => go("style-assist", { id: selectedId })}
              className="bg-[#800020] hover:bg-[#6b0018] text-white border-0 rounded-sm"
            >
              <Sparkles className="w-4 h-4" /> Generate Concepts
            </Button>
          </div>
          {styleConcepts.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="w-5 h-5" />}
              title="No saved concepts yet"
              subtitle="Try Style Assist to generate AI concepts for this customer."
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {styleConcepts.map((c) => (
                <AtelierCard
                  key={c.id}
                  className={cn(c.status === "Rejected" && "opacity-60")}
                  bodyClassName="p-0"
                >
                  {c.imageUrl && (
                    <div className="border-b border-[#E7E5E4]">
                      <img
                        src={c.imageUrl}
                        alt={c.conceptName}
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-medium text-[#1C1917] leading-tight">
                        {c.conceptName}
                      </div>
                      {typeof c.matchPercent === "number" && (
                        <span className="shrink-0 text-[10px] uppercase tracking-wider bg-[#800020]/10 text-[#800020] px-1.5 py-0.5 rounded-sm border border-[#800020]/30">
                          {c.matchPercent}% match
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <StatusBadge status={c.status} />
                      {c.garmentType && (
                        <span className="text-[10px] uppercase tracking-wider text-stone-400">
                          {c.garmentType}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 space-y-0.5 mb-2">
                      {c.silhouette && (
                        <div>
                          <span className="text-stone-400">Silhouette:</span>{" "}
                          {c.silhouette}
                        </div>
                      )}
                      {c.fabric && (
                        <div>
                          <span className="text-stone-400">Fabric:</span>{" "}
                          {c.fabric}
                        </div>
                      )}
                      {c.colour && (
                        <div>
                          <span className="text-stone-400">Colour:</span>{" "}
                          {c.colour}
                        </div>
                      )}
                    </div>
                    {c.whyThisMayWork && (
                      <p className="text-xs text-stone-600 italic border-l-2 border-[#E7E5E4] pl-2">
                        {c.whyThisMayWork}
                      </p>
                    )}
                  </div>
                </AtelierCard>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <AtelierCard
              title="General Notes"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                  className="text-xs h-7 text-[#800020] hover:bg-[#800020]/5"
                >
                  Edit
                </Button>
              }
            >
              <p className="text-sm text-stone-600 whitespace-pre-wrap">
                {customer.notes || (
                  <span className="italic text-stone-400">
                    No notes recorded.
                  </span>
                )}
              </p>
            </AtelierCard>
            <AtelierCard
              title="Style Notes"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                  className="text-xs h-7 text-[#800020] hover:bg-[#800020]/5"
                >
                  Edit
                </Button>
              }
            >
              <p className="text-sm text-stone-600 whitespace-pre-wrap">
                {customer.styleNotes || (
                  <span className="italic text-stone-400">
                    No style notes recorded.
                  </span>
                )}
              </p>
            </AtelierCard>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EditPersonalDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSaved={handleSaved}
      />
      <AddMeasurementDialog
        open={measureOpen}
        onOpenChange={setMeasureOpen}
        customerId={selectedId}
        onSaved={handleMeasurementSaved}
      />
    </div>
  );
}

/* ---------- Small presentation helpers ---------- */

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i < value
              ? "fill-amber-400 text-amber-400"
              : "fill-stone-200 text-stone-200"
          )}
        />
      ))}
    </span>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
        {label}
      </dt>
      <dd className="text-sm text-[#1C1917] mt-0.5">{value || "—"}</dd>
    </div>
  );
}

function StyleRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-0.5">
        {label}
      </div>
      <div className="text-[#1C1917]">{value || "—"}</div>
    </div>
  );
}

function Meas({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-stone-400">
        {label}
      </div>
      <div className="text-[#1C1917] font-medium">
        {value != null ? `${value} ${unit}` : "—"}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border border-[#E7E5E4] rounded-sm bg-white p-8 text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] text-[#800020] mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium text-[#1C1917]">{title}</p>
      {subtitle && <p className="text-xs text-stone-500 mt-1">{subtitle}</p>}
    </div>
  );
}

/* ---------- Edit Personal Dialog (reuses Add form, prefilled) ---------- */

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  gender: string;
  city: string;
  entrySource: string;
  referredBy: string;
  customerType: string;
  preferredStyles: string;
  notes: string;
}

function buildFormFromCustomer(c: Customer): CustomerForm {
  return {
    name: c.name || "",
    phone: c.phone || "",
    email: c.email || "",
    gender: c.gender || "",
    city: c.city || "",
    entrySource: c.entrySource || "",
    referredBy: c.referredBy || "",
    customerType: c.customerType || "",
    preferredStyles: c.preferredStyles || "",
    notes: c.notes || "",
  };
}

function EditPersonalDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer: Customer;
  onSaved: () => void;
}) {
  // Re-initialise the form whenever the dialog opens so we always start from the persisted customer.
  const [form, setForm] = useState<CustomerForm>(() =>
    buildFormFromCustomer(customer)
  );
  const [saving, setSaving] = useState(false);

  // Re-sync when the customer changes or the dialog opens.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setForm(buildFormFromCustomer(customer));
  }

  const set = <K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        gender: form.gender || null,
        city: form.city.trim() || null,
        entrySource: form.entrySource || null,
        customerType: form.customerType || null,
        preferredStyles: form.preferredStyles.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (form.entrySource === "Referral") {
        body.referredBy = form.referredBy.trim() || null;
      }
      await apiPatch(`/api/customers/${customer.id}`, body);
      onSaved();
    } catch (err) {
      toast.error("Failed to update customer", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto scroll-slim rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Edit Customer
          </DialogTitle>
          <DialogDescription className="text-stone-500">
            Update personal details for {customer.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="e-name">
              Name <span className="text-[#800020]">*</span>
            </Label>
            <Input
              id="e-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="rounded-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="e-phone">Phone</Label>
              <Input
                id="e-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="rounded-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-email">Email</Label>
              <Input
                id="e-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="rounded-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Gender</Label>
              <Select
                value={form.gender || undefined}
                onValueChange={(v) => set("gender", v)}
              >
                <SelectTrigger className="w-full rounded-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-city">City</Label>
              <Input
                id="e-city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className="rounded-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Entry Source</Label>
              <Select
                value={form.entrySource || undefined}
                onValueChange={(v) => set("entrySource", v)}
              >
                <SelectTrigger className="w-full rounded-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Customer Type</Label>
              <Select
                value={form.customerType || undefined}
                onValueChange={(v) => set("customerType", v)}
              >
                <SelectTrigger className="w-full rounded-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.entrySource === "Referral" && (
            <div className="grid gap-2">
              <Label htmlFor="e-referred">Referred By</Label>
              <Input
                id="e-referred"
                value={form.referredBy}
                onChange={(e) => set("referredBy", e.target.value)}
                className="rounded-sm"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="e-styles">Preferred Styles</Label>
            <Input
              id="e-styles"
              value={form.preferredStyles}
              onChange={(e) => set("preferredStyles", e.target.value)}
              placeholder="e.g. Classic, Elegant"
              className="rounded-sm"
            />
            <p className="text-xs text-stone-400">
              Comma-separated. Suggestions: {PREFERRED_STYLES.join(", ")}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="e-notes">Notes</Label>
            <Textarea
              id="e-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="rounded-sm"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="rounded-sm border-[#E7E5E4]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#800020] hover:bg-[#6b0018] text-white border-0 rounded-sm"
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Add Measurement Dialog ---------- */

interface MeasurementForm {
  bust: string;
  waist: string;
  hip: string;
  shoulder: string;
  length: string;
  sleeve: string;
  notes: string;
}

const EMPTY_MEAS: MeasurementForm = {
  bust: "",
  waist: "",
  hip: "",
  shoulder: "",
  length: "",
  sleeve: "",
  notes: "",
};

function AddMeasurementDialog({
  open,
  onOpenChange,
  customerId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: string;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MeasurementForm>(EMPTY_MEAS);

  const set = <K extends keyof MeasurementForm>(
    key: K,
    value: MeasurementForm[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleOpenChange = (v: boolean) => {
    if (!v) setForm(EMPTY_MEAS);
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const num = (v: string) => (v === "" ? null : Number(v));
      await apiPost("/api/measurements", {
        customerId,
        unit: "cm",
        bust: num(form.bust),
        waist: num(form.waist),
        hip: num(form.hip),
        shoulder: num(form.shoulder),
        length: num(form.length),
        sleeve: num(form.sleeve),
        notes: form.notes.trim() || null,
      });
      onSaved();
    } catch (err) {
      toast.error("Failed to save measurements", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof Omit<MeasurementForm, "notes">; label: string }[] = [
    { key: "bust", label: "Bust" },
    { key: "waist", label: "Waist" },
    { key: "hip", label: "Hip" },
    { key: "shoulder", label: "Shoulder" },
    { key: "length", label: "Length" },
    { key: "sleeve", label: "Sleeve" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Add Measurements
          </DialogTitle>
          <DialogDescription className="text-stone-500">
            All values in centimetres (cm).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {fields.map(({ key, label }) => (
              <div key={key} className="grid gap-2">
                <Label htmlFor={`m-${key}`}>{label}</Label>
                <Input
                  id={`m-${key}`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder="0"
                  className="rounded-sm"
                />
              </div>
            ))}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="m-notes">Notes</Label>
            <Textarea
              id="m-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              className="rounded-sm"
              placeholder="Optional notes…"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
              className="rounded-sm border-[#E7E5E4]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#800020] hover:bg-[#6b0018] text-white border-0 rounded-sm"
            >
              {saving ? "Saving…" : "Save Measurements"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
