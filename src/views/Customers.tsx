"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  Users,
  Crown,
  Heart,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { apiGet, apiPost } from "@/lib/api";
import type { Customer, Order } from "@/lib/types";
import {
  ENTRY_SOURCES,
  CUSTOMER_TYPES,
  PREFERRED_STYLES,
} from "@/lib/format";
import { useNav } from "@/stores/nav";
import { useAuth } from "@/stores/auth";
import { useRole } from "@/stores/role";

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

import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumMetric } from "@/components/atelier/PremiumMetric";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import {
  EmptyState,
  SkeletonList,
} from "@/components/atelier/EmptyState";

interface CustomerWithCount extends Customer {
  _orderCount?: number;
}

const GENDERS = ["Female", "Male", "Other"];

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

const EMPTY_FORM: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  gender: "",
  city: "",
  entrySource: "",
  referredBy: "",
  customerType: "",
  preferredStyles: "",
  notes: "",
};

const ALL_STYLES = "All Styles";

export default function Customers() {
  const { go } = useNav();
  const { user } = useAuth();
  const { canSeeAllCustomers, canCreateOrders } = useRole();
  // Staff + trainees only see customers whose orders are assigned to them.
  const scopeToMine = !!user && !canSeeAllCustomers();
  const canCreate = canCreateOrders();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery<CustomerWithCount[]>({
    queryKey: ["customers"],
    queryFn: () => apiGet<CustomerWithCount[]>("/api/customers"),
  });

  // Fallback for client-side order counts when the collection endpoint
  // doesn't include `_orderCount`. Also used to derive the visible customer
  // set for staff/trainees (only customers of orders assigned to them).
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/api/orders"),
    retry: false,
  });

  const myCustomerIds = useMemo(() => {
    if (!scopeToMine || !user) return null;
    const set = new Set<string>();
    for (const o of orders) {
      if (o.assignedStaffId === user.id && o.customerId) {
        set.add(o.customerId);
      }
    }
    return set;
  }, [orders, scopeToMine, user]);

  const orderCounts = useMemo(() => {
    const map = new Map<string, number>();
    const visible = scopeToMine && user
      ? orders.filter((o) => o.assignedStaffId === user.id)
      : orders;
    for (const o of visible) {
      map.set(o.customerId, (map.get(o.customerId) ?? 0) + 1);
    }
    return map;
  }, [orders, scopeToMine, user]);

  const enriched = useMemo(
    () =>
      customers
        .filter((c) => !myCustomerIds || myCustomerIds.has(c.id))
        .map((c) => ({
          ...c,
          _orderCount: c._orderCount ?? orderCounts.get(c.id) ?? 0,
        })),
    [customers, orderCounts, myCustomerIds]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((c) => {
      const matchesSearch =
        !q ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q);
      const matchesSource =
        sourceFilter === "all" || (c.entrySource || "Other") === sourceFilter;
      const matchesType =
        typeFilter === "all" || (c.customerType || "") === typeFilter;
      return matchesSearch && matchesSource && matchesType;
    });
  }, [enriched, search, sourceFilter, typeFilter]);

  const sourceBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of enriched) {
      const src = c.entrySource || "Other";
      map.set(src, (map.get(src) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [enriched]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const vips = enriched.filter(
      (c) => (c.customerType || "").toLowerCase().includes("vip")
    ).length;
    const bridal = enriched.filter(
      (c) => (c.customerType || "").toLowerCase().includes("bridal")
    ).length;
    const now = new Date();
    const newThisMonth = enriched.filter((c) => {
      const d = new Date(c.createdAt);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }).length;
    return { total, vips, bridal, newThisMonth };
  }, [enriched]);

  const handleCreated = () => {
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    setAddOpen(false);
    toast.success("Customer added to your roster");
  };

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
      <PageHeader
        eyebrow={scopeToMine ? "My clients" : "Client roster"}
        eyebrowIcon={Users}
        title="Customers"
        subtitle={
          scopeToMine
            ? "Clients whose garments you're working on in the studio."
            : "Everyone who's sat in your chair."
        }
        actions={
          canCreate ? (
            <PremiumButton
              variant="primary"
              size="md"
              onClick={() => setAddOpen(true)}
            >
              <UserPlus className="w-4 h-4" /> Add Customer
            </PremiumButton>
          ) : undefined
        }
      />

      {/* Premium stat strip */}
      {!isLoading && enriched.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-in-up">
          <PremiumMetric
            label="Total Clients"
            value={stats.total}
            icon={Users}
            accent
          />
          <PremiumMetric
            label="VIPs"
            value={stats.vips}
            icon={Crown}
          />
          <PremiumMetric
            label="Bridal"
            value={stats.bridal}
            icon={Heart}
          />
          <PremiumMetric
            label="New This Month"
            value={stats.newThisMonth}
            icon={Sparkles}
          />
        </div>
      )}

      {/* Search + filter bar */}
      <SectionCard bodyClassName="p-4" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <Input
              placeholder="Search by name, phone, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 bg-white border-[#E7E5E4] rounded-md"
              aria-label="Search customers"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-11 bg-white border-[#E7E5E4] rounded-md">
              <SelectValue placeholder="Entry source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {ENTRY_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-11 bg-white border-[#E7E5E4] rounded-md">
              <SelectValue placeholder="Client type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {CUSTOMER_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {/* Client sources breakdown */}
      {sourceBreakdown.length > 0 && (
        <SectionCard title="Client Sources" className="mb-6" bodyClassName="p-4">
          <div className="flex flex-wrap gap-2">
            {sourceBreakdown.map(([src, count]) => (
              <button
                key={src}
                onClick={() =>
                  setSourceFilter((cur) => (cur === src ? "all" : src))
                }
                className={
                  "rounded-lg border px-3 py-2 text-xs flex items-center gap-2 transition-all lift " +
                  (sourceFilter === src
                    ? "border-[#800020]/40 bg-[#800020]/5"
                    : "border-[#E7E5E4] bg-white hover:border-[#800020]/30")
                }
              >
                <span className="text-stone-500">{src}</span>
                <span className="font-semibold text-[#1C1917] tabular-nums">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Customer list */}
      {isLoading ? (
        <SectionCard bodyClassName="p-0">
          <SkeletonList rows={4} />
        </SectionCard>
      ) : filtered.length === 0 ? (
        <SectionCard bodyClassName="p-0">
          <EmptyState
            icon={Users}
            title={
              scopeToMine
                ? "No clients assigned to you yet"
                : search || sourceFilter !== "all" || typeFilter !== "all"
                ? "No customers match your filters"
                : "No customers found"
            }
            description={
              scopeToMine
                ? "When the studio assigns you an order, the client will appear here."
                : search || sourceFilter !== "all" || typeFilter !== "all"
                ? "Try clearing your search or filters."
                : "Add your first customer to start building the roster."
            }
            action={
              !scopeToMine &&
              !search &&
              sourceFilter === "all" &&
              typeFilter === "all" &&
              canCreate ? (
                <PremiumButton
                  variant="primary"
                  size="sm"
                  onClick={() => setAddOpen(true)}
                >
                  <UserPlus className="w-4 h-4" /> Add Customer
                </PremiumButton>
              ) : !scopeToMine &&
                (search || sourceFilter !== "all" || typeFilter !== "all") ? (
                <PremiumButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setSourceFilter("all");
                    setTypeFilter("all");
                  }}
                >
                  Clear filters
                </PremiumButton>
              ) : undefined
            }
          />
        </SectionCard>
      ) : (
        <SectionCard bodyClassName="p-0">
          <div className="divide-y divide-[#E7E5E4]/70">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => go("customer", { id: c.id })}
                className="group w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#faf8f5] transition-all focus:outline-none focus-visible:bg-[#faf8f5]"
              >
                <div
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-[#800020] to-[#6b0018] flex items-center justify-center text-white font-display font-semibold text-lg shrink-0 shadow-sm"
                  aria-hidden
                >
                  {(c.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1C1917] truncate">
                    {c.name}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mt-1">
                    {c.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                        <Mail className="w-3 h-3 shrink-0" /> {c.email}
                      </span>
                    )}
                    {c.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {c.city}
                      </span>
                    )}
                    {!c.phone && !c.email && !c.city && (
                      <span className="italic">No contact info</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] px-2.5 py-1 text-[11px] text-stone-600">
                    <span className="font-semibold tabular-nums text-[#1C1917]">
                      {c._orderCount}
                    </span>
                    <span className="text-stone-400">
                      {c._orderCount === 1 ? "order" : "orders"}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-[#800020] transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      <AddCustomerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}

/* ---------------- Add Customer Dialog ---------------- */

function AddCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);

  const reset = () => setForm(EMPTY_FORM);

  const set = <K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const toggleStyle = (style: string) => {
    const current = form.preferredStyles
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = current.includes(style)
      ? current.filter((s) => s !== style)
      : [...current, style];
    set("preferredStyles", next.join(", "));
  };

  const selectedStyles = form.preferredStyles
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

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
      await apiPost("/api/customers", body);
      reset();
      onCreated();
    } catch (err) {
      toast.error("Failed to add customer", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-[#1C1917]">
            Add New Customer
          </DialogTitle>
          <DialogDescription className="text-stone-500">
            Capture essential details for this client.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="c-name" className="text-xs text-stone-600">
              Name <span className="text-[#800020]">*</span>
            </Label>
            <Input
              id="c-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Ama Mensah"
              className="h-10 rounded-md"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="c-phone" className="text-xs text-stone-600">
                Phone
              </Label>
              <Input
                id="c-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+233…"
                className="h-10 rounded-md"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-email" className="text-xs text-stone-600">
                Email
              </Label>
              <Input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="name@email.com"
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
              <Label htmlFor="c-city" className="text-xs text-stone-600">
                City
              </Label>
              <Input
                id="c-city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Accra"
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
              <Label htmlFor="c-referred" className="text-xs text-stone-600">
                Referred By
              </Label>
              <Input
                id="c-referred"
                value={form.referredBy}
                onChange={(e) => set("referredBy", e.target.value)}
                placeholder="Referrer name"
                className="h-10 rounded-md"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label className="text-xs text-stone-600">Preferred Styles</Label>
            <div className="flex flex-wrap gap-1.5">
              {PREFERRED_STYLES.map((style) => {
                const active = selectedStyles.includes(style);
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleStyle(style)}
                    className={
                      "text-[11px] px-2.5 py-1 rounded-md border transition-all " +
                      (active
                        ? "bg-[#800020]/10 border-[#800020]/40 text-[#800020]"
                        : "bg-white border-[#E7E5E4] text-stone-600 hover:border-[#800020]/30")
                    }
                  >
                    {style}
                  </button>
                );
              })}
            </div>
            <Input
              value={form.preferredStyles}
              onChange={(e) => set("preferredStyles", e.target.value)}
              placeholder="Or type comma-separated styles"
              className="h-10 rounded-md mt-1"
              aria-label={ALL_STYLES}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="c-notes" className="text-xs text-stone-600">
              Notes
            </Label>
            <Textarea
              id="c-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any extra context…"
              rows={3}
              className="rounded-md"
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
              Save Customer
            </PremiumButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
