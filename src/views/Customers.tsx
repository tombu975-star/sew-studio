"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Search, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

import { apiGet, apiPost } from "@/lib/api";
import type { Customer, Order } from "@/lib/types";
import {
  ENTRY_SOURCES,
  CUSTOMER_TYPES,
  PREFERRED_STYLES,
} from "@/lib/format";
import { useNav } from "@/stores/nav";

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

export default function Customers() {
  const { go } = useNav();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery<CustomerWithCount[]>({
    queryKey: ["customers"],
    queryFn: () => apiGet<CustomerWithCount[]>("/api/customers"),
  });

  // Safe fallback: also fetch orders so we can compute counts client-side if the
  // collection endpoint doesn't include `_orderCount`.
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/api/orders"),
    // Don't propagate errors here — it's just a fallback.
    retry: false,
  });

  const orderCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      map.set(o.customerId, (map.get(o.customerId) ?? 0) + 1);
    }
    return map;
  }, [orders]);

  const enriched = useMemo(
    () =>
      customers.map((c) => ({
        ...c,
        _orderCount: c._orderCount ?? orderCounts.get(c.id) ?? 0,
      })),
    [customers, orderCounts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
    );
  }, [enriched, search]);

  const sourceBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of enriched) {
      const src = c.entrySource || "Other";
      map.set(src, (map.get(src) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [enriched]);

  const handleCreated = () => {
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    setAddOpen(false);
    toast.success("Customer added");
  };

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1
            className="font-display font-semibold text-[#1C1917]"
            style={{ fontSize: "clamp(28px, 4vw, 36px)" }}
          >
            Customers
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {isLoading
              ? "Loading…"
              : `${enriched.length} ${
                  enriched.length === 1 ? "customer" : "customers"
                } in your atelier`}
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-[#800020] hover:bg-[#6b0018] text-white border-0 rounded-sm"
        >
          <UserPlus className="w-4 h-4" /> Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <Input
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white border-[#E7E5E4] rounded-sm"
          aria-label="Search customers"
        />
      </div>

      {/* Source breakdown */}
      {enriched.length > 0 && (
        <div className="mb-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-2">
            Client Sources
          </div>
          <div className="flex flex-wrap gap-2">
            {sourceBreakdown.map(([src, count]) => (
              <div
                key={src}
                className="border border-[#E7E5E4] rounded-sm px-3 py-2 bg-white flex items-center gap-2"
              >
                <span className="text-xs text-stone-500">{src}</span>
                <span className="text-sm font-semibold text-[#1C1917]">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="border border-[#E7E5E4] rounded-sm bg-white p-4 h-16 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-[#E7E5E4] rounded-sm bg-white p-10 text-center">
          <p className="text-stone-500 text-sm">
            {search
              ? "No customers match your search."
              : "No customers yet. Add your first customer to get started."}
          </p>
        </div>
      ) : (
        <div className="border border-[#E7E5E4] rounded-sm bg-white divide-y divide-[#E7E5E4] overflow-hidden">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => go("customer", { id: c.id })}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-[#FBF9F7] transition-colors focus:outline-none focus-visible:bg-[#FBF9F7]"
            >
              <div
                className="w-10 h-10 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center text-[#800020] font-display font-semibold shrink-0"
                aria-hidden
              >
                {(c.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#1C1917] truncate">
                  {c.name}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mt-0.5">
                  {c.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {c.phone}
                    </span>
                  )}
                  {c.email && (
                    <span className="inline-flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 shrink-0" /> {c.email}
                    </span>
                  )}
                  {!c.phone && !c.email && (
                    <span className="italic">No contact info</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-[#1C1917]">
                  {c._orderCount}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400">
                  {c._orderCount === 1 ? "order" : "orders"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <AddCustomerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}

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
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto scroll-slim rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Add New Customer
          </DialogTitle>
          <DialogDescription className="text-stone-500">
            Capture essential details for this client.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="c-name">
              Name <span className="text-[#800020]">*</span>
            </Label>
            <Input
              id="c-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Ama Mensah"
              className="rounded-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+233…"
                className="rounded-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="name@email.com"
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
              <Label htmlFor="c-city">City</Label>
              <Input
                id="c-city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Accra"
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
              <Label htmlFor="c-referred">Referred By</Label>
              <Input
                id="c-referred"
                value={form.referredBy}
                onChange={(e) => set("referredBy", e.target.value)}
                placeholder="Referrer name"
                className="rounded-sm"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="c-styles">Preferred Styles</Label>
            <Input
              id="c-styles"
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
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea
              id="c-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any extra context…"
              rows={3}
              className="rounded-sm"
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
              {saving ? "Saving…" : "Save Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
