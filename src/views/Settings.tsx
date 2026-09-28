"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Save,
  Percent,
  Scissors,
  MessagesSquare,
  ShieldCheck,
  Store,
  Coins,
  Gauge,
  Plus,
  X,
  Phone,
  Mail,
  MapPin,
  Hash,
  Receipt,
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
import { formatCurrency, setStudioCurrency } from "@/lib/format";
import type { OverheadItem, Settings as ShopSettings } from "@/lib/types";

// ISO 4217 currency codes. Formatting itself is done by Intl.NumberFormat, so
// symbols/placement are always correct for whichever code is chosen.
const CURRENCIES = [
  { value: "GHS", label: "GHS — Ghanaian Cedi" },
  { value: "NGN", label: "NGN — Nigerian Naira" },
  { value: "KES", label: "KES — Kenyan Shilling" },
  { value: "UGX", label: "UGX — Ugandan Shilling" },
  { value: "TZS", label: "TZS — Tanzanian Shilling" },
  { value: "RWF", label: "RWF — Rwandan Franc" },
  { value: "ZAR", label: "ZAR — South African Rand" },
  { value: "XOF", label: "XOF — West African CFA Franc" },
  { value: "XAF", label: "XAF — Central African CFA Franc" },
  { value: "EGP", label: "EGP — Egyptian Pound" },
  { value: "MAD", label: "MAD — Moroccan Dirham" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "INR", label: "INR — Indian Rupee" },
] as const;

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

