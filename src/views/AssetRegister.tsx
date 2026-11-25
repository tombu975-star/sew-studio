"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { api, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useRole } from "@/stores/role";
import { useRoleAccess } from "@/stores/role-access";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Settings } from "@/lib/types";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { EmptyState } from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Asset = {
  id: string; name: string; category: string; purchaseDate: string | null; purchaseCost: number | null;
  condition: string; status: string; location: string; lastServiceDate: string | null; nextServiceDue: string | null;
  assignedTo: string | null; assignedName: string; notes: string; maintenanceCount: number; maintenanceCost: number;
};
type Staff = { id: string; name: string };
type Log = { id: string; servicedOn: string; performedBy: string; cost: number; notes: string };
type Detail = Asset & { maintenance: Log[] };

const CATEGORIES = ["Machine", "Mannequin", "Iron & Pressing", "Cutting Table", "Furniture", "Tools", "Other"];
const CONDITIONS = ["New", "Good", "Fair", "Needs Repair"];
const STATUSES = ["In Use", "In Storage", "Under Repair", "Retired"];
const field = "min-h-11 w-full min-w-0 rounded-md border border-[#D2B9BF] bg-white px-3 text-sm outline-none focus:border-[#650019] focus:ring-2 focus:ring-[#650019]/20";
const label = "block text-xs font-medium text-stone-600";

