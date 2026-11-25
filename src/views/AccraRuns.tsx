"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { api, apiGet, apiPatch, apiPost, apiErrorMessage } from "@/lib/api";
import { useRole } from "@/stores/role";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import type { Settings } from "@/lib/types";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { EmptyState } from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";

type Item = { id: string; description: string; obtained: boolean; plannedCost: number; actualCost: number; supplierName?: string; receiptReference?: string; receiptImageUrl?: string };
type Supplier = { id: string; name: string; phone: string | null; location: string | null; notes: string | null };
type Trip = { id: string; tripDate: string; status: "Planned" | "Logged"; notes: string; items: Item[] };

const field = "min-h-11 min-w-0 rounded-md border border-[#D2B9BF] bg-white px-3 text-sm outline-none focus:border-[#650019] focus:ring-2 focus:ring-[#650019]/20";

/** Market Runs: plan a buying trip, tick items off, and record what was actually spent. */
export default function AccraRuns() {
  const qc = useQueryClient();
  const { role } = useRole();
  const canEdit = role !== "trainee";
  const { data: trips, isLoading, isError, refetch } = useQuery<Trip[]>({ queryKey: ["accra-runs"], queryFn: () => apiGet<Trip[]>("/api/accra-runs") });
  const { data: settings } = useQuery<Settings>({ queryKey: ["settings"], queryFn: () => apiGet<Settings>("/api/settings") });
  const currency = settings?.currency || "GHS";
  const {data: suppliers = []} = useQuery<Supplier[]>({queryKey:["market-run-suppliers"],queryFn:()=>apiGet<Supplier[]>("/api/market-run-suppliers")});
  const [supplierName,setSupplierName] = useState("");
  const [supplierPhone,setSupplierPhone] = useState("");
  const [supplierLocation,setSupplierLocation] = useState("");
  const [showSuppliers,setShowSuppliers] = useState(false);
  const [editingSupplier,setEditingSupplier] = useState<string | null>(null);
  const [editName,setEditName] = useState("");
  const [editPhone,setEditPhone] = useState("");
  const [editLocation,setEditLocation] = useState("");
  const saveSupplier = useMutation({mutationFn:()=>apiPatch(`/api/market-run-suppliers/${editingSupplier}`,{name:editName,phone:editPhone,location:editLocation}),onSuccess:()=>{setEditingSupplier(null);toast.success("Supplier updated");qc.invalidateQueries({queryKey:["market-run-suppliers"]});},onError:(e:Error)=>toast.error(apiErrorMessage(e,e.message))});
  const supplierHistory = (name:string) => (trips??[]).flatMap(t=>t.items.filter(i=>i.supplierName?.trim().toLocaleLowerCase()===name.trim().toLocaleLowerCase()).map(i=>({date:t.tripDate,description:i.description,amount:i.actualCost,planned:i.plannedCost}))).sort((a,b)=>b.date.localeCompare(a.date));
  const addSupplier = useMutation({mutationFn:()=>apiPost("/api/market-run-suppliers",{name:supplierName,phone:supplierPhone,location:supplierLocation}),onSuccess:()=>{setSupplierName("");setSupplierPhone("");setSupplierLocation("");toast.success("Supplier saved");qc.invalidateQueries({queryKey:["market-run-suppliers"]});},onError:(e:Error)=>toast.error(apiErrorMessage(e,e.message))});
  const refresh = () => qc.invalidateQueries({ queryKey: ["accra-runs"] });
  const onError = (e: Error) => toast.error(apiErrorMessage(e,e.message));

  const [date, setDate] = useState(todayISO());
  const [filter, setFilter] = useState<"All" | "Planned" | "Logged">("All");
  const visibleTrips = (trips ?? []).filter(t => filter === "All" || t.status === filter);
  const plannedTotal = visibleTrips.reduce((sum,t) => sum + t.items.reduce((n,i)=>n+i.plannedCost,0),0);
  const spentTotal = visibleTrips.reduce((sum,t) => sum + t.items.reduce((n,i)=>n+i.actualCost,0),0);
  const exportCsv = () => {
    const escape = (v: string | number) => { const raw = String(v); const safe = typeof v === "string" && /^[\s]*[=+@-]/.test(raw) ? "\u0027" + raw : raw; return '"' + safe.replaceAll('"','""') + '"'; };
    const rows = [["Trip date","Status","Notes","Item","Supplier","Receipt reference","Obtained","Planned cost","Actual cost"],...visibleTrips.flatMap(t => t.items.length ? t.items.map(i => [t.tripDate,t.status,t.notes ?? "",i.description,i.supplierName ?? "",i.receiptReference ?? "",i.obtained ? "Yes" : "No",i.plannedCost,i.actualCost]) : [[t.tripDate,t.status,t.notes ?? "","","","","",0,0]])];
    const csv = "\uFEFF" + rows.map(row => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const link = document.createElement("a"); link.href=url; link.download="sewsiness-market-runs.csv"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };
  const printReport = () => {
    const report = window.open("", "_blank");
    if (!report) { toast.error("Allow pop-ups to open the printable report."); return; }
    const safe = (value: string | number) => String(value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c] ?? c);
    const money = (amount: number) => safe(formatCurrency(amount, currency));
    const body = visibleTrips.map((trip) => {
      const totalPlanned = trip.items.reduce((sum, item) => sum + item.plannedCost, 0);
      const totalSpent = trip.items.reduce((sum, item) => sum + item.actualCost, 0);
      const rows = trip.items.map((item) => `<tr><td>${safe(item.description)}</td><td>${item.obtained ? "Yes" : "No"}</td><td>${safe(item.supplierName ?? "")}</td><td>${safe(item.receiptReference ?? "")}</td><td class="number">${money(item.plannedCost)}</td><td class="number">${money(item.actualCost)}</td></tr>`).join("");
      return `<section><h2>${safe(formatDate(trip.tripDate))} · ${safe(trip.status)}</h2>${trip.notes ? `<p class="notes"><strong>Notes:</strong> ${safe(trip.notes)}</p>` : ""}<div class="table-wrap"><table><thead><tr><th>Item</th><th>Got?</th><th>Supplier</th><th>Receipt</th><th>Planned</th><th>Spent</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No items listed</td></tr>'}</tbody><tfoot><tr><th colspan="4">Trip totals</th><th class="number">${money(totalPlanned)}</th><th class="number">${money(totalSpent)}</th></tr></tfoot></table></div></section>`;
    }).join("");
    report.document.open();
    report.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sewsiness Market Runs Report</title><style>
      *{box-sizing:border-box}body{font:14px/1.5 system-ui,-apple-system,sans-serif;color:#2F151B;margin:0;padding:24px;background:#fff}header{border-bottom:3px solid #800020;padding-bottom:12px;margin-bottom:20px}h1{font-size:24px;margin:0;color:#800020}h2{font-size:17px;margin:0 0 8px}p{margin:5px 0}.summary{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0 22px}.summary span{padding:10px 14px;background:#faf6f4;border:1px solid #eadde0;border-radius:8px}section{margin:24px 0;break-inside:avoid-page}.notes{white-space:pre-wrap;overflow-wrap:anywhere;margin-bottom:10px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed}th,td{padding:8px;border:1px solid #e9dfe1;text-align:left;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}th{background:#faf2f4}th:first-child{width:30%}.number{text-align:right;font-variant-numeric:tabular-nums}tfoot th{font-weight:700}.toolbar{margin-bottom:20px}.toolbar button{background:#800020;color:white;border:0;border-radius:8px;padding:10px 16px;font:inherit;cursor:pointer}@media print{body{padding:0}.toolbar{display:none}section{break-inside:auto}thead{display:table-header-group}tr{break-inside:avoid}@page{size:A4 landscape;margin:12mm}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div><header><h1>Sewsiness · Market Runs</h1><p>Purchase planning and spending report · ${safe(filter)} trips</p></header><div class="summary"><span><strong>Trips:</strong> ${visibleTrips.length}</span><span><strong>Planned:</strong> ${money(plannedTotal)}</span><span><strong>Spent:</strong> ${money(spentTotal)}</span><span><strong>Difference:</strong> ${money(plannedTotal - spentTotal)}</span></div>${body || "<p>No trips match the selected filter.</p>"}</body></html>`);
    report.document.close();
  };
  const addTrip = useMutation({ mutationFn: () => apiPost("/api/accra-runs", { tripDate: date }), onSuccess: () => { toast.success("Trip planned"); refresh(); }, onError });

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pt-5 max-w-[1000px] mx-auto w-full">
      <PageHeader eyebrow="Studio" eyebrowIcon={Truck} title="Market Runs" subtitle="Plan procurement trips, track purchases and reconcile actual spending." />
      {canEdit && (
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-stone-600">Trip date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} mt-1 block`} /></label>
          <PremiumButton onClick={() => addTrip.mutate()} disabled={addTrip.isPending || !date}><Plus className="size-4" /> Plan a trip</PremiumButton>
        </div>
      )}
      <SectionCard title="Supplier directory" action={<PremiumButton size="sm" variant="outline" onClick={()=>setShowSuppliers(v=>!v)}>{showSuppliers?"Hide suppliers":"Manage suppliers"}</PremiumButton>}>
        {showSuppliers && <div className="p-4 space-y-3">
          {canEdit && <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();if(supplierName.trim() && !addSupplier.isPending)addSupplier.mutate();}}>
            <input required maxLength={150} aria-label="Supplier name" placeholder="Supplier name" value={supplierName} onChange={e=>setSupplierName(e.target.value)} className={`${field} flex-1 min-w-36`}/>
            <input maxLength={80} aria-label="Supplier phone" placeholder="Phone" value={supplierPhone} onChange={e=>setSupplierPhone(e.target.value)} className={`${field} w-36`}/>
            <input maxLength={200} aria-label="Supplier location" placeholder="Market / location" value={supplierLocation} onChange={e=>setSupplierLocation(e.target.value)} className={`${field} w-40`}/>
            <PremiumButton type="submit" disabled={addSupplier.isPending}><Plus className="size-4"/> Save supplier</PremiumButton>
          </form>}
          <div className="divide-y divide-[#EEDFE3]">{suppliers.map(x=>{
            const history=supplierHistory(x.name);const total=history.reduce((n,i)=>n+i.amount,0);
            return <div key={x.id} className="space-y-2 py-3 text-sm">
              {editingSupplier===x.id ? <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();saveSupplier.mutate();}}>
                <input required maxLength={150} aria-label="Edit supplier name" className={field} value={editName} onChange={e=>setEditName(e.target.value)}/>
                <input maxLength={80} aria-label="Edit supplier phone" className={field} value={editPhone} onChange={e=>setEditPhone(e.target.value)}/>
                <input maxLength={200} aria-label="Edit supplier location" className={field} value={editLocation} onChange={e=>setEditLocation(e.target.value)}/>
                <PremiumButton type="submit" size="sm" disabled={saveSupplier.isPending}>Save</PremiumButton>
                <PremiumButton type="button" variant="outline" size="sm" onClick={()=>setEditingSupplier(null)}>Cancel</PremiumButton>
              </form> : <div className="flex flex-wrap justify-between gap-2">
                <div><span className="font-medium">{x.name}</span><span className="ml-2 text-stone-500">{[x.phone,x.location].filter(Boolean).join(" · ")}</span></div>
                {canEdit && <PremiumButton size="sm" variant="outline" onClick={()=>{setEditingSupplier(x.id);setEditName(x.name);setEditPhone(x.phone??"");setEditLocation(x.location??"");}}>Edit</PremiumButton>}
              </div>}
              <p className="text-xs text-stone-500">{history.length} purchases · {formatCurrency(total,currency)} spent</p>
              {history.length>0 && <details><summary className="cursor-pointer text-xs text-[#650019]">Purchase history</summary><ul className="mt-2 space-y-1">{history.map((h,index)=><li key={index} className="flex flex-wrap justify-between gap-2 text-xs text-stone-600"><span>{formatDate(h.date)} · {h.description}</span><span>{formatCurrency(h.amount,currency)} spent / {formatCurrency(h.planned,currency)} planned</span></li>)}</ul></details>}
            </div>;
          })}{suppliers.length===0 && <p className="text-sm text-stone-500">No suppliers saved yet.</p>}</div>
        </div>}
      </SectionCard>
      {!isLoading && !!trips?.length && <div className="mb-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#EEDFE3] bg-white p-4"><p className="text-xs text-stone-500">Planned purchases</p><p className="text-xl font-semibold tabular-nums">{formatCurrency(plannedTotal,currency)}</p></div>
          <div className="rounded-xl border border-[#EEDFE3] bg-white p-4"><p className="text-xs text-stone-500">Actual spending</p><p className="text-xl font-semibold tabular-nums">{formatCurrency(spentTotal,currency)}</p></div>
          <div className="rounded-xl border border-[#EEDFE3] bg-white p-4"><p className="text-xs text-stone-500">Difference (plan − actual)</p><p className={`text-xl font-semibold tabular-nums ${spentTotal>plannedTotal?"text-red-700":"text-emerald-700"}`}>{formatCurrency(plannedTotal-spentTotal,currency)}</p></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="text-xs font-medium text-stone-600">Show trips <select className={`${field} ml-2`} value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option>All</option><option>Planned</option><option>Logged</option></select></label>
          <div className="flex flex-wrap gap-2"><PremiumButton variant="outline" size="sm" onClick={printReport}><Download className="size-4"/> Print / PDF</PremiumButton><PremiumButton variant="outline" size="sm" onClick={exportCsv}><Download className="size-4"/> Export CSV</PremiumButton></div>
        </div>
      </div>}
      {isLoading ? <p className="text-sm text-stone-400">Loading…</p> : isError ? <SectionCard><p role="alert" className="p-3 text-sm text-red-700">Could not load market runs. <button type="button" className="underline font-semibold" onClick={()=>void refetch()}>Try again</button></p></SectionCard> : !trips?.length ? (
        <SectionCard><EmptyState icon={Truck} title="No trips yet" description="Plan your next trip to the market, then list what you need to buy." action={canEdit ? <PremiumButton size="sm" onClick={() => addTrip.mutate()} disabled={addTrip.isPending}><Plus className="size-4" /> Plan your first trip</PremiumButton> : undefined} /></SectionCard>
      ) : visibleTrips.length === 0 ? <SectionCard><p className="p-4 text-sm text-stone-500">No {filter.toLowerCase()} trips match this filter.</p></SectionCard> : (
        <div className="space-y-5">{visibleTrips.map((t) => <TripCard key={t.id} trip={t} currency={currency} canEdit={canEdit} suppliers={suppliers} onChange={refresh} onError={onError} />)}</div>
      )}
    </div>
  );
}

