"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useRole } from "@/stores/role";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Settings } from "@/lib/types";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { EmptyState } from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";

type Asset = { id: string; name: string; category: string; purchaseCost: number | null; condition: string; status: string; location: string; nextServiceDue: string | null };

const CATEGORIES = ["Machine", "Mannequin", "Iron & Pressing", "Cutting Table", "Furniture", "Tools", "Other"];
const CONDITIONS = ["New", "Good", "Fair", "Needs Repair"];
const STATUSES = ["In Use", "In Storage", "Under Repair", "Retired"];
const field = "h-10 w-full rounded-lg border border-[#D2B9BF] bg-white px-3 text-sm outline-none focus:border-[#650019] focus:ring-4 focus:ring-[#650019]/10";

/** Inventory of the studio itself: machines, mannequins, irons and furniture, with service dates. */
export default function Assets() {
  const qc = useQueryClient();
  const { role } = useRole();
  const canEdit = role !== "trainee";
  const { data: assets, isLoading } = useQuery<Asset[]>({ queryKey: ["assets"], queryFn: () => apiGet<Asset[]>("/api/assets") });
  const { data: settings } = useQuery<Settings>({ queryKey: ["settings"], queryFn: () => apiGet<Settings>("/api/settings") });
  const currency = settings?.currency || "GHS";
  const refresh = () => qc.invalidateQueries({ queryKey: ["assets"] });
  const onError = (e: Error) => toast.error(e.message);

  const [form, setForm] = useState({ name: "", category: "Machine", condition: "Good", purchaseCost: "", location: "", nextServiceDue: "" });
  const add = useMutation({ mutationFn: () => apiPost("/api/assets", form), onSuccess: () => { toast.success("Added to inventory"); setForm({ ...form, name: "", purchaseCost: "", location: "", nextServiceDue: "" }); refresh(); }, onError });
  const patch = useMutation({ mutationFn: ({ id, body }: { id: string; body: object }) => apiPatch(`/api/assets/${id}`, body), onSuccess: refresh, onError });
  const del = useMutation({ mutationFn: (id: string) => api(`/api/assets/${id}`, { method: "DELETE" }), onSuccess: refresh, onError });

  const today = new Date().toISOString().slice(0, 10);
  const overdue = (assets || []).filter((a) => a.nextServiceDue && a.nextServiceDue < today && a.status !== "Retired");
  const value = (assets || []).filter((a) => a.status !== "Retired").reduce((n, a) => n + (a.purchaseCost || 0), 0);

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto w-full">
      <PageHeader eyebrow="Studio" eyebrowIcon={Package} title="Inventory" subtitle="The equipment and furniture your studio owns, what condition it is in, and when it is next due for service." />
      {overdue.length > 0 && (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-[#E6D4D8] bg-[#FBF1F3] px-4 py-3 text-sm text-[#650019]"><AlertTriangle className="size-4" />{overdue.length} item{overdue.length === 1 ? " is" : "s are"} overdue for service.</div>
      )}
      {canEdit && (
        <SectionCard title="Add an item" className="mb-5">
          <form className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => { e.preventDefault(); if (form.name.trim()) add.mutate(); }}>
            <label className="text-xs font-medium text-stone-600 lg:col-span-2">Name<input className={`${field} mt-1`} value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Juki industrial machine" /></label>
            <label className="text-xs font-medium text-stone-600">Category<select className={`${field} mt-1`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="text-xs font-medium text-stone-600">Condition<select className={`${field} mt-1`} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="text-xs font-medium text-stone-600">Cost ({currency})<input type="number" min={0} step="0.01" className={`${field} mt-1`} value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} /></label>
            <label className="text-xs font-medium text-stone-600">Next service due<input type="date" className={`${field} mt-1`} value={form.nextServiceDue} onChange={(e) => setForm({ ...form, nextServiceDue: e.target.value })} /></label>
            <label className="text-xs font-medium text-stone-600 sm:col-span-2">Where it is kept<input className={`${field} mt-1`} value={form.location} maxLength={120} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
            <div className="flex items-end"><PremiumButton type="submit" disabled={add.isPending}><Plus className="size-4" /> Add item</PremiumButton></div>
          </form>
        </SectionCard>
      )}
      <SectionCard title={`Your items${assets?.length ? ` · ${formatCurrency(value, currency)} at cost` : ""}`}>
        {isLoading ? <p className="p-6 text-sm text-stone-400">Loading…</p> : !assets?.length ? (
          <EmptyState icon={Package} title="Nothing listed yet" description="Add your machines, mannequins and equipment to keep track of them." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left"><th className="px-4 py-2.5">Item</th><th className="px-4 py-2.5">Condition</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Next service</th><th className="px-4 py-2.5 text-right">Cost</th><th /></tr></thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id} className="border-t border-[#EEDFE3]">
                    <td className="px-4 py-3"><p className="font-medium text-[#2F151B]">{a.name}</p><p className="text-xs text-stone-500">{a.category}{a.location ? ` · ${a.location}` : ""}</p></td>
                    <td className="px-4 py-3"><select disabled={!canEdit} aria-label="Condition" value={a.condition} onChange={(e) => patch.mutate({ id: a.id, body: { condition: e.target.value } })} className={`${field} h-8 w-32`}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></td>
                    <td className="px-4 py-3"><select disabled={!canEdit} aria-label="Status" value={a.status} onChange={(e) => patch.mutate({ id: a.id, body: { status: e.target.value } })} className={`${field} h-8 w-32`}>{STATUSES.map((c) => <option key={c}>{c}</option>)}</select></td>
                    <td className={`px-4 py-3 ${a.nextServiceDue && a.nextServiceDue < today ? "font-semibold text-red-700" : "text-stone-600"}`}>{a.nextServiceDue ? formatDate(a.nextServiceDue) : "-"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{a.purchaseCost == null ? "-" : formatCurrency(a.purchaseCost, currency)}</td>
                    <td className="px-2 py-3">{canEdit && <button type="button" aria-label="Delete item" onClick={() => { if (window.confirm(`Remove ${a.name}?`)) del.mutate(a.id); }} className="text-stone-400 hover:text-red-700"><Trash2 className="size-4" /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
