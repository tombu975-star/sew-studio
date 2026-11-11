"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { api, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useRole } from "@/stores/role";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import type { Settings } from "@/lib/types";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { EmptyState } from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";

type Item = { id: string; description: string; obtained: boolean; plannedCost: number; actualCost: number };
type Trip = { id: string; tripDate: string; status: "Planned" | "Logged"; notes: string; items: Item[] };

const field = "h-10 rounded-lg border border-[#D2B9BF] bg-white px-3 text-sm outline-none focus:border-[#650019] focus:ring-4 focus:ring-[#650019]/10";

/** Accra Runs: plan a buying trip, tick items off, and record what was actually spent. */
export default function AccraRuns() {
  const qc = useQueryClient();
  const { role } = useRole();
  const canEdit = role !== "trainee";
  const { data: trips, isLoading } = useQuery<Trip[]>({ queryKey: ["accra-runs"], queryFn: () => apiGet<Trip[]>("/api/accra-runs") });
  const { data: settings } = useQuery<Settings>({ queryKey: ["settings"], queryFn: () => apiGet<Settings>("/api/settings") });
  const currency = settings?.currency || "GHS";
  const refresh = () => qc.invalidateQueries({ queryKey: ["accra-runs"] });
  const onError = (e: Error) => toast.error(e.message);

  const [date, setDate] = useState(todayISO());
  const addTrip = useMutation({ mutationFn: () => apiPost("/api/accra-runs", { tripDate: date }), onSuccess: () => { toast.success("Trip planned"); refresh(); }, onError });

  return (
    <div className="p-5 md:p-8 max-w-[1000px] mx-auto w-full">
      <PageHeader eyebrow="Studio" eyebrowIcon={Truck} title="Accra Runs" subtitle="Plan a buying trip, tick off what you got, and record what you really spent." />
      {canEdit && (
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-stone-600">Trip date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} mt-1 block`} /></label>
          <PremiumButton onClick={() => addTrip.mutate()} disabled={addTrip.isPending}><Plus className="size-4" /> Plan a trip</PremiumButton>
        </div>
      )}
      {isLoading ? <p className="text-sm text-stone-400">Loading…</p> : !trips?.length ? (
        <SectionCard><EmptyState icon={Truck} title="No trips yet" description="Plan your next trip to the market, then list what you need to buy." /></SectionCard>
      ) : (
        <div className="space-y-5">{trips.map((t) => <TripCard key={t.id} trip={t} currency={currency} canEdit={canEdit} onChange={refresh} onError={onError} />)}</div>
      )}
    </div>
  );
}

function TripCard({ trip, currency, canEdit, onChange, onError }: { trip: Trip; currency: string; canEdit: boolean; onChange: () => void; onError: (e: Error) => void }) {
  const [desc, setDesc] = useState("");
  const [cost, setCost] = useState("");
  const planned = trip.items.reduce((n, i) => n + i.plannedCost, 0);
  const actual = trip.items.reduce((n, i) => n + i.actualCost, 0);
  const done = trip.items.filter((i) => i.obtained).length;
  const base = `/api/accra-runs/${trip.id}`;
  const addItem = useMutation({ mutationFn: () => apiPost(`${base}/items`, { description: desc, plannedCost: Number(cost) || 0 }), onSuccess: () => { setDesc(""); setCost(""); onChange(); }, onError });
  const patchItem = useMutation({ mutationFn: ({ id, body }: { id: string; body: object }) => apiPatch(`${base}/items/${id}`, body), onSuccess: onChange, onError });
  const delItem = useMutation({ mutationFn: (id: string) => api(`${base}/items/${id}`, { method: "DELETE" }), onSuccess: onChange, onError });
  const patchTrip = useMutation({ mutationFn: (body: object) => apiPatch(base, body), onSuccess: onChange, onError });
  const delTrip = useMutation({ mutationFn: () => api(base, { method: "DELETE" }), onSuccess: () => { toast.success("Trip deleted"); onChange(); }, onError });

  return (
    <SectionCard
      title={`${formatDate(trip.tripDate)} · ${trip.status}`}
      action={canEdit ? (
        <div className="flex gap-2">
          <PremiumButton size="sm" variant="outline" onClick={() => patchTrip.mutate({ status: trip.status === "Planned" ? "Logged" : "Planned" })}>{trip.status === "Planned" ? "Mark as logged" : "Reopen"}</PremiumButton>
          <PremiumButton size="sm" variant="ghost" aria-label="Delete trip" onClick={() => { if (window.confirm("Delete this trip and its list?")) delTrip.mutate(); }}><Trash2 className="size-4" /></PremiumButton>
        </div>
      ) : undefined}
    >
      <p className="px-4 pt-3 text-xs text-stone-500">{done} of {trip.items.length} got · planned {formatCurrency(planned, currency)} · spent {formatCurrency(actual, currency)}</p>
      <ul className="divide-y divide-[#EEDFE3]">
        {trip.items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <button type="button" disabled={!canEdit} aria-label={i.obtained ? "Mark not got" : "Mark as got"} onClick={() => patchItem.mutate({ id: i.id, body: { obtained: !i.obtained } })}
              className={`grid size-6 place-items-center rounded-md border ${i.obtained ? "border-[#650019] bg-[#650019] text-white" : "border-[#D2B9BF] bg-white"}`}>{i.obtained && <Check className="size-4" />}</button>
            <span className={`min-w-0 flex-1 text-sm ${i.obtained ? "text-stone-400 line-through" : "text-[#2F151B]"}`}>{i.description}</span>
            <span className="text-xs text-stone-500">plan {formatCurrency(i.plannedCost, currency)}</span>
            <input key={i.actualCost} type="number" min={0} step="0.01" disabled={!canEdit} defaultValue={i.actualCost || ""} placeholder="Spent" aria-label="Amount spent"
              onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== i.actualCost) patchItem.mutate({ id: i.id, body: { actualCost: v } }); }} className={`${field} h-8 w-24 text-right`} />
            {canEdit && <button type="button" aria-label="Remove item" onClick={() => delItem.mutate(i.id)} className="text-stone-400 hover:text-red-700"><Trash2 className="size-4" /></button>}
          </li>
        ))}
        {trip.items.length === 0 && <li className="px-4 py-4 text-sm text-stone-400">Nothing on the list yet.</li>}
      </ul>
      {canEdit && (
        <form className="flex flex-wrap gap-2 border-t border-[#EEDFE3] p-4" onSubmit={(e) => { e.preventDefault(); if (desc.trim()) addItem.mutate(); }}>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What to buy (e.g. 6 yards lace)" maxLength={200} className={`${field} min-w-0 flex-1`} />
          <input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Planned cost" className={`${field} w-32`} />
          <PremiumButton type="submit" size="md" disabled={addItem.isPending}><Plus className="size-4" /> Add</PremiumButton>
        </form>
      )}
    </SectionCard>
  );
}
