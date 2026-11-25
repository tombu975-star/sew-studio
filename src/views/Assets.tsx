"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useRoleAccess } from "@/stores/role-access";
import { useRole } from "@/stores/role";
import { formatCurrency } from "@/lib/format";
import type { Settings } from "@/lib/types";
import { SectionCard } from "@/components/atelier/SectionCard";
import { EmptyState } from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";

type Item = { id:string; name:string; sku:string|null; category:string; unit:string; quantity:number; reorder_level:number; unit_cost:number; location:string|null; supplier:string|null; notes:string|null };
type Movement = { id:string; item_id:string; movement_type:string; quantity_delta:number; note:string|null; order_id:string|null; unit_cost_at_movement:number|null; created_at:string };
type ProductionOrder = { id:string; garmentDesign?:string; orderNumber?:string; customer?:{name?:string} };
type Stock = { items:Item[]; movements:Movement[] };
const CATEGORIES=["Fabric","Lining","Interfacing","Thread","Zippers","Buttons & Fasteners","Beads & Embellishments","Trimmings","Packaging","Consumables","Other"];
const UNITS=["yards","metres","pcs","rolls","spools","packs","sets","kg","g","litres","boxes"];
const field="min-h-11 w-full min-w-0 rounded-md border border-[#D2B9BF] bg-white px-3 text-sm outline-none focus:border-[#650019] focus:ring-2 focus:ring-[#650019]/10";
const blank={name:"",sku:"",category:"Fabric",unit:"yards",openingQuantity:"0",reorderLevel:"0",unitCost:"0",location:"",supplier:"",notes:""};
const fmt=(n:number)=>Number(n).toLocaleString(undefined,{maximumFractionDigits:3});

