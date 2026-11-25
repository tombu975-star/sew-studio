"use client";

import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, TrendingUp, Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SavedQuotes } from "@/components/quotes/SavedQuotes";
import { apiErrorMessage, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { useRole } from "@/stores/role";
import type { Customer, Settings } from "@/lib/types";
import { orderOverheadMargin, defaultMarkupPercent } from "@/lib/format";
import { SectionCard } from "@/components/atelier/SectionCard";
import { AnimatedNumber } from "@/components/atelier/AnimatedNumber";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { useNav } from "@/stores/nav";
import { cn } from "@/lib/utils";
import { parseGarmentLabour, parseQuoteComplexities } from "@/lib/quote-pricing";

type GarmentType = string;

type FabricType =
  | "Lace"
  | "Silk"
  | "Kente"
  | "Cotton"
  | "Velvet"
  | "Chiffon"
  | "Satin"
  | "Wool"
  | "Linen"
  | "Crepe"
  | "Other";

type Complexity = string;
type Embellishment =
  | "None"
  | "Beading"
  | "Embroidery"
  | "Crystal"
  | "Hand-painted";

const FABRICS: { label: FabricType; basePerYard: number }[] = [
  { label: "Lace", basePerYard: 180 },
  { label: "Silk", basePerYard: 220 },
  { label: "Kente", basePerYard: 350 },
  { label: "Cotton", basePerYard: 80 },
  { label: "Velvet", basePerYard: 200 },
  { label: "Chiffon", basePerYard: 120 },
  { label: "Satin", basePerYard: 150 },
  { label: "Wool", basePerYard: 250 },
  { label: "Linen", basePerYard: 140 },
  { label: "Crepe", basePerYard: 160 },
  { label: "Other", basePerYard: 150 },
];

const EMBELLISHMENT_COST: Record<Embellishment, number> = {
  None: 0,
  Beading: 400,
  Embroidery: 250,
  Crystal: 600,
  "Hand-painted": 350,
};

// Starter suggestions have no assumed cost. The studio sets prices before adding them.
const STARTER_ITEMS = ["Zipper", "Buttons", "Thread", "Lining", "Interfacing", "Elastic", "Hook and eye", "Shoulder pads", "Boning", "Beads", "Sequins", "Appliqué", "Packaging"].map(name => ({ name, unitCost: 0 }));
function mergeItemPresets(saved: {name:string;unitCost:number}[]) {
  const names = new Set(saved.map(x => x.name.trim().toLowerCase()));
  return [...saved, ...STARTER_ITEMS.filter(x => !names.has(x.name.toLowerCase()))];
}
const STARTER_EXTRAS = ["Additional fitting", "Express alteration", "Garment delivery", "Garment steaming", "Garment packaging", "Personalisation", "Extra lining", "Hand embroidery", "Custom beading", "Garment care service"].map(name => ({ name, price: 0, cost: 0 }));
function mergeExtraPresets(saved: {name:string;price:number;cost:number}[]) {
  const names = new Set(saved.map(x => x.name.trim().toLowerCase()));
  return [...saved, ...STARTER_EXTRAS.filter(x => !names.has(x.name.toLowerCase()))];
}
type CostItem = { id: string; name: string; quantity: number; unitCost: number };
type Extra = { id: string; name: string; price: number; cost: number; accepted: boolean };
const id = () => Math.random().toString(36).slice(2);
export default function QuickQuote() {
  const go = useNav((s) => s.go);

  const [garment, setGarment] = useState<GarmentType>("Gown");
  const [fabric, setFabric] = useState<FabricType>("Lace");
  const [fabricRate, setFabricRate] = useState<number | null>(null);
  const [yards, setYards] = useState<number>(3);
  const [complexity, setComplexity] = useState<Complexity>("Moderate");
  const [embellishment, setEmbellishment] = useState<Embellishment>("None");
  const [rush, setRush] = useState<boolean>(false);
  const [wastagePct, setWastagePct] = useState(0);
  const [labourBaseOverride, setLabourBaseOverride] = useState<number | null>(null);
  const [complexityMultiplierOverride, setComplexityMultiplierOverride] = useState<number | null>(null);
  const [rushPercentOverride, setRushPercentOverride] = useState<number | null>(null);
  const [otherCosts, setOtherCosts] = useState(0);
  const [items, setItems] = useState<CostItem[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const [itemCost, setItemCost] = useState(0);
  const [extraName, setExtraName] = useState("");
  const [extraPrice, setExtraPrice] = useState(0);
  const [extraCost, setExtraCost] = useState(0);
  const [clientFabric, setClientFabric] = useState(false);
  const [handlingCost, setHandlingCost] = useState(0);
  const [itemPresets, setItemPresets] = useState<{name:string;unitCost:number}[]>(STARTER_ITEMS);
  const [extraPresets, setExtraPresets] = useState<{name:string;price:number;cost:number}[]>(STARTER_EXTRAS);
  const shopName = useAuth(a => a.user?.shop?.name);
  const canManagePresets = useRole(s => s.role === "madam");
  const { data: pricingSettings, isLoading: pricingLoading, isError: pricingError, refetch: retryPricing } = useQuery<Settings>({ queryKey: ["settings"], queryFn: () => apiGet<Settings>("/api/settings") });
  useEffect(() => {
    if (!pricingSettings) return;
    setItemPresets(mergeItemPresets(pricingSettings.quoteItemPresets ?? []));
    setExtraPresets(mergeExtraPresets(pricingSettings.quoteExtraPresets ?? []));
  }, [pricingSettings?.quoteItemPresets, pricingSettings?.quoteExtraPresets]);
  const savePresets = (category: "items" | "extras", entries: typeof itemPresets | typeof extraPresets) => {
    if (!canManagePresets) return;
    // Patch only the edited category so other studio suggestion lists are not overwritten.
    const payload = category === "items"
      ? { quoteItemPresets: (entries as typeof itemPresets).slice(0, 100) }
      : { quoteExtraPresets: (entries as typeof extraPresets).slice(0, 100) };
    void apiPatch<Settings>("/api/settings", payload)
      .then(() => { void qc.invalidateQueries({ queryKey: ["settings"] }); })
      .catch((error: unknown) => {
        toast.error(apiErrorMessage(error, "Could not save studio suggestions."));
        void qc.invalidateQueries({ queryKey: ["settings"] });
      });
  };
  const removeSavedItem = () => {
    const name = itemName.trim().toLowerCase();
    if (!name) return;
    const saved = itemPresets.filter(x => x.name.toLowerCase() !== name);
    const custom = saved.filter(x => !STARTER_ITEMS.some(y => y.name.toLowerCase() === x.name.toLowerCase()));
    setItemPresets(mergeItemPresets(custom));
    savePresets("items", custom);
    setItemName(""); setItemCost(0);
    toast.success("Studio item suggestion removed.");
  };
  const removeSavedExtra = () => {
    const name = extraName.trim().toLowerCase();
    if (!name) return;
    const saved = extraPresets.filter(x => x.name.toLowerCase() !== name);
    const custom = saved.filter(x => !STARTER_EXTRAS.some(y => y.name.toLowerCase() === x.name.toLowerCase()));
    setExtraPresets(mergeExtraPresets(custom));
    savePresets("extras", custom);
    setExtraName(""); setExtraPrice(0); setExtraCost(0);
    toast.success("Studio extra suggestion removed.");
  };
  const addItem = () => {
    if (!Number.isFinite(itemQty) || itemQty <= 0) { toast.error("Enter a positive quantity."); return; }
    if (!itemName.trim()) { toast.error("Enter an item name."); return; }
    setItems(v => [...v, {id:id(),name:itemName.trim(),quantity:Math.max(0,itemQty),unitCost:Math.max(0,itemCost)}]);
    const saved = [...itemPresets.filter(x => x.name.toLowerCase() !== itemName.trim().toLowerCase()),{name:itemName.trim(),unitCost:Math.max(0,itemCost)}];
    if (canManagePresets) { setItemPresets(mergeItemPresets(saved)); savePresets("items", saved); }
    setItemName(""); setItemQty(1); setItemCost(0);
  };
  const addExtra = () => {
    if (!extraName.trim()) { toast.error("Enter an extra name."); return; }
    setExtras(v => [...v,{id:id(),name:extraName.trim(),price:Math.max(0,extraPrice),cost:Math.max(0,extraCost),accepted:true}]);
    const saved = [...extraPresets.filter(x => x.name.toLowerCase() !== extraName.trim().toLowerCase()),{name:extraName.trim(),price:Math.max(0,extraPrice),cost:Math.max(0,extraCost)}];
    if (canManagePresets) { setExtraPresets(mergeExtraPresets(saved)); savePresets("extras", saved); }
    setExtraName(""); setExtraPrice(0); setExtraCost(0);
  };
  const [markupOverride, setMarkupOverride] = useState<number | null>(null);
  const [finalOverride, setFinalOverride] = useState<number | null>(null);
  const [discountPct, setDiscountPct] = useState(0);
  const [depositOverride, setDepositOverride] = useState<number | null>(null);

  const garmentRates = useMemo(() => parseGarmentLabour(pricingSettings?.quoteGarmentLabour), [pricingSettings?.quoteGarmentLabour]);
  const complexityRates = useMemo(() => parseQuoteComplexities(pricingSettings?.quoteComplexityLevels), [pricingSettings?.quoteComplexityLevels]);
  const garmentDefault = garmentRates.find(x => x.name === garment)?.baseLabour ?? garmentRates[0]?.baseLabour ?? 0;
  const complexityDefault = complexityRates.find(x => x.name === complexity)?.multiplier ?? complexityRates[0]?.multiplier ?? 1;
  const complexityMultiplier = complexityMultiplierOverride ?? complexityDefault;
  useEffect(() => {
    if (garmentRates.length && !garmentRates.some(x => x.name === garment)) { setGarment(garmentRates[0].name); setLabourBaseOverride(null); }
  }, [garmentRates, garment]);
  useEffect(() => {
    if (complexityRates.length && !complexityRates.some(x => x.name === complexity)) { setComplexity(complexityRates[0].name); setComplexityMultiplierOverride(null); }
  }, [complexityRates, complexity]);
  const calc = useMemo(() => {
    const fabricBase =
      fabricRate ?? FABRICS.find((f) => f.label === fabric)?.basePerYard ?? 150;
    const safeYards = Math.max(0, Number(yards) || 0);

    const fabricCost = clientFabric ? 0 : fabricBase * safeYards;
    const labourBase = labourBaseOverride ?? garmentDefault;
    const labour = Math.round(labourBase * complexityMultiplier);
    const embellishmentCost = EMBELLISHMENT_COST[embellishment];
    const subtotal = fabricCost + labour + embellishmentCost;
    const rushPercent = rushPercentOverride ?? pricingSettings?.rushFeePercent ?? 25;
    const rushPremium = rush ? Math.round(subtotal * Math.max(0, rushPercent) / 100) : 0;
    const wastage = fabricCost * Math.max(0, wastagePct) / 100;
    const overhead = orderOverheadMargin({ fabricCost: fabricCost + wastage }, pricingSettings);
    const itemTotal = items.reduce((sum,x) => sum + x.quantity * x.unitCost, 0);
    const acceptedExtras = extras.filter(x => x.accepted);
    const extrasCost = acceptedExtras.reduce((sum,x) => sum + x.cost, 0);
    const extrasPrice = acceptedExtras.reduce((sum,x) => sum + x.price, 0);
    const trueCost = fabricCost + wastage + labour + embellishmentCost + Math.max(0, otherCosts) + itemTotal + (clientFabric ? Math.max(0,handlingCost) : 0) + extrasCost + overhead;
    const markup = markupOverride ?? defaultMarkupPercent(pricingSettings);
    const recommendedBase = Math.round((trueCost - extrasCost) * (1 + Math.max(0,markup) / 100) + rushPremium);
    const recommendedPrice = recommendedBase + extrasPrice;
    const finalPrice = (finalOverride ?? recommendedBase) + extrasPrice;
    const discount = finalPrice * Math.min(100, Math.max(0, discountPct)) / 100;
    const total = Math.max(0, finalPrice - discount);
    const depositPct = depositOverride ?? pricingSettings?.depositPercent ?? 50;
    const suggestedDeposit = Math.round(total * Math.min(100, Math.max(0, depositPct)) / 100);

    // Profit deducts all known production costs, including labour and allocated overhead.
    const estMargin = total - trueCost;
    const estMarginPct = total > 0 ? (estMargin / total) * 100 : 0;
    const markupPct = trueCost > 0 ? (estMargin / trueCost) * 100 : 0;

    return {
      fabricBase,
      fabricCost,
      labourBase,
      labour,
      rushPercent,
      embellishmentCost,
      subtotal,
      rushPremium,
      total,
      suggestedDeposit,
      estMargin,
      estMarginPct,
      markupPct,
      trueCost,
      overhead,
      markup,
      wastage,
      recommendedPrice,
      finalPrice,
      discount,
      depositPct,
      itemTotal,
      extrasCost,
      extrasPrice,
    };
  }, [garment, fabric, fabricRate, yards, complexity, embellishment, rush, pricingSettings, wastagePct, otherCosts, markupOverride, finalOverride, discountPct, depositOverride, items, extras, clientFabric, handlingCost, labourBaseOverride, rushPercentOverride, garmentDefault, complexityMultiplier]);

  const qc = useQueryClient();
  const [quoteCustomerId, setQuoteCustomerId] = useState("");
  const [validDaysOverride, setValidDays] = useState<string | null>(null);
  const validDays = validDaysOverride ?? String(pricingSettings?.quoteValidDays ?? 14);
  const canQuote = !!pricingSettings && !pricingLoading && !pricingError && Number.isFinite(calc.total) && calc.total > 0 && Number.isFinite(Number(validDays)) && Number(validDays) >= 0 && Number(validDays) <= 3650;
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => apiGet<Customer[]>("/api/customers"),
  });
  const saveQuote = useMutation({
    mutationFn: () => {
      if (!canQuote) throw new Error("Check pricing settings and quote validity before saving.");
      const until = new Date(Date.now() + Number(validDays) * 864e5).toISOString().slice(0, 10);
      const c = customers.find((x) => x.id === quoteCustomerId);
      return apiPost("/api/quotes", {
        garment: `${garment} — ${fabric}`,
        customerId: quoteCustomerId || null,
        customerName: c?.name,
        total: calc.total,
        deposit: calc.suggestedDeposit,
        validUntil: until,
        inputs: { garment, fabric, fabricRate: calc.fabricBase, yards, complexity, complexityMultiplier, embellishment, rush, labourBase: calc.labourBase, labour: calc.labour, rushPercent: calc.rushPercent, wastagePct, otherCosts, items, extras, clientFabric, handlingCost, markup: calc.markup, finalPrice: calc.finalPrice, discountPct, trueCost: calc.trueCost, profit: calc.estMargin, overhead: calc.overhead, depositPct: calc.depositPct },
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); toast.success("Quote saved"); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const handleConvert = () => {
    if (!canQuote) return;
    go("new-order", {
      params: {
        garment: `${garment} — ${fabric}`,
        customerId: quoteCustomerId,
        quotePrice: String(calc.total),
        quoteCostLines: JSON.stringify([
          {key:"materials",label:"Fabric / materials",amount:calc.fabricCost},
          {key:"wastage",label:"Material wastage",amount:calc.wastage},
          {key:"labour",label:"Labour",amount:calc.labour},
          {key:"embellishment",label:"Embellishment",amount:calc.embellishmentCost},
          {key:"accessories",label:"Accessories and production costs",amount:Math.max(0,otherCosts)+calc.itemTotal},
          {key:"handling",label:"Customer fabric handling",amount:clientFabric?Math.max(0,handlingCost):0},
          {key:"extras",label:"Accepted optional extras",amount:calc.extrasCost},
          {key:"overhead",label:"Studio overhead allocation",amount:calc.overhead},
        ]),
        quoteFabricCost: String(calc.fabricCost + calc.wastage),
        quoteLabourCost: String(calc.labour),
        quoteOtherCost: String(Math.max(0, calc.trueCost - calc.fabricCost - calc.wastage - calc.labour - calc.overhead)),
        quoteOverhead: String(calc.overhead),
        quoteMarkup: String(calc.markup),
        quoteSummary: `Quote converted from ${garment} — ${fabric}. Includes accepted extras, wastage and production costs. Verify order costs before saving.`,
      },
    });
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pt-5 max-w-[1200px] mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 items-start">
        {/* Calculator form (3/5) */}
        <SectionCard
          title="Garment details"
          className="lg:col-span-3"
          bodyClassName="grid gap-4"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="qq-garment">Garment Type</Label>
            <Select
              value={garment}
              onValueChange={(v) => { setGarment(v); setLabourBaseOverride(null); }}
            >
              <SelectTrigger id="qq-garment" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {garmentRates.map((g) => (
                  <SelectItem key={g.name} value={g.name}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="qq-fabric">Fabric</Label>
            <Select
              value={fabric}
              onValueChange={(v) => { setFabric(v as FabricType); setFabricRate(null); }}
            >
              <SelectTrigger id="qq-fabric" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FABRICS.map((f) => (
                  <SelectItem key={f.label} value={f.label}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-stone-500 tabular-nums">
              {formatCurrency(calc.fabricBase)} / yard
            </p>
          </div>

          <div className="grid gap-1"><Label htmlFor="qq-fabric-rate">Actual fabric cost per yard</Label><Input id="qq-fabric-rate" type="number" min={0} step="0.01" disabled={clientFabric} value={calc.fabricBase} onChange={e=>setFabricRate(Math.max(0,Number(e.target.value)||0))}/>{fabricRate !== null && <button type="button" className="text-left text-xs underline text-[#800020]" onClick={()=>setFabricRate(null)}>Restore suggested fabric rate</button>}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="qq-yards">Yards</Label>
              <Input
                id="qq-yards"
                type="number"
                min={0}
                step={0.5}
                value={yards}
                onChange={(e) => setYards(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="qq-complexity">Complexity</Label>
              <Select
                value={complexity}
                onValueChange={(v) => { setComplexity(v); setComplexityMultiplierOverride(null); }}
              >
                <SelectTrigger id="qq-complexity" className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {complexityRates.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-stone-500 tabular-nums">
                Multiplier {`${complexityMultiplier}×`}
              </p>
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border border-[#EEDFE3] p-3">
            <p className="font-semibold text-sm">Labour costing</p>
            <p className="text-xs text-stone-500">Labour cost = base labour rate × selected complexity multiplier. Included in True Cost, not profit.</p>
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
              <div className="grid gap-1"><Label htmlFor="qq-labour-base">Base labour  (studio currency)</Label><Input id="qq-labour-base" type="number" min={0} value={labourBaseOverride ?? garmentDefault} onChange={e=>setLabourBaseOverride(Math.max(0,Number(e.target.value)||0))} /></div>
              <div className="grid gap-1"><Label htmlFor="qq-complexity-multiplier">Complexity multiplier ×</Label><Input id="qq-complexity-multiplier" type="number" min={0.01} max={100} step={0.05} value={complexityMultiplier} onChange={e=>setComplexityMultiplierOverride(Math.min(100,Math.max(0.01,Number(e.target.value)||0.01)))} /></div>
            </div>
            <p className="text-sm font-medium">Calculated labour: {formatCurrency(calc.labour)}</p>
            {(labourBaseOverride !== null || complexityMultiplierOverride !== null) && <button type="button" className="text-xs text-[#800020] underline text-left" onClick={()=>{setLabourBaseOverride(null);setComplexityMultiplierOverride(null);}}>Restore studio labour defaults</button>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="qq-embellishment">Embellishment</Label>
            <Select
              value={embellishment}
              onValueChange={(v) => setEmbellishment(v as Embellishment)}
            >
              <SelectTrigger id="qq-embellishment" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["None", "Beading", "Embroidery", "Crystal", "Hand-painted"] as Embellishment[]).map(
                  (e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                      {e !== "None" && ` · +${formatCurrency(EMBELLISHMENT_COST[e])}`}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3"><div><Label htmlFor="qq-client-fabric">Client's own fabric</Label><p className="text-xs text-stone-500">Fabric cost becomes zero.</p></div><Switch id="qq-client-fabric" checked={clientFabric} onCheckedChange={setClientFabric} /></div>
          {clientFabric && <div className="grid gap-1"><Label htmlFor="qq-handling">Handling allowance  (studio currency)</Label><Input id="qq-handling" type="number" min={0} value={handlingCost} onChange={e => setHandlingCost(Math.max(0,Number(e.target.value)||0))} /></div>}
          <Separator />
          <div className="grid gap-2">
            <h3 className="font-semibold">Other production items</h3>
            <p className="text-xs text-stone-500">Choose a studio-saved item or starter suggestion, then enter its actual cost before adding.</p>
            <select aria-label="Choose production item" className="w-full min-w-0 min-h-11 border rounded-md bg-white px-3 py-2" value="" onChange={e => { const x=itemPresets.find(x=>x.name===e.target.value); if(x){setItemName(x.name);setItemCost(x.unitCost);} }}><option value="">Choose a production item…</option><optgroup label="Your saved items">{itemPresets.filter(x=>!STARTER_ITEMS.some(y=>y.name.toLowerCase()===x.name.toLowerCase())).map(x=><option key={x.name} value={x.name}>{x.name} · {formatCurrency(x.unitCost)}</option>)}</optgroup><optgroup label="Starter suggestions">{itemPresets.filter(x=>STARTER_ITEMS.some(y=>y.name.toLowerCase()===x.name.toLowerCase())).map(x=><option key={x.name} value={x.name}>{x.name} · {formatCurrency(x.unitCost)}</option>)}</optgroup></select>
            <Label htmlFor="qq-item-name">Item name</Label><Input id="qq-item-name" placeholder="Zip, buttons, thread…" value={itemName} onChange={e=>setItemName(e.target.value)} />
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2"><div><Label htmlFor="qq-item-qty">Quantity</Label><Input id="qq-item-qty" type="number" min={0} value={itemQty} onChange={e=>setItemQty(Math.max(0,Number(e.target.value)||0))} /></div><div><Label htmlFor="qq-item-cost">Unit cost  (studio currency)</Label><Input id="qq-item-cost" type="number" min={0} value={itemCost} onChange={e=>setItemCost(Math.max(0,Number(e.target.value)||0))} /></div></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={addItem} className="rounded-md border p-2 font-medium">+ Add item</button>{canManagePresets && itemPresets.some(x=>x.name.toLowerCase()===itemName.trim().toLowerCase() && !STARTER_ITEMS.some(y=>y.name.toLowerCase()===x.name.toLowerCase())) && <button type="button" onClick={removeSavedItem} className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700">Remove saved suggestion</button>}</div>
            {items.map(x=><div key={x.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-sm"><span>{x.name} × {x.quantity} · {formatCurrency(x.quantity*x.unitCost)}</span><button type="button" className="text-red-700 underline" onClick={()=>setItems(v=>v.filter(y=>y.id!==x.id))}>Remove</button></div>)}
          </div>
          <Separator />
          <div className="grid gap-2">
            <h3 className="font-semibold">Optional extras</h3>
            <p className="text-xs text-stone-500">Choose a studio-saved extra or starter suggestion, then set its price and cost. Only accepted extras affect the total and profit.</p>
            <select aria-label="Choose optional extra" className="w-full min-w-0 min-h-11 border rounded-md bg-white px-3 py-2" value="" onChange={e=>{const x=extraPresets.find(x=>x.name===e.target.value);if(x){setExtraName(x.name);setExtraPrice(x.price);setExtraCost(x.cost);}}}><option value="">Choose an optional extra…</option><optgroup label="Your saved extras">{extraPresets.filter(x=>!STARTER_EXTRAS.some(y=>y.name.toLowerCase()===x.name.toLowerCase())).map(x=><option key={x.name} value={x.name}>{x.name} · {formatCurrency(x.price)}</option>)}</optgroup><optgroup label="Starter suggestions">{extraPresets.filter(x=>STARTER_EXTRAS.some(y=>y.name.toLowerCase()===x.name.toLowerCase())).map(x=><option key={x.name} value={x.name}>{x.name} · {formatCurrency(x.price)}</option>)}</optgroup></select>
            <Label htmlFor="qq-extra-name">Extra name</Label><Input id="qq-extra-name" placeholder="Laundry, lining, fitting…" value={extraName} onChange={e=>setExtraName(e.target.value)} />
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2"><div><Label htmlFor="qq-extra-price">Client price  (studio currency)</Label><Input id="qq-extra-price" type="number" min={0} value={extraPrice} onChange={e=>setExtraPrice(Math.max(0,Number(e.target.value)||0))} /></div><div><Label htmlFor="qq-extra-cost">Production cost  (studio currency)</Label><Input id="qq-extra-cost" type="number" min={0} value={extraCost} onChange={e=>setExtraCost(Math.max(0,Number(e.target.value)||0))} /></div></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={addExtra} className="rounded-md border p-2 font-medium">+ Add extra</button>{canManagePresets && extraPresets.some(x=>x.name.toLowerCase()===extraName.trim().toLowerCase() && !STARTER_EXTRAS.some(y=>y.name.toLowerCase()===x.name.toLowerCase())) && <button type="button" onClick={removeSavedExtra} className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700">Remove saved suggestion</button>}</div>
            {extras.map(x=><div key={x.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-sm"><label className="flex min-w-0 flex-wrap items-center gap-2 break-words"><input type="checkbox" checked={x.accepted} onChange={e=>setExtras(v=>v.map(y=>y.id===x.id?{...y,accepted:e.target.checked}:y))} />{x.name} · {formatCurrency(x.price)}</label><button type="button" className="text-red-700 underline" onClick={()=>setExtras(v=>v.filter(y=>y.id!==x.id))}>Remove</button></div>)}
          </div>
          <Separator />

          <div className="grid gap-1.5"><Label htmlFor="qq-rush-rate">Rush premium %</Label><Input id="qq-rush-rate" type="number" min={0} value={rushPercentOverride ?? pricingSettings?.rushFeePercent ?? 25} onChange={e=>setRushPercentOverride(Math.max(0,Number(e.target.value)||0))} /><p className="text-xs text-stone-500">Applied to fabric, labour and embellishment before the selling-price discount.</p></div>
          <Separator />

          <div className="flex items-center justify-between gap-3">
            <div className="grid gap-0.5">
              <Label htmlFor="qq-rush" className="text-[#2F151B]">
                2-Week Rush
              </Label>
              <p className="text-xs text-stone-500">
                Adds a configurable premium to fabric, labour and embellishment.
              </p>
            </div>
            <Switch
              id="qq-rush"
              checked={rush}
              onCheckedChange={setRush}
              aria-label="Toggle rush production"
            />
          </div>
        </SectionCard>

        {/* Live summary (2/5) */}
        <div className="lg:col-span-2 lg:sticky lg:top-6">
          <SectionCard title="Estimate" bodyClassName="grid gap-3">
            <LineItem
              label={`Fabric · ${fabric} × ${yards || 0} yd`}
              value={calc.fabricCost}
            />
            <LineItem
              label={`Labour · ${garment} (${formatCurrency(calc.labourBase)} × ${complexityMultiplier}×)`}
              value={calc.labour}
            />
            {calc.embellishmentCost > 0 && (
              <LineItem
                label={`Embellishment · ${embellishment}`}
                value={calc.embellishmentCost}
              />
            )}

            <LineItem label={`Material wastage (${wastagePct}%)`} value={calc.wastage} />
            <LineItem label="Other production costs (manual)" value={otherCosts} />
            {items.map(x => <LineItem key={x.id} label={x.name + " × " + x.quantity} value={x.quantity * x.unitCost} />)}
            {clientFabric && <LineItem label="Client fabric handling" value={handlingCost} />}
            {extras.filter(x => x.accepted).map(x => <LineItem key={x.id} label={"Extra cost · " + x.name} value={x.cost} />)}
            <LineItem label="Allocated overhead" value={calc.overhead} />
            <LineItem label="TRUE COST" value={calc.trueCost} emphasized />
            <p className="text-xs text-stone-500">Labour is included in True Cost. Overhead follows studio settings.</p>
            <LineItem label={`Settings mark-up (${calc.markup}%)`} value={(calc.trueCost - calc.extrasCost) * calc.markup / 100} />
            <Separator />

            {extras.filter(x => x.accepted).map(x => <LineItem key={x.id} label={"Accepted extra · " + x.name} value={x.price} />)}
            <LineItem label="Recommended selling price" value={calc.recommendedPrice} emphasized />

            {rush && (
              <LineItem
                label={`Rush premium (+${calc.rushPercent}% on fabric, labour and embellishment)`}
                value={calc.rushPremium}
                accent
              />
            )}

            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
              <div className="grid gap-1"><Label htmlFor="qq-wastage">Wastage %</Label><Input id="qq-wastage" type="number" min={0} value={wastagePct} onChange={e => setWastagePct(Math.max(0, Number(e.target.value) || 0))} /></div>
              <div className="grid gap-1"><Label htmlFor="qq-other">Other costs  (studio currency)</Label><Input id="qq-other" type="number" min={0} value={otherCosts} onChange={e => setOtherCosts(Math.max(0, Number(e.target.value) || 0))} /></div>
              <div className="grid gap-1"><Label htmlFor="qq-markup">Mark-up %</Label><Input id="qq-markup" type="number" min={0} value={calc.markup} onChange={e => setMarkupOverride(Math.max(0, Number(e.target.value) || 0))} /></div>
              <div className="grid gap-1"><Label htmlFor="qq-deposit">Deposit %</Label><Input id="qq-deposit" type="number" min={0} max={100} value={calc.depositPct} onChange={e => setDepositOverride(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} /></div>
              <div className="grid gap-1"><Label htmlFor="qq-final">Base final price (studio currency, excluding extras)</Label><Input id="qq-final" type="number" min={0} value={calc.finalPrice - calc.extrasPrice} onChange={e => setFinalOverride(Math.max(0, Number(e.target.value) || 0))} /></div>
              <div className="grid gap-1"><Label htmlFor="qq-discount">Discount %</Label><Input id="qq-discount" type="number" min={0} max={100} value={discountPct} onChange={e => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} /></div>
            </div>
            {calc.discount > 0 && <LineItem label="Discount" value={-calc.discount} />}
            <Separator />

            <div className="mt-1 p-4 rounded-md border border-[#800020]/15 bg-[#F7F5F3]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#800020]">
                Final price after discount
              </p>
              <p
                className="font-sans font-semibold text-[#30272A] leading-tight tabular-nums break-words"
                style={{ fontSize: "clamp(28px, 3vw, 40px)" }}
              >
                <AnimatedNumber value={calc.total} format="currency" />
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                <span>{calc.depositPct}% deposit</span>
                <span className="font-medium text-[#2F151B] tabular-nums">
                  {formatCurrency(calc.suggestedDeposit)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4A6B53]">
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Estimated profit
              </span>
              <span className="min-w-0 break-words font-medium tabular-nums">
                {formatCurrency(calc.estMargin)} · margin {calc.estMarginPct.toFixed(1)}% · mark-up {calc.markupPct.toFixed(1)}%
              </span>
            </div>

            {calc.estMargin < 0 && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">Warning: final price is below True Cost. This quote makes a loss.</p>}
            {calc.estMargin >= 0 && calc.estMarginPct < 10 && <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Low profit margin: consider reviewing the selling price.</p>}
            <LineItem label="Balance after deposit" value={Math.max(0,calc.total-calc.suggestedDeposit)} emphasized />
            {(pricingLoading || pricingError) && <p role="status" className="text-sm text-amber-800">{pricingLoading ? "Loading studio pricing…" : "Studio pricing could not load."} {pricingError && <button type="button" className="underline" onClick={()=>void retryPricing()}>Retry</button>}</p>}
            <PremiumButton
              disabled={!canQuote || saveQuote.isPending}
              onClick={handleConvert}
              size="md"
              className="w-full mt-1"
            >
              <ShoppingBag className="w-4 h-4" />
              Convert to Order
            </PremiumButton>

            <div className="grid gap-2 border-t border-[#EEDFE3] pt-3">
              <Label htmlFor="qq-customer">Save for customer (optional)</Label>
              <select
                id="qq-customer"
                value={quoteCustomerId}
                onChange={(e) => setQuoteCustomerId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
              >
                <option value="">No customer yet</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Label htmlFor="qq-valid">Valid for</Label>
              <select
                id="qq-valid"
                value={validDays}
                onChange={(e) => setValidDays(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
              >
                {!["7","14","30"].includes(validDays) && <option value={validDays}>{validDays} days (studio default)</option>}
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
              <PremiumButton variant="secondary" size="md" className="w-full" onClick={() => saveQuote.mutate()} disabled={saveQuote.isPending || !canQuote}>
                <Save className="w-4 h-4" />
                {saveQuote.isPending ? "Saving…" : "Save quote"}
              </PremiumButton>
            </div>

            <p className="text-xs text-stone-400 text-center">
              Estimate only — final price may vary after consultation.
            </p>
          </SectionCard>
        </div>
      </div>

      <div className="mt-5">
        <SavedQuotes shopName={shopName} />
      </div>
    </div>
  );
}

function LineItem({
  label,
  value,
  emphasized,
  accent,
}: {
  label: string;
  value: number;
  emphasized?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={cn(
          "text-sm",
          accent ? "text-amber-700" : "text-stone-500",
          emphasized && "text-[#2F151B] font-medium"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-sm tabular-nums",
          accent ? "text-amber-700 font-medium" : "text-[#2F151B]",
          emphasized && "font-semibold"
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}
