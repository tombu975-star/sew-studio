"use client";

import { useMemo, useState } from "react";
import { Zap, ArrowRight } from "lucide-react";
import { AtelierCard } from "@/components/atelier/AtelierCard";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useNav } from "@/stores/nav";

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

    return {
      fabricBase,
      fabricCost,
      labour,
      embellishmentCost,
      subtotal,
      rushPremium,
      total,
      suggestedDeposit,
    };
  }, [garment, fabric, yards, complexity, embellishment, rush]);

  const handleConvert = () => {
    go("new-order", {
      params: { garment: `${garment} — ${fabric}` },
    });
  };

  return (
    <div className="p-5 md:p-8 max-w-[800px] mx-auto w-full">
      {/* Header */}
      <header className="flex items-start gap-3 mb-6">
        <div className="hidden sm:flex w-10 h-10 rounded-full border border-[#E7E5E4] items-center justify-center bg-white">
          <Zap className="w-4 h-4 text-[#800020]" />
        </div>
        <div>
          <h1
            className="font-display font-semibold text-[#1C1917] leading-tight"
            style={{ fontSize: "clamp(1.75rem, 1.2rem + 1.6vw, 2.25rem)" }}
          >
            Quick Quote
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Estimate a garment price in seconds.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Form */}
        <AtelierCard title="Build Your Estimate" bodyClassName="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="qq-garment">Garment Type</Label>
            <Select value={garment} onValueChange={(v) => setGarment(v as GarmentType)}>
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
            <Select value={fabric} onValueChange={(v) => setFabric(v as FabricType)}>
              <SelectTrigger id="qq-fabric" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FABRICS.map((f) => (
                  <SelectItem key={f.label} value={f.label}>
                    {f.label} · {formatCurrency(f.basePerYard)}/yd
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                        {c} · ×{COMPLEXITY_MULTIPLIER[c].toFixed(1)}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
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
              <Label htmlFor="qq-rush" className="text-[#1C1917]">
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
        </AtelierCard>

        {/* Live summary */}
        <div className="md:sticky md:top-6">
          <AtelierCard title="Live Estimate" bodyClassName="grid gap-3">
            <LineItem
              label={`Fabric · ${fabric} × ${yards || 0} yd`}
              value={calc.fabricCost}
            />
            <LineItem
              label={`Labour · ${garment} × ${complexity}`}
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
                label="Rush Premium (25%)"
                value={calc.rushPremium}
                muted
              />
            )}

            <div
              className={cn(
                "mt-1 p-4 rounded-sm border border-[#800020]/20 bg-[#800020]/5"
              )}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#800020]">
                Total
              </p>
              <p
                className="font-display font-semibold text-[#800020] leading-tight"
                style={{ fontSize: "clamp(1.6rem, 1.1rem + 1.6vw, 2.1rem)" }}
              >
                {formatCurrency(calc.total)}
              </p>
              <p className="text-xs text-stone-500 mt-1.5">
                Suggested 50% deposit:{" "}
                <span className="font-medium text-[#1C1917]">
                  {formatCurrency(calc.suggestedDeposit)}
                </span>
              </p>
            </div>

            <Button
              onClick={handleConvert}
              className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm w-full mt-1"
            >
              Convert to Order
              <ArrowRight className="w-4 h-4" />
            </Button>

            <p className="text-[11px] text-stone-400 text-center">
              Estimate only — final price may vary after consultation.
            </p>
          </AtelierCard>
        </div>
      </div>
    </div>
  );
}

function LineItem({
  label,
  value,
  emphasized,
  muted,
}: {
  label: string;
  value: number;
  emphasized?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={cn(
          "text-sm",
          muted ? "text-stone-400" : "text-stone-500",
          emphasized && "text-[#1C1917] font-medium"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-sm tabular-nums",
          muted ? "text-stone-400" : "text-[#1C1917]",
          emphasized && "font-semibold"
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}