const CONDITION_STYLE: Record<string, string> = {
  New: "border-emerald-200 bg-emerald-50 text-emerald-800", Good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Fair: "border-amber-200 bg-amber-50 text-amber-800", "Needs Repair": "border-red-200 bg-red-50 text-red-800",
};
const STATUS_STYLE: Record<string, string> = {
  "In Use": "border-emerald-200 bg-emerald-50 text-emerald-800", "In Storage": "border-stone-200 bg-stone-100 text-stone-700",
  "Under Repair": "border-amber-200 bg-amber-50 text-amber-800", Retired: "border-stone-200 bg-stone-100 text-stone-500",
};
const Badge = ({ text, style }: { text: string; style: string }) => <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${style}`}>{text}</span>;

const todayISO = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export default function AssetRegister() {
  const qc = useQueryClient();
  const { role } = useRole();
  const canEdit = useRoleAccess((s) => s.data?.access["asset-register"]?.edit) ?? role === "madam";
  const [search,setSearch]=useState("");
  const [condition,setCondition]=useState("");
  const [service,setService]=useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<{ id: string | null } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<{ assets: Asset[]; staff: Staff[] }>({ queryKey: ["asset-register"], queryFn: () => apiGet("/api/asset-register") });
  const { data: settings } = useQuery<Settings>({ queryKey: ["settings"], queryFn: () => apiGet<Settings>("/api/settings") });
  const currency = settings?.currency || "GHS";
  const assets = useMemo(() => data?.assets ?? [], [data]);
  const staff = data?.staff ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["asset-register"] });

  const today = todayISO();
  const soon = plusDays(30);
  const live = assets.filter((a) => a.status !== "Retired");
  const overdue = live.filter((a) => a.nextServiceDue && a.nextServiceDue < today);
  const dueSoon = live.filter((a) => a.nextServiceDue && a.nextServiceDue >= today && a.nextServiceDue <= soon);
  const needsAttention = live.filter((a) => a.condition === "Needs Repair" && a.status === "In Use");
  const totalCost = live.reduce((n, a) => n + (Number(a.purchaseCost) || 0), 0);
  const shown = assets.filter((a) => (!category || a.category === category) && (!status || a.status === status) && (!condition || a.condition===condition) && (!service || (service==="overdue"?overdue.includes(a):service==="soon"?dueSoon.includes(a):!a.nextServiceDue&&a.status!=="Retired")) && `${a.name} ${a.location} ${a.assignedName} ${a.category}`.toLowerCase().includes(search.trim().toLowerCase()));
  const exportCsv=()=>{const cell=(v:unknown)=>{const raw=String(v??"");return `"`+(/^[\s]*[=+@-]|^[\t\r\n]/.test(raw)?"\x27"+raw:raw).replaceAll(`"`,`""`)+`"`;};const rows=[["Name","Category","Condition","Status","Location","Assigned staff","Purchase date",`Purchase cost (${currency})`,"Next service",`Maintenance cost (${currency})`],...shown.map(a=>[a.name,a.category,a.condition,a.status,a.location,a.assignedName,a.purchaseDate,a.purchaseCost,a.nextServiceDue,a.maintenanceCost])];const url=URL.createObjectURL(new Blob(["\uFEFF"+rows.map(r=>r.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="asset-register.csv";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pt-5">
      <PageHeader eyebrow="Studio equipment" eyebrowIcon={Wrench} title="Asset Register" subtitle="Every machine, tool and piece of equipment, with its condition and maintenance history."
        actions={canEdit ? <PremiumButton onClick={() => setOpen({ id: null })}><Plus className="size-4" /> Add Asset</PremiumButton> : undefined} />

      {!isLoading&&!isError&&(overdue.length > 0 || needsAttention.length > 0 || dueSoon.length > 0) && (
        <div role="status" className="mb-4 space-y-1.5 rounded-lg border border-[#E6D4D8] bg-[#FBF1F3] px-4 py-3 text-sm text-[#650019]">
          {overdue.length > 0 && <p className="flex items-center gap-2"><AlertTriangle className="size-4 shrink-0" />{overdue.length} asset{overdue.length === 1 ? " is" : "s are"} overdue for a checkup: {overdue.slice(0, 3).map((a) => a.name).join(", ")}{overdue.length > 3 ? "…" : ""}.</p>}
          {needsAttention.length > 0 && <p className="flex items-center gap-2"><AlertTriangle className="size-4 shrink-0" />{needsAttention.map((a) => a.name).slice(0, 3).join(", ")} {needsAttention.length === 1 ? "needs" : "need"} repair but {needsAttention.length === 1 ? "is" : "are"} still marked In Use. Log a repair or change the status.</p>}
          {dueSoon.length > 0 && <p className="flex items-center gap-2"><AlertTriangle className="size-4 shrink-0 opacity-60" />{dueSoon.length} checkup{dueSoon.length === 1 ? "" : "s"} due in the next 30 days.</p>}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Assets", String(live.length)], ["Value at cost", formatCurrency(totalCost, currency)], ["Overdue", String(overdue.length)], ["Spent on upkeep", formatCurrency(assets.reduce((n, a) => n + (Number(a.maintenanceCost)||0), 0), currency)]].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-[#EEDFE3] bg-white px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">{k}</p><p className="mt-1 text-lg font-semibold tabular-nums text-[#2F151B]">{isLoading||isError?"—":v}</p></div>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input aria-label="Search assets" placeholder="Search equipment, location or staff" className={field} value={search} onChange={e=>setSearch(e.target.value)}/>
        <select aria-label="Filter condition" className={field} value={condition} onChange={e=>setCondition(e.target.value)}><option value="">All conditions</option>{CONDITIONS.map(c=><option key={c}>{c}</option>)}</select>
        <select aria-label="Filter maintenance" className={field} value={service} onChange={e=>setService(e.target.value)}><option value="">All service schedules</option><option value="overdue">Overdue service</option><option value="soon">Due within 30 days</option><option value="missing">No service scheduled</option></select>
        <select aria-label="Filter by category" className={field} value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All Categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select aria-label="Filter by status" className={field} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Statuses</option>{STATUSES.map((c) => <option key={c}>{c}</option>)}</select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3"><button type="button" className="min-h-11 text-sm underline text-[#800020]" onClick={()=>{setSearch("");setCategory("");setStatus("");setCondition("");setService("");}}>Reset filters</button>{canEdit&&<PremiumButton variant="outline" disabled={isLoading||isError||!shown.length} onClick={exportCsv}>Export CSV</PremiumButton>}</div>
      <SectionCard title={`${shown.length} asset${shown.length === 1 ? "" : "s"}`}>
        {isLoading ? <p className="p-6 text-sm text-stone-400">Loading…</p>
          : isError ? <p role="alert" className="p-6 text-sm text-red-700">Could not load the register. <button className="underline" onClick={()=>void refetch()}>Retry</button></p>
          : !assets.length ? <EmptyState icon={Wrench} title="No assets yet" description="Add your machines, mannequins and equipment to track their condition and servicing." action={canEdit ? <PremiumButton size="sm" onClick={() => setOpen({ id: null })}><Plus className="size-4" /> Add Asset</PremiumButton> : undefined} />
          : !shown.length ? <p className="p-6 text-sm text-stone-500">No assets match these filters.</p>
          : (
            <ul>
              {shown.map((a) => {
                const late = a.nextServiceDue && a.nextServiceDue < today && a.status !== "Retired";
                return (
                  <li key={a.id} className="border-t border-[#EEDFE3] first:border-t-0">
                    <button type="button" onClick={() => setOpen({ id: a.id })} className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-4 text-left hover:bg-[#FCF8F9] sm:px-5">
                      <span className="min-w-0 flex-1 basis-56">
                        <span className="block font-medium text-[#2F151B]">{a.name}</span>
                        <span className="mt-0.5 block text-sm text-stone-500">
                          {[a.category, a.location, a.assignedName && `With ${a.assignedName}`].filter(Boolean).join(" · ")}
                          {a.nextServiceDue && <span className={late ? "font-semibold text-red-700" : "text-[#800020]"}> · {late ? "Checkup overdue" : "Next checkup"} {formatDate(a.nextServiceDue)}</span>}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2"><Badge text={a.condition} style={CONDITION_STYLE[a.condition] ?? CONDITION_STYLE.Good} /><Badge text={a.status} style={STATUS_STYLE[a.status] ?? STATUS_STYLE["In Use"]} /><ChevronRight className="size-4 text-stone-400" aria-hidden="true" /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
      </SectionCard>

      {open && <AssetDialog key={open.id ?? "new"} id={open.id} staff={staff} currency={currency} canEdit={canEdit} onClose={() => setOpen(null)} onChanged={refresh} />}
    </div>
  );
}

type Form = { name: string; category: string; location: string; purchaseDate: string; purchaseCost: string; condition: string; status: string; assignedTo: string; nextServiceDue: string; notes: string };
const BLANK: Form = { name: "", category: "Machine", location: "", purchaseDate: "", purchaseCost: "", condition: "Good", status: "In Use", assignedTo: "", nextServiceDue: "", notes: "" };

function AssetDialog({ id, staff, currency, canEdit, onClose, onChanged }: { id: string | null; staff: Staff[]; currency: string; canEdit: boolean; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const isNew = id === null;
  const detail = useQuery<Detail>({ queryKey: ["asset-register", id], queryFn: () => apiGet<Detail>(`/api/asset-register/${id}`), enabled: !isNew });
  const [form, setForm] = useState<Form | null>(isNew ? BLANK : null);
  const f = form ?? (detail.data ? {
    name: detail.data.name, category: detail.data.category, location: detail.data.location, purchaseDate: detail.data.purchaseDate ?? "",
    purchaseCost: detail.data.purchaseCost == null ? "" : String(detail.data.purchaseCost), condition: detail.data.condition, status: detail.data.status,
    assignedTo: detail.data.assignedTo ?? "", nextServiceDue: detail.data.nextServiceDue ?? "", notes: detail.data.notes,
  } : BLANK);
  const set = (k: keyof Form, v: string) => setForm({ ...f, [k]: v });
  const invalidate = () => { onChanged(); if (id) qc.invalidateQueries({ queryKey: ["asset-register", id] }); };

  const save = useMutation({
    mutationFn: () => (isNew ? apiPost("/api/asset-register", f) : apiPatch(`/api/asset-register/${id}`, f)),
    onSuccess: () => { toast.success(isNew ? "Asset added" : "Saved"); invalidate(); if (isNew) onClose(); else setForm(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: () => api(`/api/asset-register/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Asset removed"); onChanged(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [log, setLog] = useState({ servicedOn: todayISO(), performedBy: "", cost: "", notes: "", nextServiceDue: "", markInUse: false, repaired: false });
  const addLog = useMutation({
    mutationFn: () => apiPost(`/api/asset-register/${id}/maintenance`, {
      servicedOn: log.servicedOn, performedBy: log.performedBy, cost: log.cost, notes: log.notes,
      ...(log.nextServiceDue ? { nextServiceDue: log.nextServiceDue } : {}),
      ...(log.repaired && detail.data?.condition === "Needs Repair" ? { condition: "Good" } : {}),
      markInUse: log.markInUse && detail.data?.status === "Under Repair" && (detail.data?.condition !== "Needs Repair" || log.repaired),
    }),
    onSuccess: () => { toast.success("Maintenance logged"); setLog({ ...log, performedBy: "", cost: "", notes: "", nextServiceDue: "", repaired:false, markInUse:false }); setForm(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delLog = useMutation({
    mutationFn: (logId: string) => api(`/api/asset-register/${id}/maintenance/${logId}`, { method: "DELETE" }),
    onSuccess: invalidate, onError: (e: Error) => toast.error(e.message),
  });

  const busy=save.isPending||del.isPending||addLog.isPending||delLog.isPending;
  const ro = !canEdit||busy;
  return (
    <Dialog open onOpenChange={(o) => { if (!o&&!busy) onClose(); }}>
      <DialogContent className="max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add Asset" : detail.data?.name || "Asset"}</DialogTitle>
          <DialogDescription>{isNew ? "Record a machine, tool or piece of equipment." : "Details, condition and maintenance history."}</DialogDescription>
        </DialogHeader>
        {!isNew && detail.isLoading ? <p className="py-6 text-sm text-stone-400">Loading…</p> : !isNew && detail.isError ? <p role="alert" className="py-6 text-sm text-red-700">Could not load this asset. <button className="underline" onClick={()=>void detail.refetch()}>Retry</button></p> : (
          <>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (f.name.trim() && !ro) save.mutate(); }}>
              <label className={`${label} sm:col-span-2`}>Name<input autoFocus={isNew} disabled={ro} className={`${field} mt-1`} value={f.name} maxLength={120} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Juki DDL-8700 sewing machine" required /></label>
              <label className={label}>Category<select disabled={ro} className={`${field} mt-1`} value={f.category} onChange={(e) => set("category", e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className={label}>Location / Station<input disabled={ro} className={`${field} mt-1`} value={f.location} maxLength={120} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Cutting table area" /></label>
              <label className={label}>Purchase Date<input type="date" disabled={ro} className={`${field} mt-1`} value={f.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} /></label>
              <label className={label}>Purchase Cost ({currency})<input type="number" min={0} step="0.01" inputMode="decimal" disabled={ro} className={`${field} mt-1`} value={f.purchaseCost} onChange={(e) => set("purchaseCost", e.target.value)} /></label>
              <label className={label}>Condition<select disabled={ro} className={`${field} mt-1`} value={f.condition} onChange={(e) => set("condition", e.target.value)}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className={label}>Status<select disabled={ro} className={`${field} mt-1`} value={f.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className={label}>Assigned Staff (optional)<select disabled={ro} className={`${field} mt-1`} value={f.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <label className={label}>Next checkup due<input type="date" disabled={ro} className={`${field} mt-1`} value={f.nextServiceDue} onChange={(e) => set("nextServiceDue", e.target.value)} /></label>
              {f.condition === "Needs Repair" && f.status === "In Use" && <p role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:col-span-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />This needs repair but is marked In Use. Change the status to Under Repair while it is being fixed.</p>}
              <label className={`${label} sm:col-span-2`}>Notes<textarea rows={2} disabled={ro} maxLength={1000} className={`${field} mt-1 h-auto py-2`} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Serial number, supplier, warranty…" /></label>
              <div className="flex items-center justify-between gap-3 pt-1 sm:col-span-2">
                {!isNew && canEdit ? <button type="button" onClick={() => { if (!busy && window.confirm(`Remove ${detail.data?.name}? Its maintenance history is deleted too.`)) del.mutate(); }} className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:underline"><Trash2 className="size-4" />Remove asset</button> : <span />}
                {canEdit && <PremiumButton type="submit" loading={save.isPending} disabled={!f.name.trim()}>{isNew ? "Add asset" : "Save changes"}</PremiumButton>}
              </div>
            </form>

            {!isNew && (
              <section aria-label="Maintenance history" className="mt-2 border-t border-[#EEDFE3] pt-4">
                <h3 className="text-sm font-semibold text-[#2F151B]">Maintenance history{detail.data && detail.data.maintenance.length > 0 ? ` · ${formatCurrency(detail.data.maintenance.reduce((n, l) => n + l.cost, 0), currency)} spent` : ""}</h3>
                {canEdit && (
                  <form className="mt-3 grid gap-3 rounded-xl bg-[#FCF8F9] p-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); if(ro)return;if(form){toast.error("Save asset changes before logging maintenance.");return;}if(log.nextServiceDue&&log.nextServiceDue<log.servicedOn){toast.error("Next checkup cannot precede the service date.");return;}addLog.mutate(); }}>
                    <label className={label}>Date<input type="date" required className={`${field} mt-1`} value={log.servicedOn} onChange={(e) => setLog({ ...log, servicedOn: e.target.value })} /></label>
                    <label className={label}>Done by<input className={`${field} mt-1`} maxLength={120} value={log.performedBy} onChange={(e) => setLog({ ...log, performedBy: e.target.value })} placeholder="Name" /></label>
                    <label className={label}>Cost ({currency})<input type="number" min={0} step="0.01" inputMode="decimal" className={`${field} mt-1`} value={log.cost} onChange={(e) => setLog({ ...log, cost: e.target.value })} /></label>
                    <label className={label}>Next checkup<input type="date" className={`${field} mt-1`} value={log.nextServiceDue} onChange={(e) => setLog({ ...log, nextServiceDue: e.target.value })} /></label>
                    <label className={`${label} sm:col-span-3`}>What was done<input className={`${field} mt-1`} maxLength={500} value={log.notes} onChange={(e) => setLog({ ...log, notes: e.target.value })} placeholder="e.g. Replaced belt, oiled and tested" /></label>
                    <div className="flex items-end"><PremiumButton type="submit" size="md" loading={addLog.isPending} className="w-full">Log service</PremiumButton></div>
                    {f.condition==="Needs Repair"&&<label className="flex items-center gap-2 text-xs sm:col-span-4"><input type="checkbox" checked={log.repaired} onChange={e=>setLog({...log,repaired:e.target.checked})}/> Confirm repair completed and condition is Good</label>}
                    {f.status === "Under Repair" && <label className="flex items-center gap-2 text-xs text-stone-600 sm:col-span-4"><input type="checkbox" checked={log.markInUse} onChange={(e) => setLog({ ...log, markInUse: e.target.checked })} />Mark the asset In Use again</label>}
                  </form>
                )}
                {detail.data && detail.data.maintenance.length === 0 ? <p className="mt-3 text-sm text-stone-500">No maintenance logged yet.</p> : (
                  <ul className="mt-3">
                    {detail.data?.maintenance.map((l) => (
                      <li key={l.id} className="flex items-start justify-between gap-3 border-t border-[#EEDFE3] py-2.5 text-sm first:border-t-0">
                        <span><span className="font-medium text-[#2F151B]">{formatDate(l.servicedOn)}</span>{l.performedBy && <span className="text-stone-500"> · {l.performedBy}</span>}{l.notes && <span className="block text-stone-600">{l.notes}</span>}</span>
                        <span className="flex items-center gap-3 tabular-nums text-stone-700">{l.cost > 0 ? formatCurrency(l.cost, currency) : "-"}{canEdit && <button type="button" aria-label="Delete this entry" onClick={() => { if (!busy && window.confirm("Delete this maintenance entry?")) delLog.mutate(l.id); }} className="text-stone-400 hover:text-red-700"><Trash2 className="size-4" /></button>}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
