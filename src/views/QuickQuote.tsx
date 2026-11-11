"use client";

import { useMemo, useState } from "react";
import { Zap, ShoppingBag, TrendingUp } from "lucide-react";
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
        title="Quick Quote"
        subtitle="Estimate a garment price in seconds."
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
            <p className="text-[11px] text-stone-500 tabular-nums">
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
              <p className="text-[11px] text-stone-500 tabular-nums">
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
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#800020]">
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

            <div className="flex items-center justify-between text-[11px] text-[#4A6B53]">
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

            <p className="text-[11px] text-stone-400 text-center">
              Estimate only — final price may vary after consultation.
            </p>
          </SectionCard>
        </div>
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
