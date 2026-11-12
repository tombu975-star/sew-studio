"use client";

import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowLeft,
  Check,
  X,
  Loader2,
  Wand2,
  ShoppingBag,
  Star,
  Palette,
  Shirt,
  Scissors,
} from "lucide-react";

import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { EmptyState, SkeletonCard } from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { StatusBadge } from "@/components/atelier/StatusBadge";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { useNav } from "@/stores/nav";
import type {
  Customer,
  Order,
  MeasurementSet,
  CustomerFeedback,
  StyleConcept,
} from "@/lib/types";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

interface DesignRequest {
  garmentType: string;
  occasion: string;
  desiredLook: string;
  season: string;
  budget: string;
  fabricAvailable: string;
  colourPreference: string;
  designerDirection: string;
}

interface ConceptDraft {
  tempId: string;
  conceptName: string;
  silhouette?: string | null;
  neckline?: string | null;
  sleeveStyle?: string | null;
  length?: string | null;
  fabric?: string | null;
  colour?: string | null;
  detailing?: string | null;
  embellishment?: string | null;
  whyThisMayWork?: string | null;
  fitConsiderations?: string | null;
  matchPercent?: number | null;
  designDirection?: string | null;
  imageUrl?: string | null;
}

type DataConfidence = "Limited" | "Good" | "Complete";

interface CustomerDetail {
  customer: Customer;
  orders: Order[];
  measurements: MeasurementSet[];
  feedback: CustomerFeedback[];
  styleConcepts: StyleConcept[];
}

interface ConceptFields {
  id?: string;
  tempId?: string;
  conceptName: string;
  silhouette?: string | null;
  neckline?: string | null;
  sleeveStyle?: string | null;
  length?: string | null;
  fabric?: string | null;
  colour?: string | null;
  detailing?: string | null;
  embellishment?: string | null;
  whyThisMayWork?: string | null;
  fitConsiderations?: string | null;
  matchPercent?: number | null;
  designDirection?: string | null;
  imageUrl?: string | null;
  status?: string;
}

// ============================================================
// Constants
// ============================================================

const EMPTY_REQUEST: DesignRequest = {
  garmentType: "",
  occasion: "",
  desiredLook: "",
  season: "",
  budget: "",
  fabricAvailable: "",
  colourPreference: "",
  designerDirection: "",
};

const SEASONS = [
  "Dry Season",
  "Harmattan",
  "Raining Season",
  "Festive",
  "Year-round",
];

const REJECT_REASONS = [
  "Too bold",
  "Wrong colour",
  "Wrong silhouette",
  "Over budget",
  "Too fitted",
  "Too loose",
  "Fabric unavailable",
  "Other",
];

// ============================================================
// Helpers
// ============================================================

function listToChips(s?: string | null): string[] {
  if (!s) return [];
  return s
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function conceptKey(c: ConceptFields): string {
  return c.id ?? c.tempId ?? "";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

// ============================================================
// Main view
// ============================================================

export default function StyleAssist() {
  const { selectedId, go } = useNav();

  if (!selectedId) {
    return <CustomerPicker onPick={(id) => go("style-assist", { id })} />;
  }

  return <StyleAssistForCustomer customerId={selectedId} />;
}

// ============================================================
// Customer Picker — premium centered
// ============================================================

function CustomerPicker({ onPick }: { onPick: (id: string) => void }) {
  const { data: customers, isLoading, isError } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => apiGet<Customer[]>("/api/customers"),
  });

  return (
    <div className="p-5 md:p-8 max-w-[1300px] mx-auto w-full">
      <PageHeader
        eyebrow="AI Design Studio"
        eyebrowIcon={Sparkles}
        title="Style Assist"
        subtitle="Generate bespoke concepts, visualize them, and convert to orders."
      />

      <div className="flex items-center justify-center min-h-[55vh] animate-fade-in-up">
        <div className="w-full max-w-lg">
          <SectionCard bodyClassName="p-0 overflow-hidden">
            {/* Gradient hero with icon */}
            <div className="relative bg-gradient-to-br from-[#800020] via-[#650019] to-[#4a0010] px-7 py-9 text-center overflow-hidden">
              {/* Decorative grain overlay */}
              <div
                className="absolute inset-0 opacity-[0.12] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.6) 0%, transparent 35%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.4) 0%, transparent 35%)",
                }}
              />
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center mb-4 elevate-md">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h2
                  className="font-display font-semibold text-white leading-tight"
                  style={{ fontSize: "clamp(22px, 3vw, 28px)" }}
                >
                  Choose a client to design for
                </h2>
                <p className="text-sm text-white/75 mt-2 max-w-sm leading-relaxed">
                  Select a customer to begin generating AI-powered style
                  concepts tailored to their preferences, measurements, and
                  history.
                </p>
              </div>
            </div>

            {/* Picker body */}
            <div className="p-7 space-y-3">
              <Label className="text-[11px] uppercase tracking-[0.22em] text-stone-400 font-semibold">
                Select customer
              </Label>
              <Select onValueChange={onPick} disabled={isLoading || isError}>
                <SelectTrigger className="w-full h-11 rounded-md text-sm">
                  <SelectValue
                    placeholder={
                      isError
                        ? "Could not load clients"
                        : isLoading
                        ? "Loading clients…"
                        : "Choose from your clientele…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#800020]/10 text-[#800020] text-[11px] font-semibold inline-flex items-center justify-center">
                          {initials(c.name)}
                        </span>
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isError && (
                <p className="text-xs text-red-600">
                  We couldn&apos;t reach the customer list. Please try again
                  later.
                </p>
              )}
              <div className="flex items-center gap-2 pt-3 text-xs text-stone-400">
                <Sparkles className="w-3 h-3 text-[#800020]/60" />
                <span>
                  The AI uses each client&apos;s profile, measurements, and
                  history as design context.
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Style Assist for a selected customer
// ============================================================

