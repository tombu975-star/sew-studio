"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Save,
  Percent,
  Scissors,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet, apiPatch } from "@/lib/api";
import { useRole } from "@/stores/role";

interface ShopSettings {
  id: string;
  shopId: string;
  ownerGender: string;
  studioName: string;
  overheadAmount: number;
  selfPayout: number;
  currency: string;
  depositPercent: number;
  rushFeePercent: number;
  quoteValidDays: number;
  fullBalanceBeforePickup: boolean;
  fittingsIncluded: number;
  alterationsWindowDays: number;
  depositPolicyText: string;
  alterationsPolicyText: string;
  cancellationPolicyText: string;
}

const CURRENCIES = ["GHS", "NGN", "USD", "GBP", "EUR"] as const;

const DEFAULT_POLICY_COPY = {
  deposit:
    "A {deposit}% deposit confirms your order and covers your fabric and materials. Work begins once it's received — the balance is cleared before the garment is released.",
  alterations:
    "You have {days} days after delivery to bring your garment back for a complimentary fit adjustment. After that, alterations are billed separately.",
  cancellation:
    "Deposits are non-refundable once fabric has been purchased or cutting has begun. Cancellations made before work starts may be eligible for a partial refund.",
};

/** Fills the {token} placeholders in the starter copy with live values, so
 *  the owner sees realistic text the moment they change a number above —
 *  purely a first-fill convenience, never overwrites something they typed. */
function fillTemplate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}

