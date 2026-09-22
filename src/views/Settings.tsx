"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

const CURRENCIES = ["GHS", "NGN", "USD", "GBP", "EUR"] as const;

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

  // Prefill the form once settings load.
  useEffect(() => {
    if (!data) return;
    setStudioNameField(data.studioName ?? "");
    setOwnerGender(data.ownerGender ?? "Madam");
    setCurrency(data.currency ?? "GHS");
    setOverheadAmount(data.overheadAmount ?? 0);
    setSelfPayout(data.selfPayout ?? 0);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiPatch<ShopSettings>("/api/settings", {
        studioName: studioName.trim(),
        ownerGender,
        currency,
        overheadAmount,
        selfPayout,
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
        <div className="mt-6 h-64 rounded-lg bg-stone-100 animate-pulse" />
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

        <div className="flex justify-end">
          <PremiumButton type="submit" loading={saveMutation.isPending}>
            <Save className="w-4 h-4" />
            Save settings
          </PremiumButton>
        </div>
      </form>
    </div>
  );
}