function StyleAssistForCustomer({ customerId }: { customerId: string }) {
  const { go } = useNav();

  const { data, isLoading, isError, refetch } = useQuery<CustomerDetail>({
    queryKey: ["customer", customerId],
    queryFn: () => apiGet<CustomerDetail>(`/api/customers/${customerId}`),
  });

  // local UI state
  const [request, setRequest] = useState<DesignRequest>(EMPTY_REQUEST);
  const [drafts, setDrafts] = useState<ConceptDraft[]>([]);
  const [dataConfidence, setDataConfidence] = useState<DataConfidence | null>(
    null
  );
  const [confidenceNote, setConfidenceNote] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [visualizingKeys, setVisualizingKeys] = useState<Set<string>>(
    new Set()
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const customer = data?.customer;
  const measurements = data?.measurements ?? [];
  const orders = data?.orders ?? [];
  const feedback = data?.feedback ?? [];
  const savedConcepts = (data?.styleConcepts ?? []).filter(
    (c) => c.status !== "Rejected"
  );

  const latestSet = measurements
    .slice()
    .sort(
      (a, b) =>
        new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime()
    )[0];

  // ---------- generate ----------
  const handleGenerate = async () => {
    if (!request.garmentType.trim()) {
      toast.error("Please specify a garment type.");
      return;
    }
    setGenerating(true);
    try {
      const payload = {
        customerId,
        request: {
          ...request,
          budget: request.budget ? Number(request.budget) : undefined,
        },
      };
      const res = await apiPost<{
        dataConfidence: DataConfidence;
        confidenceNote: string;
        concepts: Omit<ConceptDraft, "tempId">[];
      }>("/api/style-assist/generate", payload);

      setDataConfidence(res.dataConfidence);
      setConfidenceNote(res.confidenceNote ?? "");
      const newDrafts: ConceptDraft[] = (res.concepts ?? []).map((c, i) => ({
        ...c,
        tempId: `draft-${Date.now()}-${i}`,
      }));
      setDrafts(newDrafts);
      toast.success(
        `Generated ${newDrafts.length} concept${
          newDrafts.length === 1 ? "" : "s"
        }.`,
        { description: res.confidenceNote || undefined }
      );
    } catch (e) {
      toast.error("Could not generate concepts.", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGenerating(false);
    }
  };

  // ---------- visualize ----------
  const handleVisualize = async (concept: ConceptFields) => {
    const key = conceptKey(concept);
    if (!key) return;
    setVisualizingKeys((prev) => new Set(prev).add(key));
    try {
      const res = await apiPost<{ imageUrl: string }>(
        "/api/style-assist/visualize",
        { concept }
      );
      const imageUrl = res.imageUrl;

      if (concept.id) {
        await apiPatch<StyleConcept>(`/api/style-concepts/${concept.id}`, {
          imageUrl,
        });
        await refetch();
      } else if (concept.tempId) {
        setDrafts((prev) =>
          prev.map((d) =>
            d.tempId === concept.tempId ? { ...d, imageUrl } : d
          )
        );
      }
      toast.success("Concept visualized.");
    } catch (e) {
      toast.error("Could not visualize concept.", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setVisualizingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // ---------- save (approve / reject) ----------
  const buildSavePayload = (
    draft: ConceptDraft,
    status: "Approved" | "Rejected",
    rejectionReason?: string
  ) => ({
    customerId,
    garmentType: request.garmentType,
    occasion: request.occasion || undefined,
    desiredLook: request.desiredLook || undefined,
    season: request.season || undefined,
    budget: request.budget ? Number(request.budget) : undefined,
    colourPreference: request.colourPreference || undefined,
    fabricAvailable: request.fabricAvailable || undefined,
    designerDirection: request.designerDirection || undefined,
    conceptName: draft.conceptName,
    silhouette: draft.silhouette,
    neckline: draft.neckline,
    sleeveStyle: draft.sleeveStyle,
    length: draft.length,
    fabric: draft.fabric,
    colour: draft.colour,
    detailing: draft.detailing,
    embellishment: draft.embellishment,
    whyThisMayWork: draft.whyThisMayWork,
    fitConsiderations: draft.fitConsiderations,
    matchPercent: draft.matchPercent,
    designDirection: draft.designDirection,
    imageUrl: draft.imageUrl,
    status,
    rejectionReason,
    dataConfidence: dataConfidence ?? undefined,
  });

  const handleApprove = async (draft: ConceptDraft) => {
    setSavingKey(draft.tempId);
    try {
      await apiPost<StyleConcept>(
        "/api/style-concepts",
        buildSavePayload(draft, "Approved")
      );
      setDrafts((prev) => prev.filter((d) => d.tempId !== draft.tempId));
      await refetch();
      toast.success("Concept approved and saved.", {
        description: draft.conceptName,
      });
    } catch (e) {
      toast.error("Could not save concept.", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleReject = async (draft: ConceptDraft, reason: string) => {
    setSavingKey(draft.tempId);
    try {
      await apiPost<StyleConcept>(
        "/api/style-concepts",
        buildSavePayload(draft, "Rejected", reason)
      );
      setDrafts((prev) => prev.filter((d) => d.tempId !== draft.tempId));
      await refetch();
      toast.success("Concept dismissed.", {
        description: reason,
      });
    } catch (e) {
      toast.error("Could not save dismissal.", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSavingKey(null);
    }
  };

  // ---------- convert to order ----------
  const handleConvert = (concept: ConceptFields) => {
    const garment = [
      concept.conceptName,
      concept.silhouette,
      concept.fabric,
      concept.colour,
    ]
      .filter(Boolean)
      .join(" — ");
    go("new-order", { params: { customerId, garment } });
    toast.success("Opening new order with concept details…");
  };

  // ---------- render ----------

  if (isLoading) {
    return (
      <div className="p-5 md:p-8 max-w-[1300px] mx-auto w-full">
        <PageHeader
          eyebrow="AI Design Studio"
          eyebrowIcon={Sparkles}
          title="Style Assist"
          subtitle="Loading the client profile…"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SkeletonCard className="h-[520px]" />
          <div className="lg:col-span-2 space-y-5">
            <SkeletonCard className="h-72" />
            <SkeletonCard className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="p-5 md:p-8 max-w-[1300px] mx-auto w-full">
        <PageHeader
          eyebrow="AI Design Studio"
          eyebrowIcon={Sparkles}
          title="Style Assist"
        />
        <SectionCard title="Could not load customer">
          <EmptyState
            icon={Sparkles}
            title="We couldn't load this customer's profile"
            description="Please try again or pick another client."
            action={
              <PremiumButton variant="outline" onClick={() => refetch()}>
                Retry
              </PremiumButton>
            }
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-[1300px] mx-auto w-full">
      {/* Back link */}
      <button
        onClick={() => go("customer", { id: customerId })}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#800020] mb-5 transition group animate-fade-in"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />{" "}
        Back to {customer.name}
      </button>

      <PageHeader
        eyebrow="AI Design Studio"
        eyebrowIcon={Sparkles}
        title="Style Assist"
        subtitle="Generate bespoke concepts, visualize them, and convert to orders."
        actions={
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#800020]/8 text-[#800020] text-xs font-semibold uppercase tracking-[0.18em] border border-[#800020]/15">
            <Sparkles className="w-3 h-3" />
            AI-powered
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 1/3 — Customer style profile */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-5">
            <CustomerStyleProfile
              customer={customer}
              latestSet={latestSet}
              orders={orders}
              feedback={feedback}
              dataConfidence={dataConfidence}
              confidenceNote={confidenceNote}
            />
          </div>
        </div>

        {/* Right 2/3 — Form + concepts */}
        <div className="lg:col-span-2 space-y-5">
          <DesignRequestForm
            value={request}
            onChange={setRequest}
            onGenerate={handleGenerate}
            generating={generating}
          />

          {/* Skeleton loaders while generating */}
          {generating && drafts.length === 0 && (
            <div className="space-y-5">
              {[0, 1, 2].map((i) => (
                <ConceptSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {drafts.length === 0 &&
            savedConcepts.length === 0 &&
            !generating && (
              <SectionCard>
                <EmptyState
                  icon={Sparkles}
                  title="Ready when you are"
                  description={`Fill in the design request and generate style suggestions for ${customer.name}.`}
                />
              </SectionCard>
            )}

          {/* Drafts */}
          {drafts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-3.5 h-3.5 text-[#800020]" />
                <span className="text-xs uppercase tracking-[0.22em] text-stone-500 font-semibold">
                  Fresh Concepts · {drafts.length}
                </span>
                <Separator className="flex-1" />
              </div>
              {drafts.map((draft, idx) => (
                <div
                  key={draft.tempId}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <ConceptCard
                    concept={draft}
                    isDraft
                    onApprove={() => handleApprove(draft)}
                    onReject={(reason) => handleReject(draft, reason)}
                    onVisualize={() => handleVisualize(draft)}
                    onConvert={() => handleConvert(draft)}
                    visualizing={visualizingKeys.has(draft.tempId)}
                    saving={savingKey === draft.tempId}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Saved concepts */}
          {savedConcepts.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 px-1">
                <Star className="w-3.5 h-3.5 text-[#800020]" />
                <span className="text-xs uppercase tracking-[0.22em] text-stone-500 font-semibold">
                  Saved Concepts · {savedConcepts.length}
                </span>
                <Separator className="flex-1" />
              </div>
              {savedConcepts.map((concept, idx) => (
                <div
                  key={concept.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <ConceptCard
                    concept={concept}
                    isDraft={false}
                    onVisualize={() => handleVisualize(concept)}
                    onConvert={() => handleConvert(concept)}
                    visualizing={visualizingKeys.has(concept.id)}
                    saving={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Customer Style Profile (premium left rail)
// ============================================================

function CustomerStyleProfile({
  customer,
  latestSet,
  orders,
  feedback,
  dataConfidence,
  confidenceNote,
}: {
  customer: Customer;
  latestSet?: MeasurementSet;
  orders: Order[];
  feedback: CustomerFeedback[];
  dataConfidence: DataConfidence | null;
  confidenceNote: string;
}) {
  const styleChips = listToChips(customer.preferredStyles);
  const colorChips = listToChips(customer.favouriteColours);
  const avoidChips = listToChips(customer.coloursToAvoid);
  const fabricChips = listToChips(customer.favouriteFabrics);
  const recentOrders = orders.slice(0, 3);
  const recentFeedback = feedback.slice(0, 2);

  const confidenceConfig: Record<
    DataConfidence,
    { color: string; dot: string; ring: string }
  > = {
    Limited: {
      color: "text-amber-700 bg-amber-50 border-amber-200",
      dot: "bg-amber-500",
      ring: "ring-amber-200",
    },
    Good: {
      color: "text-sky-700 bg-sky-50 border-sky-200",
      dot: "bg-sky-500",
      ring: "ring-sky-200",
    },
    Complete: {
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      dot: "bg-emerald-500",
      ring: "ring-emerald-200",
    },
  };

  return (
    <SectionCard bodyClassName="p-0">
      {/* Gradient avatar hero */}
      <div className="relative bg-gradient-to-br from-[#800020] via-[#650019] to-[#4a0010] px-5 py-6 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.1] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.5) 0%, transparent 40%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.3) 0%, transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center text-white font-display text-lg font-semibold">
            {initials(customer.name)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/75 font-semibold">
              Style Profile
            </p>
            <h2
              className="font-display font-semibold text-white leading-tight truncate"
              style={{ fontSize: "clamp(18px, 2vw, 22px)" }}
            >
              {customer.name}
            </h2>
            <p className="text-xs text-white/75 mt-0.5">
              {customer.customerType || "Client"} ·{" "}
              {orders.length} order{orders.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Preferred styles */}
        {styleChips.length > 0 && (
          <div>
            <SectionLabel>Preferred Styles</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {styleChips.map((s) => (
                <span
                  key={s}
                  className="rounded-md bg-[#800020]/8 text-[#800020] px-2 py-1 text-xs font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Definition grid */}
        <div className="grid grid-cols-2 gap-3">
          <DefCell
            label="Favourite Colours"
            value={
              colorChips.length > 0 ? colorChips.join(", ") : "—"
            }
          />
          <DefCell
            label="Colours to Avoid"
            value={
              avoidChips.length > 0 ? avoidChips.join(", ") : "—"
            }
            accent="avoid"
          />
          <DefCell
            label="Favourite Fabrics"
            value={
              fabricChips.length > 0 ? fabricChips.join(", ") : "—"
            }
          />
          <DefCell
            label="Preferred Fit"
            value={customer.preferredFit || "—"}
          />
        </div>

        {/* Design preferences + style notes */}
        {(customer.designPreferences || customer.styleNotes) && (
          <div className="space-y-2.5">
            {customer.designPreferences && (
              <TintedNote
                label="Design Preferences"
                value={customer.designPreferences}
              />
            )}
            {customer.styleNotes && (
              <TintedNote
                label="Style Notes"
                value={customer.styleNotes}
                subtle
              />
            )}
          </div>
        )}

        <Separator />

        {/* Latest measurements */}
        <div>
          <SectionLabel>Latest Measurements</SectionLabel>
          {latestSet ? (
            <div className="grid grid-cols-2 gap-2">
              <MeasureCell
                label="Bust"
                value={latestSet.bust}
                unit={latestSet.unit}
              />
              <MeasureCell
                label="Waist"
                value={latestSet.waist}
                unit={latestSet.unit}
              />
              <MeasureCell
                label="Hip"
                value={latestSet.hip}
                unit={latestSet.unit}
              />
              <MeasureCell
                label="Height"
                value={customer.height ?? null}
                unit="cm"
              />
              <p className="col-span-2 text-[11px] uppercase tracking-[0.18em] text-stone-400 mt-1">
                Taken {shortDate(latestSet.dateTaken)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-stone-400">No measurements on file.</p>
          )}
        </div>

        <Separator />

        {/* Previous orders */}
        <div>
          <SectionLabel>
            Previous Orders · {orders.length}
          </SectionLabel>
          {recentOrders.length > 0 ? (
            <ul className="space-y-2">
              {recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-[#2F151B] truncate text-[13px]">
                    {o.garmentDesign}
                  </span>
                  <StatusBadge status={o.status} className="shrink-0" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-400">No previous orders.</p>
          )}
        </div>

        {/* Recent feedback */}
        {recentFeedback.length > 0 && (
          <>
            <Separator />
            <div>
              <SectionLabel>Recent Feedback</SectionLabel>
              <ul className="space-y-2.5">
                {recentFeedback.map((f) => (
                  <li key={f.id} className="text-sm">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="inline-flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-3 h-3",
                              i < f.rating
                                ? "text-[#800020] fill-[#800020]"
                                : "text-stone-300"
                            )}
                          />
                        ))}
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
                        {f.type}
                      </span>
                    </div>
                    {f.feedback && (
                      <p className="text-stone-600 text-xs leading-relaxed italic">
                        &ldquo;{f.feedback}&rdquo;
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Data confidence (after first generation) */}
        {dataConfidence && (
          <>
            <Separator />
            <div>
              <SectionLabel>Data Confidence</SectionLabel>
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border",
                  confidenceConfig[dataConfidence].color
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full ring-2",
                    confidenceConfig[dataConfidence].dot,
                    confidenceConfig[dataConfidence].ring
                  )}
                />
                {dataConfidence}
              </div>
              {confidenceNote && (
                <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                  {confidenceNote}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400 font-semibold mb-2">
      {children}
    </p>
  );
}

function DefCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "avoid";
}) {
  return (
    <div className="rounded-md bg-[#FCF8F9] border border-[#EEDFE3] p-2.5">
      <p
        className={cn(
          "text-[11px] uppercase tracking-[0.18em] font-semibold mb-1",
          accent === "avoid" ? "text-orange-600" : "text-stone-400"
        )}
      >
        {label}
      </p>
      <p className="text-[13px] text-[#2F151B] leading-snug line-clamp-2">
        {value}
      </p>
    </div>
  );
}

function MeasureCell({
  label,
  value,
  unit,
}: {
  label: string;
  value?: number | null;
  unit: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-2 py-1.5 rounded-md bg-white border border-[#EEDFE3]">
      <span className="text-[11px] uppercase tracking-[0.18em] text-stone-400 font-semibold">
        {label}
      </span>
      <span className="text-sm font-semibold text-[#2F151B] tabular-nums">
        {value != null ? `${value} ${unit}` : "—"}
      </span>
    </div>
  );
}

function TintedNote({
  label,
  value,
  subtle,
}: {
  label: string;
  value: string;
  subtle?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border-l-2 pl-3 py-1.5",
        subtle
          ? "bg-stone-50 border-stone-300"
          : "bg-[#800020]/4 border-[#800020]/30"
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-0.5">
        {label}
      </p>
      <p className="text-xs text-[#2F151B] leading-relaxed">{value}</p>
    </div>
  );
}

// ============================================================
// Design Request Form (premium)
// ============================================================

function DesignRequestForm({
  value,
  onChange,
  onGenerate,
  generating,
}: {
  value: DesignRequest;
  onChange: (v: DesignRequest) => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  const set = <K extends keyof DesignRequest>(
    k: K,
    v: DesignRequest[K]
  ) => onChange({ ...value, [k]: v });

  return (
    <SectionCard
      title="Design Request"
      action={
        <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-stone-400">
          <Scissors className="w-3 h-3 text-[#800020]" />
          Brief
        </span>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          id="sa-garment"
          label="Garment Type"
          required
        >
          <Input
            id="sa-garment"
            className="rounded-md h-10"
            placeholder="Evening Gown, Agbada, Suit…"
            value={value.garmentType}
            onChange={(e) => set("garmentType", e.target.value)}
          />
        </Field>

        <Field id="sa-occasion" label="Occasion">
          <Input
            id="sa-occasion"
            className="rounded-md h-10"
            placeholder="Wedding Guest, Corporate Event…"
            value={value.occasion}
            onChange={(e) => set("occasion", e.target.value)}
          />
        </Field>

        <Field id="sa-look" label="Desired Look">
          <Input
            id="sa-look"
            className="rounded-md h-10"
            placeholder="Elegant, dramatic…"
            value={value.desiredLook}
            onChange={(e) => set("desiredLook", e.target.value)}
          />
        </Field>

        <Field label="Season">
          <Select
            value={value.season}
            onValueChange={(v) => set("season", v)}
          >
            <SelectTrigger className="w-full rounded-md h-10">
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {SEASONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="sa-budget" label="Budget (GHS)">
          <Input
            id="sa-budget"
            type="number"
            min={0}
            className="rounded-md h-10 tabular-nums"
            placeholder="e.g. 2500"
            value={value.budget}
            onChange={(e) => set("budget", e.target.value)}
          />
        </Field>

        <Field id="sa-fabric" label="Fabric Available">
          <Input
            id="sa-fabric"
            className="rounded-md h-10"
            placeholder="Italian lace, silk…"
            value={value.fabricAvailable}
            onChange={(e) => set("fabricAvailable", e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field id="sa-colour" label="Colour Preference">
            <Input
              id="sa-colour"
              className="rounded-md h-10"
              placeholder="Customer's preferred colour or your suggestion"
              value={value.colourPreference}
              onChange={(e) => set("colourPreference", e.target.value)}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field id="sa-direction" label="Designer Direction">
            <Textarea
              id="sa-direction"
              rows={3}
              className="rounded-md resize-none"
              placeholder="e.g. elegant but not too fitted, with African print incorporated"
              value={value.designerDirection}
              onChange={(e) => set("designerDirection", e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-[#EEDFE3]/70">
        <p className="text-xs text-stone-400 leading-relaxed max-w-md">
          The AI will craft three bespoke concepts using{" "}
          <span className="text-[#800020] font-medium">
            this client&apos;s profile
          </span>{" "}
          as design context.
        </p>
        <PremiumButton
          onClick={onGenerate}
          loading={generating}
          disabled={!value.garmentType.trim()}
          size="lg"
        >
          {generating ? (
            <>Designing…</>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Generate Concepts
            </>
          )}
        </PremiumButton>
      </div>
    </SectionCard>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="text-xs uppercase tracking-[0.16em] text-stone-500 font-semibold"
      >
        {label}
        {required && <span className="text-[#800020] ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ============================================================
// Concept Card — premium lookbook style
// ============================================================

function ConceptCard({
  concept,
  isDraft,
  onApprove,
  onReject,
  onVisualize,
  onConvert,
  visualizing,
  saving,
}: {
  concept: ConceptFields;
  isDraft: boolean;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onVisualize: () => void;
  onConvert: () => void;
  visualizing: boolean;
  saving: boolean;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);

  const status = concept.status;
  const showStatusBadge = !isDraft && !!status && status !== "Suggested";

  const specs = [
    {
      label: "Silhouette",
      value: concept.silhouette,
      icon: Shirt,
    },
    { label: "Neckline", value: concept.neckline, icon: null },
    { label: "Sleeve", value: concept.sleeveStyle, icon: null },
    { label: "Length", value: concept.length, icon: null },
    {
      label: "Fabric",
      value: concept.fabric,
      icon: Scissors,
    },
    {
      label: "Colour",
      value: concept.colour,
      icon: Palette,
    },
    { label: "Detailing", value: concept.detailing, icon: null },
    { label: "Embellishment", value: concept.embellishment, icon: null },
  ].filter((s) => s.value);

  const showVisualizeActionForSaved =
    !isDraft && !concept.imageUrl && status === "Approved";

  return (
    <div className="surface-premium rounded-xl border border-[#EEDFE3] elevate-md lift overflow-hidden">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-[#EEDFE3]/70">
        <div className="flex-1 min-w-0">
          <h4
            className="font-display font-semibold text-[#2F151B] leading-snug break-words"
            style={{ fontSize: "clamp(18px, 2vw, 22px)" }}
          >
            {concept.conceptName}
          </h4>
          {showStatusBadge && (
            <div className="mt-2">
              <StatusBadge status={status!} />
            </div>
          )}
        </div>
        {concept.matchPercent != null && (
          <div className="relative shrink-0">
            {/* Burgundy gradient pill */}
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-white px-2.5 py-1.5 rounded-full bg-[#800020]">
              <Sparkles className="w-3 h-3" />
              {concept.matchPercent}% match
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-5 pt-4 space-y-4">
        {/* Image area — premium lookbook frame */}
        <div className="relative">
          <div className="aspect-[4/5] bg-gradient-to-br from-[#FCF8F9] to-[#F7EFF1] rounded-lg overflow-hidden border border-[#EEDFE3] shadow-inner">
            {concept.imageUrl ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-[#800020] animate-spin" />
                  </div>
                )}
                <img
                  src={concept.imageUrl}
                  alt={`Concept visualization for ${concept.conceptName}`}
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-500",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  style={{
                    boxShadow: "inset 0 0 60px rgba(15,23,42,0.08)",
                  }}
                  onLoad={() => setImageLoaded(true)}
                />
              </>
            ) : visualizing ? (
              // Shimmer + spinner overlay
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="absolute inset-0 shimmer opacity-50" />
                <div className="relative w-14 h-14 rounded-full bg-white/80 border border-[#800020]/20 backdrop-blur-sm flex items-center justify-center elevate-sm">
                  <Loader2 className="w-6 h-6 text-[#800020] animate-spin" />
                </div>
                <p className="relative text-[11px] uppercase tracking-[0.22em] text-[#800020] font-semibold">
                  Painting your concept…
                </p>
                <p className="relative text-[11px] text-stone-400 max-w-[200px] text-center">
                  Rendering a bespoke visualization
                </p>
              </div>
            ) : (
              // Empty visualize CTA
              <button
                type="button"
                onClick={onVisualize}
                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 group hover:bg-[#f5f0eb]/60 transition"
                aria-label="Visualize concept"
              >
                <div className="w-14 h-14 rounded-full bg-white border border-[#800020]/30 flex items-center justify-center group-hover:bg-[#800020] group-hover:border-[#800020] transition elevate-sm">
                  <Wand2 className="w-5 h-5 text-[#800020] group-hover:text-white transition" />
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#800020] font-semibold">
                    Visualize Concept
                  </p>
                  <p className="text-[11px] text-stone-400 max-w-[200px] mt-1 leading-relaxed">
                    Generate an AI concept image of this design
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Decorative corner label */}
          {concept.imageUrl && (
            <div className="absolute -top-1 -left-1 px-2 py-0.5 rounded-full bg-white border border-[#EEDFE3] text-[11px] uppercase tracking-[0.22em] text-stone-500 font-semibold elevate-xs">
              AI Visual
            </div>
          )}
        </div>

        {/* Specs grid */}
        {specs.length > 0 && (
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2.5">
            {specs.map((s) => (
              <div key={s.label} className="min-w-0">
                <dt className="flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-stone-400 font-semibold">
                  {s.icon && <s.icon className="w-2.5 h-2.5 text-[#800020]/60" />}
                  {s.label}
                </dt>
                <dd className="text-[13px] text-[#2F151B] mt-0.5 break-words leading-snug">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* Why this may work */}
        {concept.whyThisMayWork && (
          <div className="bg-[#800020]/4 border-l-2 border-[#800020]/30 pl-3 py-2 rounded-r-md">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#800020] font-semibold mb-1">
              Why this may work
            </p>
            <p className="text-[13px] text-[#2F151B] leading-relaxed">
              {concept.whyThisMayWork}
            </p>
          </div>
        )}

        {/* Fit considerations + Design direction */}
        {(concept.fitConsiderations || concept.designDirection) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {concept.fitConsiderations && (
              <div>
                <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-stone-400 font-semibold mb-1">
                  <Scissors className="w-3 h-3 text-[#800020]/60" />
                  Fit Considerations
                </p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {concept.fitConsiderations}
                </p>
              </div>
            )}
            {concept.designDirection && (
              <div>
                <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-stone-400 font-semibold mb-1">
                  <Sparkles className="w-3 h-3 text-[#800020]/60" />
                  Design Direction
                </p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {concept.designDirection}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {rejecting ? (
          <div className="pt-4 border-t border-[#EEDFE3]/70 space-y-2.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold">
              Reason for dismissal
            </p>
            <div className="flex flex-wrap gap-1.5">
              {REJECT_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition",
                    reason === r
                      ? "bg-[#800020] text-white border-[#800020]"
                      : "border-[#EEDFE3] text-stone-500 hover:border-stone-300 bg-white"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <Textarea
              rows={2}
              className="rounded-md resize-none text-sm"
              placeholder="Add details or write your own reason…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2">
              <PremiumButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setRejecting(false);
                  setReason("");
                }}
              >
                Cancel
              </PremiumButton>
              <PremiumButton
                variant="danger"
                size="sm"
                disabled={!reason.trim()}
                onClick={() => {
                  onReject?.(reason.trim());
                  setRejecting(false);
                  setReason("");
                }}
              >
                <X className="w-3.5 h-3.5" /> Confirm Dismiss
              </PremiumButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-[#EEDFE3]/70">
            {isDraft && (
              <>
                <PremiumButton
                  variant="primary"
                  size="sm"
                  onClick={onApprove}
                  loading={saving}
                  className="bg-[#4A6B53] hover:bg-[#128037]"
                >
                  <Check className="w-3.5 h-3.5" /> Approve
                </PremiumButton>
                <PremiumButton
                  variant="outline"
                  size="sm"
                  onClick={() => setRejecting(true)}
                  disabled={saving}
                  className="text-stone-500"
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </PremiumButton>
              </>
            )}

            <PremiumButton
              variant="primary"
              size="sm"
              onClick={onConvert}
              className={cn(isDraft && "ml-auto")}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Convert to Order
            </PremiumButton>

            {showVisualizeActionForSaved && (
              <PremiumButton
                variant="outline"
                size="sm"
                onClick={onVisualize}
                loading={visualizing}
              >
                <Wand2 className="w-3.5 h-3.5" /> Visualize
              </PremiumButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Concept Skeleton (premium shimmer)
// ============================================================

function ConceptSkeleton() {
  return (
    <div className="surface-premium rounded-xl border border-[#EEDFE3] elevate-sm overflow-hidden">
      {/* Header shimmer */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-[#EEDFE3]/70">
        <div className="space-y-2 flex-1">
          <div className="h-5 w-2/3 shimmer rounded-md" />
          <div className="h-3 w-20 shimmer rounded" />
        </div>
        <div className="h-7 w-20 shimmer rounded-full" />
      </div>
      <div className="p-5 space-y-4">
        {/* Image shimmer */}
        <div className="aspect-[4/5] max-w-[280px] mx-auto w-full shimmer rounded-lg" />
        {/* Specs shimmer */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2 w-12 shimmer rounded" />
              <div className="h-3 w-16 shimmer rounded" />
            </div>
          ))}
        </div>
        {/* Why box shimmer */}
        <div className="h-16 shimmer rounded-md" />
        {/* Actions shimmer */}
        <div className="flex gap-2 pt-4 border-t border-[#EEDFE3]/70">
          <div className="h-8 w-20 shimmer rounded-md" />
          <div className="h-8 w-20 shimmer rounded-md" />
          <div className="h-8 w-32 shimmer rounded-md ml-auto" />
        </div>
      </div>
    </div>
  );
}