function TripCard({ trip, currency, canEdit, suppliers, onChange, onError }: { trip: Trip; currency: string; canEdit: boolean; suppliers: Supplier[]; onChange: () => void; onError: (e: Error) => void }) {
  const [desc, setDesc] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState(trip.notes ?? "");
  const [supplier, setSupplier] = useState("");
  const [receipt, setReceipt] = useState("");
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const uploadReceipt = async (itemId: string, file?: File) => {
    if (!file) return;
    if (!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error("Choose a JPG, PNG, WebP or GIF under 5 MB."); return; }
    setUploadingItem(itemId);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/uploads?kind=general", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") throw new Error(result.error || "Upload failed");
      await apiPatch(`${base}/items/${itemId}`, { receiptImageUrl: result.url });
      toast.success("Receipt image attached");
      onChange();
    } catch (e) { onError(e instanceof Error ? e : new Error("Receipt upload failed")); }
    finally { setUploadingItem(null); }
  };
  const planned = trip.items.reduce((n, i) => n + i.plannedCost, 0);
  const actual = trip.items.reduce((n, i) => n + i.actualCost, 0);
  const done = trip.items.filter((i) => i.obtained).length;
  const base = `/api/accra-runs/${trip.id}`;
  const addItem = useMutation({ mutationFn: () => apiPost(`${base}/items`, { description: desc, plannedCost: Number(cost) || 0, supplierName: supplier, receiptReference: receipt }), onSuccess: () => { setDesc(""); setCost(""); setSupplier(""); setReceipt(""); onChange(); }, onError });
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
      <div className="px-4 pt-3 space-y-1"><p className="text-xs text-stone-500">{done} of {trip.items.length} obtained · planned {formatCurrency(planned, currency)} · spent {formatCurrency(actual, currency)}</p><p className={`text-xs font-medium ${actual>planned?"text-red-700":"text-emerald-700"}`}>{actual>planned ? "Over plan by " : "Remaining against plan: "}{formatCurrency(Math.abs(planned-actual),currency)}</p></div>
      <div className="px-4 py-3 border-b border-[#EEDFE3] space-y-2">
        <label htmlFor={`market-notes-${trip.id}`} className="block text-xs font-medium text-stone-600">Trip notes, supplier details and purchase references</label>
        <textarea id={`market-notes-${trip.id}`} maxLength={1000} rows={2} disabled={!canEdit} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Suppliers, market location, receipt numbers, transport notes…" className={`${field} w-full min-h-20 py-2`} />
        {canEdit && <PremiumButton size="sm" variant="outline" disabled={patchTrip.isPending || notes === (trip.notes ?? "")} onClick={()=>patchTrip.mutate({notes})}>Save trip notes</PremiumButton>}
      </div>
      <ul className="divide-y divide-[#EEDFE3]">
        {trip.items.map((i) => (
          <li key={i.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-4">
            <button type="button" disabled={!canEdit} aria-label={i.obtained ? "Mark not got" : "Mark as got"} onClick={() => patchItem.mutate({ id: i.id, body: { obtained: !i.obtained } })}
              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border ${i.obtained ? "border-[#650019] bg-[#650019] text-white" : "border-[#D2B9BF] bg-white"}`}>{i.obtained && <Check className="size-4" />}</button>
            <div className="min-w-0">
              <p className={`whitespace-pre-wrap break-words text-sm leading-6 ${i.obtained ? "text-stone-400 line-through" : "text-[#2F151B]"}`}>{i.description}</p>
              <p className="mt-1 text-xs text-stone-500">Planned {formatCurrency(i.plannedCost, currency)}</p>
            </div>
            <div className="col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2 border-t border-[#F2E8EA] pt-3 sm:col-span-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:border-0 sm:pt-0">
              <div className="min-w-0 space-y-2 sm:col-span-2">
                <input key={i.id + "-supplier"} type="text" maxLength={200} disabled={!canEdit} defaultValue={i.supplierName ?? ""} placeholder="Supplier" aria-label="Supplier name" onBlur={e=>{const v=e.target.value.trim();if(v!==(i.supplierName??""))patchItem.mutate({id:i.id,body:{supplierName:v}});}} className={`${field} h-9 w-full min-w-0`} />
                <input key={i.id + "-receipt"} type="text" maxLength={200} disabled={!canEdit} defaultValue={i.receiptReference ?? ""} placeholder="Receipt reference" aria-label="Receipt reference" onBlur={e=>{const v=e.target.value.trim();if(v!==(i.receiptReference??""))patchItem.mutate({id:i.id,body:{receiptReference:v}});}} className={`${field} h-9 w-full min-w-0`} />
                {i.receiptImageUrl && <a href={i.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-[#650019] underline">View receipt image</a>}
                {canEdit && <label className="block cursor-pointer text-xs text-[#650019] underline">
                  {uploadingItem === i.id ? "Uploading…" : i.receiptImageUrl ? "Replace receipt image" : "Attach receipt image"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={uploadingItem !== null} onChange={e=>{void uploadReceipt(i.id,e.target.files?.[0]);e.target.value="";}} />
                </label>}
              </div>
              <input key={i.actualCost} type="number" min={0} step="0.01" disabled={!canEdit} defaultValue={i.actualCost || ""} placeholder="Spent" aria-label="Amount spent"
                onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== i.actualCost) patchItem.mutate({ id: i.id, body: { actualCost: v } }); }} className={`${field} h-9 w-full min-w-0 text-right sm:col-start-1`} />
              {canEdit && <button type="button" aria-label="Remove item" onClick={() => delItem.mutate(i.id)} className="grid size-9 place-items-center text-stone-400 hover:text-red-700 sm:col-start-2 sm:row-start-2"><Trash2 className="size-4" /></button>}
            </div>
          </li>
        ))}
        {trip.items.length === 0 && <li className="px-4 py-4 text-sm text-stone-400">Nothing on the list yet.</li>}
      </ul>
      {canEdit && (
        <form className="flex flex-wrap gap-2 border-t border-[#EEDFE3] p-4" onSubmit={(e) => { e.preventDefault(); if (desc.trim()) addItem.mutate(); }}>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What to buy (e.g. 6 yards lace)" maxLength={200} className={`${field} min-w-0 flex-1`} />
          <input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Planned cost" className={`${field} w-32`} />
          <input list={`market-suppliers-${trip.id}`} value={supplier} onChange={e=>setSupplier(e.target.value)} maxLength={200} placeholder="Supplier (optional)" aria-label="Supplier for new item" className={`${field} w-40`} />
          <datalist id={`market-suppliers-${trip.id}`}>{suppliers.map(x=><option key={x.id} value={x.name}/>)}</datalist>
          <input value={receipt} onChange={e=>setReceipt(e.target.value)} maxLength={200} placeholder="Receipt reference" aria-label="Receipt for new item" className={`${field} w-40`} />
          <PremiumButton type="submit" size="md" disabled={addItem.isPending}><Plus className="size-4" /> Add</PremiumButton>
        </form>
      )}
    </SectionCard>
  );
}