function newItemId() {
  return Math.random().toString(36).slice(2, 10);
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
  const [ownerGender, setOwnerGender] = useState("Female");
  const [currency, setCurrency] = useState("GHS");

  // Contact & registration
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");

  // Overhead & costing
  const [overheadItems, setOverheadItems] = useState<OverheadItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [overheadAmount, setOverheadAmount] = useState<number>(0);
  const [overheadRecoveryBasis, setOverheadRecoveryBasis] = useState<number>(0);
  const [selfPayout, setSelfPayout] = useState<number>(0);

  // Capacity & alerts
  const [outstandingBalanceAlertThreshold, setOutstandingBalanceAlertThreshold] =
    useState<number>(2000);
  const [typicalActiveOrdersPerStaff, setTypicalActiveOrdersPerStaff] = useState<number>(4);

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
    setOwnerGender(data.ownerGender ?? "Female");
    setCurrency(data.currency ?? "GHS");
    setOverheadAmount(data.overheadAmount ?? 0);
    setOverheadRecoveryBasis(data.overheadRecoveryBasis ?? 0);
    setSelfPayout(data.selfPayout ?? 0);

    setContactPhone(data.contactPhone ?? "");
    setContactEmail(data.contactEmail ?? "");
    setAddress(data.address ?? "");
    setTaxId(data.taxId ?? "");
    setInvoicePrefix(data.invoicePrefix || "INV");

    setOverheadItems(
      (data.overheadItems ?? []).map((it) => ({ ...it, id: it.id || newItemId() }))
    );
    setOutstandingBalanceAlertThreshold(data.outstandingBalanceAlertThreshold ?? 2000);
    setTypicalActiveOrdersPerStaff(data.typicalActiveOrdersPerStaff ?? 4);

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

  const overheadItemsTotal = useMemo(
    () => overheadItems.reduce((s, it) => s + (Number(it.amount) || 0), 0),
    [overheadItems]
  );
  const effectiveOverheadPerOrder = overheadItemsTotal > 0 ? overheadItemsTotal : overheadAmount;
  // Standard overhead recovery rate = total overhead ÷ direct-cost base (excl. labour).
  const recoveryRate =
    overheadRecoveryBasis > 0 ? (effectiveOverheadPerOrder / overheadRecoveryBasis) * 100 : 0;

  function addOverheadItem() {
    const name = newItemName.trim();
    const amount = Number(newItemAmount) || 0;
    if (!name) return;
    setOverheadItems((prev) => [...prev, { id: newItemId(), name, amount }]);
    setNewItemName("");
    setNewItemAmount("");
  }

  function removeOverheadItem(id: string) {
    setOverheadItems((prev) => prev.filter((it) => it.id !== id));
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      apiPatch<ShopSettings>("/api/settings", {
        studioName: studioName.trim(),
        ownerGender,
        currency,
        overheadAmount,
        overheadRecoveryBasis,
        selfPayout,
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        address: address.trim(),
        taxId: taxId.trim(),
        invoicePrefix: invoicePrefix.trim() || "INV",
        overheadItems: overheadItems.map(({ id, name, amount }) => ({ id, name, amount })),
        outstandingBalanceAlertThreshold,
        typicalActiveOrdersPerStaff,
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
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      // Keep the sidebar / header labels in sync immediately.
      setStudioCurrency(updated.currency);
      setStudioName(updated.studioName);
      setOwnerLabel(updated.ownerGender === "Male" ? "Master" : "Madam");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-5 md:p-8 max-w-2xl mx-auto w-full">
        <PageHeader eyebrow="Admin" title="Studio Settings" eyebrowIcon={SettingsIcon} />
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
        <PageHeader eyebrow="Admin" title="Studio Settings" eyebrowIcon={SettingsIcon} />
        <p className="mt-6 text-sm text-red-600">
          Couldn&apos;t load settings. Try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto w-full pb-28">
      <PageHeader
        eyebrow="Admin"
        title="Studio Settings"
        subtitle="Studio identity, cost, and alert settings applied across the atelier."
        eyebrowIcon={SettingsIcon}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="mt-6 grid gap-5"
      >
        <SectionCard title="Studio identity" action={<Store className="w-4 h-4 text-stone-400" />}>
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
                <Label htmlFor="owner-gender">Your gender</Label>
                <Select value={ownerGender} onValueChange={setOwnerGender}>
                  <SelectTrigger id="owner-gender" className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
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
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-stone-500 -mt-1">
              The owner role is automatically shown as &ldquo;Madam&rdquo; or &ldquo;Master&rdquo; across the app based on this.
            </p>

            <div className="h-px bg-[#E7E5E4]" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="contact-phone" className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" /> Studio phone
                </Label>
                <Input
                  id="contact-phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="contact-email" className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400" /> Studio email
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="hello@yourstudio.com"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="address" className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400" /> Studio address
              </Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop number, street, city"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="tax-id" className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-stone-400" /> Tax / business reg. no.
                </Label>
                <Input
                  id="tax-id"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="invoice-prefix" className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-stone-400" /> Invoice prefix
                </Label>
                <Input
                  id="invoice-prefix"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                  placeholder="INV"
                  maxLength={8}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ─── Cost & Alerts ─────────────────────────────────── */}
        <div className="mt-2 mb-1">
          <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 mb-2.5 flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5" />
            Cost &amp; alert settings
          </p>
          <h2 className="font-display font-semibold text-[#1C1917] text-2xl leading-tight">
            Overhead &amp; capacity
          </h2>
          <p className="text-sm text-stone-500 mt-2 max-w-lg">
            Applied across the studio — these feed every order&apos;s True Cost and the dashboard&apos;s workload alerts.
          </p>
        </div>

        <SectionCard title="Overhead breakdown" action={<Coins className="w-4 h-4 text-stone-400" />}>
          <div className="grid gap-4 p-1">
            <p className="text-xs text-stone-500 -mt-1">
              List your monthly studio overhead items — rent, electricity, data, transport, maintenance…
              While at least one item is listed, their total replaces the flat amount below and is added
              to every order&apos;s True Cost.
            </p>

            {overheadItems.length > 0 && (
              <div className="rounded-lg border border-[#E7E5E4] divide-y divide-[#E7E5E4] overflow-hidden bg-white">
                {overheadItems.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="text-sm text-[#1C1917] flex-1 truncate">{it.name}</span>
                    <span className="text-sm font-medium tabular-nums text-stone-600">
                      {formatCurrency(it.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeOverheadItem(it.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
                      aria-label={`Remove ${it.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-3 px-3.5 py-2.5 bg-[#FBF9F7]">
                  <span className="text-xs font-semibold uppercase tracking-wide text-stone-500 flex-1">
                    Monthly total
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-[#800020]">
                    {formatCurrency(overheadItemsTotal)}
                  </span>
                  <span className="w-6 h-6 shrink-0" />
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Electricity"
                className="bg-white flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOverheadItem();
                  }
                }}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(e.target.value)}
                placeholder="Monthly amount"
                className="bg-white sm:w-40"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOverheadItem();
                  }
                }}
              />
              <PremiumButton type="button" onClick={addOverheadItem} className="shrink-0">
                <Plus className="w-4 h-4" />
                Add
              </PremiumButton>
            </div>

            <div className="h-px bg-[#E7E5E4]" />

            <div className="rounded-lg border border-[#E7E5E4] bg-[#FBF9F7] p-4 grid gap-3">
              <div>
                <p className="text-sm font-semibold text-[#1C1917]">Overhead recovery rate</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  The standard way to make every order carry its fair share of overhead: divide your
                  monthly overhead by your average monthly direct costs (fabric &amp; materials —
                  <strong> excluding labour</strong>). Each order then adds that percentage of its own
                  fabric cost as an overhead margin, so bigger jobs carry more and small jobs less.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="recovery-basis">Average monthly direct costs, excluding labour ({currency})</Label>
                <Input
                  id="recovery-basis"
                  type="number"
                  min={0}
                  step="0.01"
                  value={overheadRecoveryBasis}
                  onChange={(e) => setOverheadRecoveryBasis(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md bg-white border border-[#E7E5E4] px-3 py-2.5">
                <span className="text-xs font-medium text-stone-500">
                  {formatCurrency(effectiveOverheadPerOrder, currency)} overhead ÷{" "}
                  {overheadRecoveryBasis > 0 ? formatCurrency(overheadRecoveryBasis, currency) : "direct costs"}
                </span>
                <span className="text-sm font-semibold text-[#800020] tabular-nums">
                  {overheadRecoveryBasis > 0 ? `${recoveryRate.toFixed(1)}%` : "Not set"}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                {overheadRecoveryBasis > 0
                  ? "Applied to every order: overhead margin = fabric cost × this rate."
                  : "Until this is set, the flat overhead amount below is added to each order instead."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="overhead">Overhead per order</Label>
                <Input
                  id="overhead"
                  type="number"
                  min={0}
                  step="0.01"
                  value={overheadAmount}
                  onChange={(e) => setOverheadAmount(Number(e.target.value) || 0)}
                  disabled={overheadItemsTotal > 0}
                  className={overheadItemsTotal > 0 ? "opacity-50" : undefined}
                />
                <p className="text-xs text-stone-500">
                  A flat fallback amount per order — used only while the recovery rate above isn&apos;t set
                  and no items are listed in the Overhead Breakdown.
                </p>
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
                <p className="text-xs text-stone-500">Your own monthly draw from the studio.</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg bg-[#FBF9F7] border border-[#E7E5E4] px-4 py-3">
              <span className="text-xs font-medium text-stone-500">
                Total monthly overhead right now
              </span>
              <span className="text-sm font-semibold text-[#800020] tabular-nums">
                {formatCurrency(effectiveOverheadPerOrder)}
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Alerts &amp; capacity" action={<Gauge className="w-4 h-4 text-stone-400" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
            <div className="grid gap-1.5">
              <Label htmlFor="outstanding-threshold">Outstanding balance alert threshold</Label>
              <Input
                id="outstanding-threshold"
                type="number"
                min={0}
                step="0.01"
                value={outstandingBalanceAlertThreshold}
                onChange={(e) => setOutstandingBalanceAlertThreshold(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-stone-500">
                You&apos;ll be alerted on the Dashboard when total outstanding across orders exceeds this.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="staff-capacity">Typical active work per staff member</Label>
              <Input
                id="staff-capacity"
                type="number"
                min={1}
                value={typicalActiveOrdersPerStaff}
                onChange={(e) => setTypicalActiveOrdersPerStaff(Number(e.target.value) || 1)}
              />
              <p className="text-xs text-stone-500">
                Active orders a staff member typically handles at once — used to flag workload on the
                Dashboard when someone is over capacity.
              </p>
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
