"use client";

import { useMemo, useState } from "react";
import { Zap, ShoppingBag, TrendingUp, Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SavedQuotes } from "@/components/quotes/SavedQuotes";
import { apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import type { Customer } from "@/lib/types";
import { PageHeader } from "@/components/atelier/PageHeader";
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

type GarmentType =
  | "Gown"
  | "Suit"
  | "Dress"
  | "Agbada"
  | "Skirt Set"
  | "Slit & Koba"
  | "Shirt"
  | "Trousers"
  | "Other";

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

type Complexity = "Simple" | "Moderate" | "Elaborate" | "Couture";
type Embellishment =
  | "None"
  | "Beading"
  | "Embroidery"
  | "Crystal"
  | "Hand-painted";

const GARMENT_TYPES: GarmentType[] = [
  "Gown",
  "Suit",
  "Dress",
  "Agbada",
  "Skirt Set",
  "Slit & Koba",
  "Shirt",
  "Trousers",
  "Other",
];

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

const LABOUR_BASE: Record<GarmentType, number> = {
  Gown: 600,
  Suit: 800,
  Dress: 500,
  Agbada: 700,
  "Skirt Set": 450,
  "Slit & Koba": 500,
  Shirt: 300,
  Trousers: 350,
  Other: 500,
};

const COMPLEXITY_MULTIPLIER: Record<Complexity, number> = {
  Simple: 1.0,
  Moderate: 1.3,
  Elaborate: 1.6,
  Couture: 2.0,
};

const COMPLEXITY_LABEL: Record<Complexity, string> = {
  Simple: "1.0×",
  Moderate: "1.3×",
  Elaborate: "1.6×",
  Couture: "2.0×",
};

const EMBELLISHMENT_COST: Record<Embellishment, number> = {
  None: 0,
  Beading: 400,
  Embroidery: 250,
  Crystal: 600,
  "Hand-painted": 350,
};

export default function QuickQuote() {
  const go = useNav((s) => s.go);

  const [garment, setGarment] = useState<GarmentType>("Gown");
  const [fabric, setFabric] = useState<FabricType>("Lace");
  const [yards, setYards] = useState<number>(3);
  const [complexity, setComplexity] = useState<Complexity>("Moderate");
  const [embellishment, setEmbellishment] = useState<Embellishment>("None");
  const [rush, setRush] = useState<boolean>(false);

  const calc = useMemo(() => {
    const fabricBase =
      FABRICS.find((f) => f.label === fabric)?.basePerYard ?? 150;
    const safeYards = Math.max(0, Number(yards) || 0);

    const fabricCost = fabricBase * safeYards;
    const labourBase = LABOUR_BASE[garment] ?? 500;
    const labour = Math.round(labourBase * COMPLEXITY_MULTIPLIER[complexity]);
    const embellishmentCost = EMBELLISHMENT_COST[embellishment];
    const subtotal = fabricCost + labour + embellishmentCost;
    const rushPremium = rush ? Math.round(subtotal * 0.25) : 0;
    const total = subtotal + rushPremium;
    const suggestedDeposit = Math.round(total * 0.5);

    // estimated margin = total minus direct material costs (fabric + embellishment)
    const directMaterial = fabricCost + embellishmentCost;
    const estMargin = total - directMaterial;
    const estMarginPct = total > 0 ? Math.round((estMargin / total) * 100) : 0;

    return {
      fabricBase,
      fabricCost,
      labour,
      embellishmentCost,
      subtotal,
      rushPremium,
      total,
      suggestedDeposit,
      estMargin,
      estMarginPct,
    };
  }, [garment, fabric, yards, complexity, embellishment, rush]);

  const qc = useQueryClient();
  const shopName = useAuth((a) => a.user?.shop?.name);
  const [quoteCustomerId, setQuoteCustomerId] = useState("");
  const [validDays, setValidDays] = useState("14");
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => apiGet<Customer[]>("/api/customers"),
  });
  const saveQuote = useMutation({
    mutationFn: () => {
      const until = new Date(Date.now() + Number(validDays) * 864e5).toISOString().slice(0, 10);
      const c = customers.find((x) => x.id === quoteCustomerId);
      return apiPost("/api/quotes", {
        garment: `${garment} — ${fabric}`,
        customerId: quoteCustomerId || null,
        customerName: c?.name,
        total: calc.total,
        deposit: calc.suggestedDeposit,
        validUntil: until,
        inputs: { garment, fabric, yards, complexity, embellishment, rush },
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); toast.success("Quote saved"); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const handleConvert = () => {
    go("new-order", {
      params: { garment: `${garment} — ${fabric}` },
    });
  };

  return (
    <div className="p-5 md:p-8 max-w-[900px] mx-auto w-full">
      <PageHeader
        eyebrow="Instant pricing"
        eyebrowIcon={Zap}
        title="Quotes"
        subtitle="Price a garment, save the quote and follow it to an order."
        actions={
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#800020]/8 border border-[#800020]/15 text-[#800020]">
            <Zap className="w-4 h-4" />
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
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
              onValueChange={(v) => setGarment(v as GarmentType)}
            >
              <SelectTrigger id="qq-garment" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GARMENT_TYPES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="qq-fabric">Fabric</Label>
            <Select
              value={fabric}
              onValueChange={(v) => setFabric(v as FabricType)}
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
                onValueChange={(v) => setComplexity(v as Complexity)}
              >
                <SelectTrigger id="qq-complexity" className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Simple", "Moderate", "Elaborate", "Couture"] as Complexity[]).map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-stone-500 tabular-nums">
                Multiplier {COMPLEXITY_LABEL[complexity]}
              </p>
            </div>
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

          <Separator />

          <div className="flex items-center justify-between gap-3">
            <div className="grid gap-0.5">
              <Label htmlFor="qq-rush" className="text-[#2F151B]">
                2-Week Rush
              </Label>
              <p className="text-xs text-stone-500">
                Adds a 25% priority premium.
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
              label={`Labour · ${garment}`}
              value={calc.labour}
            />
            {calc.embellishmentCost > 0 && (
              <LineItem
                label={`Embellishment · ${embellishment}`}
                value={calc.embellishmentCost}
              />
            )}

            <Separator />

            <LineItem label="Subtotal" value={calc.subtotal} emphasized />

            {rush && (
              <LineItem
                label="Rush premium (+25%)"
                value={calc.rushPremium}
                accent
              />
            )}

            <Separator />

            <div className="mt-1 p-4 rounded-md border border-[#800020]/15 bg-gradient-to-br from-[#800020]/5 to-transparent">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#800020]">
                Total
              </p>
              <p
                className="font-display font-semibold text-[#800020] leading-tight tabular-nums"
                style={{ fontSize: "clamp(28px, 3vw, 40px)" }}
              >
                <AnimatedNumber value={calc.total} format="currency" />
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                <span>50% deposit</span>
                <span className="font-medium text-[#2F151B] tabular-nums">
                  {formatCurrency(calc.suggestedDeposit)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#4A6B53]">
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Est. margin
              </span>
              <span className="font-medium tabular-nums">
                {formatCurrency(calc.estMargin)} · {calc.estMarginPct}%
              </span>
            </div>

            <PremiumButton
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
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
              <PremiumButton variant="secondary" size="md" className="w-full" onClick={() => saveQuote.mutate()} disabled={saveQuote.isPending || calc.total <= 0}>
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