export default function Settings() {
  const queryClient = useQueryClient();
  const setStudioName = useRole((s) => s.setStudioName);
  const setOwnerLabel = useRole((s) => s.setOwnerLabel);

  const { data, isLoading, isError } = useQuery<ShopSettings>({
    queryKey: ["settings"],
    queryFn: () => apiGet<ShopSettings>("/api/settings"),
  });

  const [studioName, setStudioNameField] = useState("");
  const [ownerGender, setOwnerGender] = useState("Madam");
  const [currency, setCurrency] = useState("GHS");
  const [overheadAmount, setOverheadAmount] = useState<number>(0);
  const [selfPayout, setSelfPayout] = useState<number>(0);

  // Business policies
  const [depositPercent, setDepositPercent] = useState<number>(50);
  const [rushFeePercent, setRushFeePercent] = useState<number>(25);
  const [quoteValidDays, setQuoteValidDays] = useState<number>(14);
  const [fullBalanceBeforePickup, setFullBalanceBeforePickup] = useState(true);
  const [fittingsIncluded, setFittingsIncluded] = useState<number>(2);
  const [alterationsWindowDays, setAlterationsWindowDays] = useState<number>(14);
  const [depositPolicyText, setDepositPolicyText] = useState("");
  const [alterationsPolicyText, setAlterationsPolicyText] = useState("");
  const [cancellationPolicyText, setCancellationPolicyText] = useState("");

  // Prefill the form once settings load.
  useEffect(() => {
    if (!data) return;
    setStudioNameField(data.studioName ?? "");
    setOwnerGender(data.ownerGender ?? "Madam");
    setCurrency(data.currency ?? "GHS");
    setOverheadAmount(data.overheadAmount ?? 0);
    setSelfPayout(data.selfPayout ?? 0);

    setDepositPercent(data.depositPercent ?? 50);
    setRushFeePercent(data.rushFeePercent ?? 25);
    setQuoteValidDays(data.quoteValidDays ?? 14);
    setFullBalanceBeforePickup(data.fullBalanceBeforePickup ?? true);
    setFittingsIncluded(data.fittingsIncluded ?? 2);
    setAlterationsWindowDays(data.alterationsWindowDays ?? 14);
    setDepositPolicyText(
      data.depositPolicyText || fillTemplate(DEFAULT_POLICY_COPY.deposit, { deposit: data.depositPercent ?? 50 })
    );
    setAlterationsPolicyText(
      data.alterationsPolicyText ||
        fillTemplate(DEFAULT_POLICY_COPY.alterations, { days: data.alterationsWindowDays ?? 14 })
    );
    setCancellationPolicyText(data.cancellationPolicyText || DEFAULT_POLICY_COPY.cancellation);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiPatch<ShopSettings>("/api/settings", {
        studioName: studioName.trim(),
        ownerGender,
        currency,
        overheadAmount,
        selfPayout,
        depositPercent,
        rushFeePercent,
        quoteValidDays,
        fullBalanceBeforePickup,
        fittingsIncluded,
        alterationsWindowDays,
        depositPolicyText: depositPolicyText.trim(),
        alterationsPolicyText: alterationsPolicyText.trim(),
        cancellationPolicyText: cancellationPolicyText.trim(),
      }),
    onSuccess: (updated) => {
      toast.success("Settings saved");
      queryClient.setQueryData(["settings"], updated);
      // Keep the sidebar / header labels in sync immediately.
      setStudioName(updated.studioName);
      setOwnerLabel(updated.ownerGender === "Male" ? "Master" : "Madam");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-5 md:p-8 max-w-2xl mx-auto w-full">
        <PageHeader eyebrow="Admin" title="Settings" eyebrowIcon={SettingsIcon} />
        <div className="mt-6 space-y-4">
          <div className="h-40 rounded-xl bg-stone-100 animate-pulse" />
          <div className="h-56 rounded-xl bg-stone-100 animate-pulse" />
          <div className="h-72 rounded-xl bg-stone-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-5 md:p-8 max-w-2xl mx-auto w-full">
        <PageHeader eyebrow="Admin" title="Settings" eyebrowIcon={SettingsIcon} />
        <p className="mt-6 text-sm text-red-600">
          Couldn&apos;t load settings. Try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto w-full">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        subtitle="Studio identity and defaults used across the app."
        eyebrowIcon={SettingsIcon}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="mt-6 grid gap-5"
      >
        <SectionCard title="Studio">
          <div className="grid gap-4 p-1">
            <div className="grid gap-1.5">
              <Label htmlFor="studio-name">Studio name</Label>
              <Input
                id="studio-name"
                value={studioName}
                onChange={(e) => setStudioNameField(e.target.value)}
                placeholder="e.g. Adom Couture"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="owner-gender">Owner title</Label>
                <Select value={ownerGender} onValueChange={setOwnerGender}>
                  <SelectTrigger id="owner-gender" className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Female">Madam</SelectItem>
                    <SelectItem value="Male">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency" className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Finances">
          <div className="grid grid-cols-2 gap-3 p-1">
            <div className="grid gap-1.5">
              <Label htmlFor="overhead">Monthly overhead</Label>
              <Input
                id="overhead"
                type="number"
                min={0}
                step="0.01"
                value={overheadAmount}
                onChange={(e) => setOverheadAmount(Number(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="payout">Owner self-payout</Label>
              <Input
                id="payout"
                type="number"
                min={0}
                step="0.01"
                value={selfPayout}
                onChange={(e) => setSelfPayout(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </SectionCard>

        {/* ─── Business Policies ─────────────────────────────────── */}
        <div className="mt-2 mb-1">
          <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 mb-2.5 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            How the studio runs
          </p>
          <h2 className="font-display font-semibold text-[#1C1917] text-2xl leading-tight">
            Business policies
          </h2>
          <p className="text-sm text-stone-500 mt-2 max-w-lg">
            Your rules, written once — clients see them on their portal every time they check an order.
          </p>
        </div>

        <SectionCard
          title="Money"
          action={<Percent className="w-4 h-4 text-stone-400" />}
        >
          <div className="grid gap-5 p-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="deposit-percent">Deposit required (%)</Label>
                <Input
                  id="deposit-percent"
                  type="number"
                  min={0}
                  max={100}
                  value={depositPercent}
                  onChange={(e) => setDepositPercent(Number(e.target.value) || 0)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rush-fee">Rush fee (%)</Label>
                <Input
                  id="rush-fee"
                  type="number"
                  min={0}
                  max={100}
                  value={rushFeePercent}
                  onChange={(e) => setRushFeePercent(Number(e.target.value) || 0)}
                />
              </div>
              <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="quote-valid">Quote valid for (days)</Label>
                <Input
                  id="quote-valid"
                  type="number"
                  min={0}
                  value={quoteValidDays}
                  onChange={(e) => setQuoteValidDays(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="h-px bg-[#E7E5E4]" />

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#1C1917]">Full balance before pickup</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  The garment is only released once it&apos;s fully paid.
                </p>
              </div>
              <Switch checked={fullBalanceBeforePickup} onCheckedChange={setFullBalanceBeforePickup} />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Fittings & alterations"
          action={<Scissors className="w-4 h-4 text-stone-400" />}
        >
          <div className="grid grid-cols-2 gap-3 p-1">
            <div className="grid gap-1.5">
              <Label htmlFor="fittings-included">Fittings included</Label>
              <Input
                id="fittings-included"
                type="number"
                min={0}
                value={fittingsIncluded}
                onChange={(e) => setFittingsIncluded(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-stone-500">Included in the order price — extra fittings are charged.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="alterations-window">Alterations window (days)</Label>
              <Input
                id="alterations-window"
                type="number"
                min={0}
                value={alterationsWindowDays}
                onChange={(e) => setAlterationsWindowDays(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-stone-500">Days after delivery to bring the garment back for adjustments.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="In your words"
          action={<MessagesSquare className="w-4 h-4 text-stone-400" />}
        >
          <div className="grid gap-5 p-1">
            <p className="text-xs text-stone-500 -mt-1">
              These are shown to clients exactly as written, at the bottom of their portal.
            </p>

            <div className="grid gap-1.5">
              <Label htmlFor="deposit-policy-text">Deposit policy</Label>
              <Textarea
                id="deposit-policy-text"
                rows={3}
                value={depositPolicyText}
                onChange={(e) => setDepositPolicyText(e.target.value)}
                placeholder="Explain your deposit terms in plain language."
                className="bg-white"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="alterations-policy-text">Alterations policy</Label>
              <Textarea
                id="alterations-policy-text"
                rows={3}
                value={alterationsPolicyText}
                onChange={(e) => setAlterationsPolicyText(e.target.value)}
                placeholder="Explain your alterations window and any fees."
                className="bg-white"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="cancellation-policy-text">Cancellation policy</Label>
              <Textarea
                id="cancellation-policy-text"
                rows={3}
                value={cancellationPolicyText}
                onChange={(e) => setCancellationPolicyText(e.target.value)}
                placeholder="Explain what happens if a client cancels an order."
                className="bg-white"
              />
            </div>
          </div>
        </SectionCard>

        <div className="flex justify-end sticky bottom-4">
          <PremiumButton type="submit" loading={saveMutation.isPending} size="lg" className="shadow-lg">
            <Save className="w-4 h-4" />
            Save settings
          </PremiumButton>
        </div>
      </form>
    </div>
  );
}
