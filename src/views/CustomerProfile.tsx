"use client";

import { useEffect, useMemo, useState } from "react";
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
  Ruler,
  Users,
  Pencil,
  ShoppingBag,
  Check,
  Save,
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

import { MeasurementsPanel } from "@/components/atelier/MeasurementsPanel";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { AnimatedNumber } from "@/components/atelier/AnimatedNumber";
import {
  EmptyState,
  SkeletonCard,
  SkeletonList,
} from "@/components/atelier/EmptyState";

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
        <SectionCard bodyClassName="p-0">
          <EmptyState
            icon={Users}
            title="Select a customer"
            description="Choose a client from your roster to view their profile, orders, and style details."
            action={
              <PremiumButton
                variant="primary"
                size="sm"
                onClick={() => go("customers")}
              >
                <Users className="w-4 h-4" /> Browse Customers
              </PremiumButton>
            }
          />
        </SectionCard>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        <div className="h-4 w-32 bg-stone-100 rounded shimmer mb-4" />
        <div className="rounded-xl surface-premium border border-[#E7E5E4] p-6 mb-6 flex gap-5 elevate-sm">
          <div className="w-16 h-16 rounded-full shimmer" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-56 shimmer rounded" />
            <div className="h-4 w-80 shimmer rounded" />
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="mt-4">
          <SkeletonList rows={3} />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        <button
          onClick={() => go("customers")}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#800020] mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Customers
        </button>
        <SectionCard bodyClassName="p-0">
          <EmptyState
            icon={Users}
            title="We couldn't load this profile"
            description="Something went wrong fetching this customer. Please try again."
            action={
              <PremiumButton
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                Try again
              </PremiumButton>
            }
          />
        </SectionCard>
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

  const firstName = (customer.name || "").split(" ")[0] || customer.name;

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
      {/* Back link */}
      <button
        onClick={() => go("customers")}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#800020] mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Customers
      </button>

      {/* Premium customer header (hero band) */}
      <div className="rounded-xl surface-premium border border-[#E7E5E4] elevate-md p-6 mb-6 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          <div
            className="w-16 h-16 rounded-full bg-gradient-to-br from-[#800020] to-[#6b0018] flex items-center justify-center text-white font-display font-semibold text-2xl shrink-0 shadow-md"
            aria-hidden
          >
            {(customer.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="font-display font-semibold text-[#1C1917] leading-[1.05]"
              style={{ fontSize: "clamp(28px, 4vw, 36px)" }}
            >
              {customer.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500 mt-2">
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="inline-flex items-center gap-1.5 hover:text-[#800020] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" /> {customer.phone}
                </a>
              )}
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="inline-flex items-center gap-1.5 hover:text-[#800020] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" /> {customer.email}
                </a>
              )}
              {customer.whatsapp && (
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> {customer.whatsapp}
                </span>
              )}
              {customer.city && (
                <span className="inline-flex items-center gap-1.5">
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
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {customer.customerType && (
                <StatusBadge status={customer.customerType} />
              )}
              {customer.entrySource && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#FBF9F7] border border-[#E7E5E4] px-2 py-0.5 text-[11px] text-stone-600">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-stone-400">
                    Source
                  </span>
                  <span className="font-medium text-[#1C1917]">
                    {customer.entrySource}
                  </span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[#800020]/8 border border-[#800020]/20 px-2 py-0.5 text-[11px] text-[#800020]">
                <Sparkles className="w-3 h-3" />
                <span className="font-semibold">
                  <AnimatedNumber value={customer.loyaltyPoints ?? 0} /> pts
                </span>
              </span>
              {customer.status && customer.status !== "Active" && (
                <StatusBadge status={customer.status} />
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <PremiumButton
              variant="outline"
              size="md"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="w-4 h-4" /> Edit
            </PremiumButton>
            <PremiumButton
              variant="primary"
              size="md"
              onClick={() => go("style-assist", { id: selectedId })}
            >
              <Sparkles className="w-4 h-4" /> Open Style Assist
            </PremiumButton>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white border border-[#E7E5E4] rounded-lg h-auto p-1 overflow-x-auto scroll-slim max-w-full inline-flex w-auto gap-0.5">
          {[
            { v: "overview", l: "Overview" },
            { v: "measurements", l: "Measurements" },
            { v: "orders", l: "Orders" },
            { v: "style", l: "Style" },
            { v: "notes", l: "Notes" },
          ].map((t) => (
            <TabsTrigger
              key={t.v}
              value={t.v}
              className="rounded-md data-[state=active]:bg-[#800020] data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-1.5 text-sm font-medium text-stone-600"
            >
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <SectionCard title="Profile">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <Fact
                  label="Customer Since"
                  value={formatDate(customer.createdAt)}
                />
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
            </SectionCard>
            <SectionCard title="Style Snapshot">
              <div className="space-y-4">
                <ChipList
                  label="Favourite Colours"
                  value={customer.favouriteColours}
                />
                <ChipList
                  label="Colours to Avoid"
                  value={customer.coloursToAvoid}
                />
                <ChipList
                  label="Favourite Fabrics"
                  value={customer.favouriteFabrics}
                />
                <ChipList
                  label="Preferred Styles"
                  value={customer.preferredStyles}
                />
              </div>
            </SectionCard>
          </div>

          {feedback.length > 0 ? (
            <SectionCard title="Recent Feedback" className="mt-4">
              <ul className="space-y-3">
                {feedback.slice(0, 5).map((f) => (
                  <li
                    key={f.id}
                    className="border-l-2 border-[#E7E5E4] pl-3"
                  >
                    <div className="flex items-center gap-2">
                      <Stars value={f.rating} />
                      <span className="text-[10px] uppercase tracking-[0.15em] text-stone-400">
                        {f.type}
                      </span>
                      <span className="text-xs text-stone-400 ml-auto">
                        {formatDate(f.date)}
                      </span>
                    </div>
                    {f.feedback && (
                      <p className="text-sm text-stone-600 mt-1.5">
                        {f.feedback}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : (
            <SectionCard title="Recent Feedback" className="mt-4">
              <EmptyState
                title="No feedback recorded"
                description="Customer testimonials will appear here once captured."
              />
            </SectionCard>
          )}
        </TabsContent>

        {/* Measurements — fixed layout, same for every customer */}
        <TabsContent value="measurements" className="mt-4">
          <MeasurementsPanel
            measurements={measurements}
            onUpdate={() => setMeasureOpen(true)}
          />
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders" className="mt-4">
          <SectionCard
            title={`Orders · ${orders.length}`}
            bodyClassName="p-0"
            action={
              <PremiumButton
                variant="primary"
                size="sm"
                onClick={() =>
                  go("new-order", { params: { customerId: selectedId } })
                }
              >
                <Plus className="w-3.5 h-3.5" /> New Order
              </PremiumButton>
            }
          >
            {orders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No orders yet"
                description={`Start a new order for ${firstName}.`}
                action={
                  <PremiumButton
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      go("new-order", { params: { customerId: selectedId } })
                    }
                  >
                    <Plus className="w-3.5 h-3.5" /> New Order for {firstName}
                  </PremiumButton>
                }
              />
            ) : (
              <div className="divide-y divide-[#E7E5E4]/70">
                {orders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => go("order", { id: o.id })}
                    className="group w-full flex flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-[#faf8f5] transition-all focus:outline-none focus-visible:bg-[#faf8f5]"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center text-[#800020] shrink-0">
                      {o.designImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={o.designImage} alt={`${o.garmentDesign} style`} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-4 h-4" />
                      )}
                    </div>
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
                    <div className="text-right min-w-[90px]">
                      <div className="text-sm font-semibold text-[#1C1917] tabular-nums">
                        {formatCurrency(o.sellingPrice)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Style */}
        <TabsContent value="style" className="mt-4">
          <SectionCard
            title="Saved Concepts"
            action={
              <PremiumButton
                variant="primary"
                size="sm"
                onClick={() => go("style-assist", { id: selectedId })}
              >
                <Sparkles className="w-3.5 h-3.5" /> Generate Concepts
              </PremiumButton>
            }
          >
            {styleConcepts.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No concepts yet — try Style Assist"
                description="Generate AI-powered design concepts tailored to this customer's preferences."
                action={
                  <PremiumButton
                    variant="primary"
                    size="sm"
                    onClick={() => go("style-assist", { id: selectedId })}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Open Style Assist
                  </PremiumButton>
                }
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {styleConcepts.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-lg border border-[#E7E5E4] surface-premium lift overflow-hidden flex flex-col",
                      c.status === "Rejected" && "opacity-60"
                    )}
                  >
                    {c.imageUrl && (
                      <div className="aspect-[3/4] w-full bg-[#FBF9F7] border-b border-[#E7E5E4]">
                        <img
                          src={c.imageUrl}
                          alt={c.conceptName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-display text-base text-[#1C1917] leading-tight">
                          {c.conceptName}
                        </div>
                        {typeof c.matchPercent === "number" && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] bg-[#800020]/10 text-[#800020] px-2 py-0.5 rounded-md border border-[#800020]/25 font-semibold">
                            {c.matchPercent}% match
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <StatusBadge status={c.status} />
                        {c.garmentType && (
                          <span className="text-[10px] uppercase tracking-[0.15em] text-stone-400">
                            {c.garmentType}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 space-y-0.5 mb-3">
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
                        <div className="mt-auto text-xs text-stone-600 italic bg-[#FBF9F7] border border-[#E7E5E4]/70 rounded-md p-2.5">
                          {c.whyThisMayWork}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <NotesCard
              title="General Notes"
              field="notes"
              value={customer.notes}
              customerId={customer.id}
            />
            <NotesCard
              title="Style Notes"
              field="styleNotes"
              value={customer.styleNotes}
              customerId={customer.id}
            />
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
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${value} of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i < value
              ? "fill-[#800020] text-[#800020]"
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
      <dd className="text-sm text-[#1C1917] mt-1">{value || "—"}</dd>
    </div>
  );
}

function ChipList({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const items = useMemo(
    () =>
      (value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [value]
  );
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-1.5">
        {label}
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-stone-300">—</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center rounded-md bg-[#FBF9F7] border border-[#E7E5E4] px-2 py-0.5 text-xs text-stone-700"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Inline notes editor with auto-save ---------- */

function NotesCard({
  title,
  field,
  value,
  customerId,
}: {
  title: string;
  field: "notes" | "styleNotes";
  value: string | null | undefined;
  customerId: string;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
    setDirty(false);
  }, [value]);

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await apiPatch(`/api/customers/${customerId}`, {
        [field]: draft.trim() || null,
      });
      qc.invalidateQueries({ queryKey: ["customer", customerId] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setDirty(false);
      toast.success(`${title} saved`);
    } catch (err) {
      toast.error("Failed to save notes", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title={title}
      action={
        dirty ? (
          <PremiumButton
            variant="primary"
            size="sm"
            onClick={save}
            loading={saving}
          >
            <Save className="w-3.5 h-3.5" /> Save
          </PremiumButton>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
            <Check className="w-3 h-3" /> Saved
          </span>
        )
      }
    >
      <Textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        onBlur={save}
        placeholder={
          field === "styleNotes"
            ? "Capture style preferences, fit notes, do's & don'ts…"
            : "General notes about this customer…"
        }
        rows={6}
        className="rounded-md resize-none"
      />
      <p className="text-[10px] text-stone-400 mt-2 uppercase tracking-[0.15em]">
        Auto-saves on blur
      </p>
    </SectionCard>
  );
}

/* ---------- Edit Personal Dialog (reuses form, prefilled) ---------- */

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
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-[#1C1917]">
            Edit Customer
          </DialogTitle>
          <DialogDescription className="text-stone-500">
            Update personal details for {customer.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="e-name" className="text-xs text-stone-600">
              Name <span className="text-[#800020]">*</span>
            </Label>
            <Input
              id="e-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="h-10 rounded-md"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="e-phone" className="text-xs text-stone-600">
                Phone
              </Label>
              <Input
                id="e-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="h-10 rounded-md"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-email" className="text-xs text-stone-600">
                Email
              </Label>
              <Input
                id="e-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="h-10 rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-stone-600">Gender</Label>
              <Select
                value={form.gender || undefined}
                onValueChange={(v) => set("gender", v)}
              >
                <SelectTrigger className="h-10 rounded-md">
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
              <Label htmlFor="e-city" className="text-xs text-stone-600">
                City
              </Label>
              <Input
                id="e-city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className="h-10 rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-stone-600">Entry Source</Label>
              <Select
                value={form.entrySource || undefined}
                onValueChange={(v) => set("entrySource", v)}
              >
                <SelectTrigger className="h-10 rounded-md">
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
              <Label className="text-xs text-stone-600">Customer Type</Label>
              <Select
                value={form.customerType || undefined}
                onValueChange={(v) => set("customerType", v)}
              >
                <SelectTrigger className="h-10 rounded-md">
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
            <div className="grid gap-2 animate-fade-in">
              <Label htmlFor="e-referred" className="text-xs text-stone-600">
                Referred By
              </Label>
              <Input
                id="e-referred"
                value={form.referredBy}
                onChange={(e) => set("referredBy", e.target.value)}
                className="h-10 rounded-md"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="e-styles" className="text-xs text-stone-600">
              Preferred Styles
            </Label>
            <Input
              id="e-styles"
              value={form.preferredStyles}
              onChange={(e) => set("preferredStyles", e.target.value)}
              placeholder="e.g. Classic, Elegant"
              className="h-10 rounded-md"
            />
            <p className="text-xs text-stone-400">
              Comma-separated. Suggestions: {PREFERRED_STYLES.join(", ")}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="e-notes" className="text-xs text-stone-600">
              Notes
            </Label>
            <Textarea
              id="e-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="rounded-md"
            />
          </div>
          <DialogFooter className="gap-2">
            <PremiumButton
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </PremiumButton>
            <PremiumButton
              type="submit"
              variant="primary"
              size="md"
              loading={saving}
            >
              Save Changes
            </PremiumButton>
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

  const fields: { key: keyof Omit<MeasurementForm, "notes">; label: string }[] =
    [
      { key: "bust", label: "Bust" },
      { key: "waist", label: "Waist" },
      { key: "hip", label: "Hip" },
      { key: "shoulder", label: "Shoulder" },
      { key: "length", label: "Length" },
      { key: "sleeve", label: "Sleeve" },
    ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-[#1C1917]">
            Update Measurements
          </DialogTitle>
          <DialogDescription className="text-stone-500">
            All values in centimetres (cm).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {fields.map(({ key, label }) => (
              <div key={key} className="grid gap-2">
                <Label
                  htmlFor={`m-${key}`}
                  className="text-xs text-stone-600"
                >
                  {label}
                </Label>
                <Input
                  id={`m-${key}`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder="0"
                  className="h-10 rounded-md"
                />
              </div>
            ))}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="m-notes" className="text-xs text-stone-600">
              Notes
            </Label>
            <Textarea
              id="m-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              className="rounded-md"
              placeholder="Optional notes…"
            />
          </div>
          <DialogFooter className="gap-2">
            <PremiumButton
              type="button"
              variant="outline"
              size="md"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </PremiumButton>
            <PremiumButton
              type="submit"
              variant="primary"
              size="md"
              loading={saving}
            >
              Save Measurements
            </PremiumButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