export default function Assets(){
  const qc=useQueryClient();
  const role=useRole(s=>s.role);
  const access=useRoleAccess(s=>s.data?.access["assets"]);
  const canEdit=access?.edit??role==="madam";
  const {data,isLoading,isError,refetch}=useQuery<Stock>({queryKey:["inventory"],queryFn:()=>apiGet<Stock>("/api/inventory")});
  const {data:settings}=useQuery<Settings>({queryKey:["settings"],queryFn:()=>apiGet<Settings>("/api/settings")});
  const currency=settings?.currency||"GHS";
  const [form,setForm]=useState(blank);
  const [showForm,setShowForm]=useState(false);
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("");
  const [lowOnly,setLowOnly]=useState(false);
  const [selected,setSelected]=useState<Item|null>(null);
  const [movement,setMovement]=useState({type:"receive",quantity:"",note:"",orderId:""});
  const {data:orders=[]}=useQuery<ProductionOrder[]>({queryKey:["orders"],queryFn:()=>apiGet<ProductionOrder[]>("/api/orders"),enabled:!!selected});
  const [editing,setEditing]=useState<Item|null>(null);
  const [editForm,setEditForm]=useState({reorderLevel:"",unitCost:"",location:"",supplier:""});
  const refresh=()=>qc.invalidateQueries({queryKey:["inventory"]});
  const create=useMutation({mutationFn:()=>apiPost("/api/inventory",{...form,openingQuantity:Number(form.openingQuantity),reorderLevel:Number(form.reorderLevel),unitCost:Number(form.unitCost)}),onSuccess:()=>{toast.success("Stock item created");setForm(blank);setShowForm(false);refresh();},onError:(e:Error)=>toast.error(e.message)});
  const record=useMutation({mutationFn:()=>apiPost(`/api/inventory/${selected?.id}/movements`,{type:movement.type,quantity:Number(movement.quantity),note:movement.note,orderId:movement.orderId||null}),onSuccess:()=>{toast.success("Stock movement recorded");setMovement({type:"receive",quantity:"",note:"",orderId:""});setSelected(null);refresh();},onError:(e:Error)=>toast.error(e.message)});
  const update=useMutation({mutationFn:()=>apiPatch(`/api/inventory/${editing?.id}`,{reorderLevel:Number(editForm.reorderLevel),unitCost:Number(editForm.unitCost),location:editForm.location,supplier:editForm.supplier}),onSuccess:()=>{toast.success("Stock item updated");setEditing(null);refresh();},onError:(e:Error)=>toast.error(e.message)});
  const items=data?.items??[];
  const low=items.filter(x=>Number(x.quantity)<=Number(x.reorder_level));
  const value=items.reduce((n,x)=>n+Number(x.quantity)*Number(x.unit_cost),0);
  const shown=useMemo(()=>items.filter(x=>(!category||x.category===category)&&(!lowOnly||Number(x.quantity)<=Number(x.reorder_level))&&(!search||[x.name,x.sku,x.supplier].some(v=>v?.toLowerCase().includes(search.toLowerCase())))),[items,category,lowOnly,search]);
  const history=data?.movements??[];
  const exportCsv=()=>{
    const rows=[["Name","SKU","Category","Unit","On hand","Reorder level","Unit cost","Stock value","Supplier","Location"],...shown.map(x=>[x.name,x.sku??"",x.category,x.unit,x.quantity,x.reorder_level,x.unit_cost,Number(x.quantity)*Number(x.unit_cost),x.supplier??"",x.location??""])];
    const csv=rows.map(row=>row.map(v=>{const raw=String(v);const safe=typeof v==="string"&&/^\s*[=+@-]/.test(raw)?"\u0027"+raw:raw;return '"'+safe.replace(/"/g,'""')+'"';}).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="sewsiness-inventory.csv";a.click();URL.revokeObjectURL(url);
  };
  return <div className="mx-auto w-full max-w-[1350px] px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pt-5">
    <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3">
      <p className="max-w-2xl text-sm text-stone-600">Manage fabrics, trims, embellishments and supplies. Machines and equipment belong in the separate Asset Register.</p>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto"><PremiumButton variant="outline" size="sm" onClick={exportCsv} disabled={isLoading||isError||!shown.length}>Export CSV</PremiumButton>{canEdit&&<PremiumButton onClick={()=>setShowForm(x=>!x)}><Plus className="size-4"/> Add stock item</PremiumButton>}</div>
    </div>
    <div className="mb-5 grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 lg:grid-cols-4">
      {([["Stock items",isLoading||isError?"—":items.length],["Stock value",isLoading||isError?"—":formatCurrency(value,currency)],["Low / out of stock",isLoading||isError?"—":low.length],["Transactions",isLoading||isError?"—":history.length]] as const).map(([k,v])=><div key={k} className="min-w-0 rounded-xl border border-[#EEDFE3] bg-white p-3 sm:p-4"><p className="text-xs text-stone-500">{k}</p><p className="mt-1 break-words text-lg font-semibold text-[#2F151B] sm:text-xl">{v}</p></div>)}
    </div>
    {low.length>0&&<div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="size-4 shrink-0"/> {low.length} stock item(s) at or below their reorder levels.</div>}
    {showForm&&canEdit&&<SectionCard title="New inventory item" className="mb-5"><form className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={e=>{e.preventDefault();if(!form.name.trim()||create.isPending)return;create.mutate();}}>
      {([["name","Item name","e.g. Ivory bridal satin"],["sku","SKU / code","Optional"],["location","Storage location","Shelf or room"],["supplier","Supplier","Optional"]] as const).map(([k,label,placeholder])=><label key={k} className="text-xs font-medium text-stone-600">{label}<input required={k==="name"} className={`${field} mt-1`} value={form[k]} maxLength={120} placeholder={placeholder} onChange={e=>setForm(v=>({...v,[k]:e.target.value}))}/></label>)}
      <label className="text-xs font-medium text-stone-600">Category<select className={`${field} mt-1`} value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))}>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="text-xs font-medium text-stone-600">Unit<select className={`${field} mt-1`} value={form.unit} onChange={e=>setForm(v=>({...v,unit:e.target.value}))}>{UNITS.map(x=><option key={x}>{x}</option>)}</select></label>
      {([["openingQuantity","Opening quantity"],["reorderLevel","Low-stock threshold"],["unitCost",`Unit cost (${currency})`]] as const).map(([k,label])=><label key={k} className="text-xs font-medium text-stone-600">{label}<input type="number" min={0} step="0.001" required className={`${field} mt-1`} value={form[k]} onChange={e=>setForm(v=>({...v,[k]:e.target.value}))}/></label>)}
      <div className="flex items-end"><PremiumButton type="submit" disabled={create.isPending}>Save stock item</PremiumButton></div>
    </form></SectionCard>}
    <SectionCard title="Stock on hand"><p className="mb-3 text-sm text-stone-600" role="status">{shown.length} matching stock items</p>
      <div className="grid gap-2 border-b border-[#EEDFE3] p-4 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
        <input className={field} aria-label="Search inventory" placeholder="Search item, SKU or supplier…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className={field} aria-label="Filter category" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select>
        <label className="flex items-center gap-2 text-sm text-stone-600"><input type="checkbox" checked={lowOnly} onChange={e=>setLowOnly(e.target.checked)}/> Low stock only</label>
      </div>
      {isLoading?<p className="p-6 text-sm text-stone-500">Loading stock…</p>:isError?<p className="p-6 text-sm text-red-700">Could not load inventory. <button type="button" className="underline font-semibold" onClick={()=>void refetch()}>Try again</button>.</p>:!items.length?<EmptyState icon={Package} title="No stock recorded" description="Add fabrics, thread, zippers and other consumable supplies here—not machines or furniture."/>:!shown.length?<p className="p-6 text-sm text-stone-500">No items match the filters.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[#FAF4F6] text-xs text-stone-600"><tr>{["Item","Category","On hand","Reorder at","Unit cost","Stock value","Actions"].map(x=><th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody>{shown.map(x=><tr key={x.id} className="border-t border-[#EEDFE3]"><td className="px-3 py-3"><p className="font-medium text-[#2F151B]">{x.name}</p><p className="text-xs text-stone-500">{[x.sku,x.location].filter(Boolean).join(" · ")}</p></td><td className="px-3 py-3">{x.category}</td><td className={`px-3 py-3 font-semibold tabular-nums ${Number(x.quantity)<=Number(x.reorder_level)?"text-amber-700":""}`}>{fmt(Number(x.quantity))} {x.unit}</td><td className="px-3 py-3 tabular-nums">{fmt(Number(x.reorder_level))}</td><td className="px-3 py-3 tabular-nums">{formatCurrency(Number(x.unit_cost),currency)}</td><td className="px-3 py-3 tabular-nums">{formatCurrency(Number(x.quantity)*Number(x.unit_cost),currency)}</td><td className="px-3 py-3">{canEdit&&<div className="flex gap-2"><button type="button" className="rounded-md border border-[#D2B9BF] px-2 py-1 text-xs" onClick={()=>{setSelected(x);setMovement({type:"receive",quantity:"",note:"",orderId:""});}}>Move stock</button><button type="button" className="rounded-md border border-[#D2B9BF] px-2 py-1 text-xs" onClick={()=>{setEditing(x);setEditForm({reorderLevel:String(x.reorder_level),unitCost:String(x.unit_cost),location:x.location??"",supplier:x.supplier??""});}}>Edit</button></div>}</td></tr>)}</tbody></table></div>}
    </SectionCard>
    <SectionCard title="Recent stock movements" className="mt-5">
      {isLoading||isError?<p className="p-5 text-sm text-stone-500">Stock history unavailable while loading or recovering inventory.</p>:!history.length?<p className="p-5 text-sm text-stone-500">No stock transactions yet.</p>:<div className="divide-y divide-[#EEDFE3]">{history.slice(0,30).map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"><div><p className="font-medium">{items.find(x=>x.id===m.item_id)?.name??"Item"}</p><p className="text-xs text-stone-500">{m.movement_type} · {new Date(m.created_at).toLocaleString()} {m.order_id?`· Order ${m.order_id.slice(0,8)}`:""} {m.note?`· ${m.note}`:""}</p></div><span className={`font-semibold tabular-nums ${Number(m.quantity_delta)<0?"text-red-700":"text-emerald-700"}`}>{Number(m.quantity_delta)>0?"+":""}{fmt(Number(m.quantity_delta))}</span></div>)}</div>}
    </SectionCard>
    {selected&&<div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-3 py-6 sm:p-4" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!record.isPending)setSelected(null);}}><form role="dialog" aria-modal="true" aria-label="Record stock movement" className="my-auto w-full min-w-0 max-w-md max-h-[calc(100dvh-3rem)] space-y-4 overflow-y-auto overscroll-contain rounded-xl bg-white p-4 shadow-xl sm:p-5" onSubmit={e=>{e.preventDefault();if(record.isPending||!selected)return;if(!Number.isFinite(Number(movement.quantity))||Number(movement.quantity)<=0){toast.error("Enter a positive stock quantity.");return;}record.mutate();}}><h2 className="text-lg font-semibold">Record stock movement</h2><p className="text-sm text-stone-600">{selected.name} · {fmt(Number(selected.quantity))} {selected.unit} available</p><label className="block text-sm">Movement<select className={`${field} mt-1`} value={movement.type} onChange={e=>setMovement(v=>({...v,type:e.target.value}))}><option value="receive">Receive stock (+)</option><option value="issue">Issue / use stock (−)</option><option value="return">Return to stock (+)</option><option value="adjustment">Stocktake adjustment (+/−)</option></select></label><label className="block text-sm">Quantity {movement.type==="adjustment"?"change":"to move"}<input required type="number" step="0.001" min={movement.type==="adjustment"?undefined:0.001} className={`${field} mt-1`} value={movement.quantity} onChange={e=>setMovement(v=>({...v,quantity:e.target.value}))}/></label><label className="block text-sm">Production order (optional){["issue","return"].includes(movement.type)&&<select className={`${field} mt-1`} value={movement.orderId} onChange={e=>setMovement(v=>({...v,orderId:e.target.value}))}><option value="">Not linked to an order</option>{orders.map(o=><option key={o.id} value={o.id}>{o.orderNumber||o.id.slice(0,8)} · {o.customer?.name||o.garmentDesign||"Production order"}</option>)}</select>}</label><label className="block text-sm">Reference / reason<input className={`${field} mt-1`} maxLength={500} value={movement.note} placeholder="Order, supplier, or stocktake note" onChange={e=>setMovement(v=>({...v,note:e.target.value}))}/></label><div className="flex flex-wrap justify-end gap-2"><PremiumButton variant="outline" type="button" disabled={record.isPending} onClick={()=>setSelected(null)}>Cancel</PremiumButton><PremiumButton type="submit" disabled={record.isPending||!Number(movement.quantity)}>Record movement</PremiumButton></div></form></div>}
    {editing&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!update.isPending)setEditing(null);}}><form role="dialog" aria-modal="true" aria-label="Edit stock item" className="w-full min-w-0 max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain space-y-4 rounded-lg bg-white p-5 shadow-xl" onSubmit={e=>{e.preventDefault();if(!update.isPending&&editing)update.mutate();}}><h2 className="text-lg font-semibold">Edit {editing.name}</h2>{([["reorderLevel","Low-stock threshold"],["unitCost",`Unit cost (${currency})`],["location","Storage location"],["supplier","Supplier"]] as const).map(([k,label])=><label key={k} className="block text-sm">{label}<input className={`${field} mt-1`} type={k==="reorderLevel"||k==="unitCost"?"number":"text"} min={0} step="0.001" value={editForm[k]} onChange={e=>setEditForm(v=>({...v,[k]:e.target.value}))}/></label>)}<div className="flex justify-end gap-2"><PremiumButton variant="outline" type="button" disabled={update.isPending} onClick={()=>setEditing(null)}>Cancel</PremiumButton><PremiumButton type="submit" disabled={update.isPending}>Save changes</PremiumButton></div></form></div>}
  </div>;
}
