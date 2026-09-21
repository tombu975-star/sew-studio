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
} from "lucide-react";

import { AtelierCard } from "@/components/atelier/AtelierCard";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { Button } from "@/components/ui/button";
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

// Shared shape for both drafts and saved concepts.
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
  "Customer dislikes style",
  "Colour not suitable",
  "Fabric unavailable",
  "Too fitted",
  "Too loose",
  "Too revealing",
  "Too traditional",
  "Too modern",
  "Over budget",
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

function ConfidenceDot({ level }: { level: DataConfidence }) {
  const color =
    level === "Complete"
      ? "bg-[#15803D]"
      : level === "Good"
      ? "bg-[#B45309]"
      : "bg-stone-400";
  return <span className={cn("inline-block w-2 h-2 rounded-full", color)} />;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-sm bg-[#FBF9F7] text-[#1C1917] border border-[#E7E5E4]">
      {children}
    </span>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value?: string | null | number;
}) {
  return (
    <div className="flex justify-between gap-3 text-sm py-1.5 border-b border-[#E7E5E4] last:border-0">
      <span className="text-stone-500 shrink-0">{label}</span>
      <span className="font-medium text-[#1C1917] text-right max-w-[65%] break-words">
        {value ?? "—"}
      </span>
    </div>
  );
}

function SpecField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
        {label}
      </dt>
      <dd className="text-sm text-[#1C1917] mt-0.5 break-words">{value}</dd>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 font-semibold mb-1.5">
      {children}
    </p>
  );
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
// Customer picker
// ============================================================

function CustomerPicker({ onPick }: { onPick: (id: string) => void }) {
  const { data: customers, isLoading, isError } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => apiGet<Customer[]>("/api/customers"),
  });

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-5 h-5 text-[#800020]" />
        <h1
          className="font-display font-semibold text-[#1C1917]"
          style={{ fontSize: "clamp(24px, 3.5vw, 30px)" }}
        >
          Style Assist
        </h1>
      </div>

      <div className="flex items-center justify-center min-h-[50vh]">
        <AtelierCard
          className="w-full max-w-md"
          title="Choose a client to design for"
        >
          <div className="space-y-3">
            <p className="text-sm text-stone-500 leading-relaxed">
              Select a customer to begin generating AI-powered style concepts
              tailored to their preferences, measurements, and history.
            </p>
            <Select onValueChange={onPick} disabled={isLoading || isError}>
              <SelectTrigger className="w-full rounded-sm h-10">
                <SelectValue
                  placeholder={
                    isError
                      ? "Could not load clients"
                      : isLoading
                      ? "Loading clients…"
                      : "Select a customer"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
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
          </div>
        </AtelierCard>
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
        }.`
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
        // saved concept → PATCH then refetch
        await apiPatch<StyleConcept>(`/api/style-concepts/${concept.id}`, {
          imageUrl,
        });
        await refetch();
      } else if (concept.tempId) {
        // draft → store image locally
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
      toast.success("Concept approved and saved.");
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
      toast.success("Concept dismissed.");
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
    go("new-order", {
      params: { customerId, garment },
    });
  };

  // ---------- render ----------

  if (isLoading) {
    return (
      <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-5 h-5 text-[#800020]" />
          <h1
            className="font-display font-semibold text-[#1C1917]"
            style={{ fontSize: "clamp(24px, 3.5vw, 30px)" }}
          >
            Style Assist
          </h1>
        </div>
        <p className="text-sm text-stone-400">Loading customer profile…</p>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-5 h-5 text-[#800020]" />
          <h1
            className="font-display font-semibold text-[#1C1917]"
            style={{ fontSize: "clamp(24px, 3.5vw, 30px)" }}
          >
            Style Assist
          </h1>
        </div>
        <AtelierCard title="Could not load customer">
          <p className="text-sm text-stone-500 mb-3">
            We couldn&apos;t load this customer&apos;s profile. Please try
            again.
          </p>
          <Button
            variant="outline"
            className="rounded-sm"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </AtelierCard>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
      {/* Back link */}
      <button
        onClick={() => go("customer", { id: customerId })}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#800020] mb-5 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to {customer.name}
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-[#800020]" />
        <h1
          className="font-display font-semibold text-[#1C1917]"
          style={{ fontSize: "clamp(24px, 3.5vw, 30px)" }}
        >
          Style Assist
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 1/3 — Customer style summary */}
        <div className="lg:col-span-1">
          <CustomerStyleSummary
            customer={customer}
            latestSet={latestSet}
            orders={orders}
            feedback={feedback}
            dataConfidence={dataConfidence}
            confidenceNote={confidenceNote}
          />
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
            <>
              <ConceptSkeleton />
              <ConceptSkeleton />
            </>
          )}

          {/* Empty state */}
          {drafts.length === 0 &&
            savedConcepts.length === 0 &&
            !generating && (
              <div className="text-center py-10 px-4 border border-dashed border-[#E7E5E4] rounded-sm bg-[#FBF9F7]">
                <Sparkles className="w-6 h-6 text-[#800020]/50 mx-auto mb-2" />
                <p className="text-sm text-stone-500">
                  Fill in the design request and generate style suggestions for{" "}
                  <span className="font-medium text-[#1C1917]">
                    {customer.name}
                  </span>
                  .
                </p>
              </div>
            )}

          {/* Drafts */}
          {drafts.map((draft) => (
            <ConceptCard
              key={draft.tempId}
              concept={draft}
              isDraft
              onApprove={() => handleApprove(draft)}
              onReject={(reason) => handleReject(draft, reason)}
              onVisualize={() => handleVisualize(draft)}
              onConvert={() => handleConvert(draft)}
              visualizing={visualizingKeys.has(draft.tempId)}
              saving={savingKey === draft.tempId}
            />
          ))}

          {/* Saved concepts */}
          {savedConcepts.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Separator className="flex-1" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400 font-semibold">
                  Saved Concepts
                </span>
                <Separator className="flex-1" />
              </div>
              {savedConcepts.map((concept) => (
                <ConceptCard
                  key={concept.id}
                  concept={concept}
                  isDraft={false}
                  onVisualize={() => handleVisualize(concept)}
                  onConvert={() => handleConvert(concept)}
                  visualizing={visualizingKeys.has(concept.id)}
                  saving={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Customer Style Summary
// ============================================================

function CustomerStyleSummary({
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
  const recentOrders = orders.slice(0, 5);
  const recentFeedback = feedback.slice(0, 3);

  return (
    <AtelierCard
      title={`${customer.name} — Style Profile`}
      bodyClassName="space-y-4"
    >
      {/* Preferred styles */}
      {styleChips.length > 0 && (
        <div>
          <SectionLabel>Preferred Styles</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {styleChips.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
        </div>
      )}

      {/* Colours */}
      {(colorChips.length > 0 || avoidChips.length > 0) && (
        <div className="space-y-2.5">
          {colorChips.length > 0 && (
            <div>
              <SectionLabel>Favourite Colours</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {colorChips.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
              </div>
            </div>
          )}
          {avoidChips.length > 0 && (
            <div>
              <SectionLabel>Colours to Avoid</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {avoidChips.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-sm bg-orange-50 text-orange-700 border border-orange-200"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile rows */}
      <div>
        {fabricChips.length > 0 && (
          <ProfileRow
            label="Favourite Fabrics"
            value={fabricChips.join(", ")}
          />
        )}
        <ProfileRow label="Preferred Fit" value={customer.preferredFit} />
        <ProfileRow
          label="Design Preferences"
          value={customer.designPreferences}
        />
        <ProfileRow label="Style Notes" value={customer.styleNotes} />
      </div>

      <Separator />

      {/* Latest measurements */}
      <div>
        <SectionLabel>Latest Measurements</SectionLabel>
        {latestSet ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Bust</span>
              <span className="font-medium text-[#1C1917]">
                {latestSet.bust ? `${latestSet.bust} ${latestSet.unit}` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Waist</span>
              <span className="font-medium text-[#1C1917]">
                {latestSet.waist ? `${latestSet.waist} ${latestSet.unit}` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Hip</span>
              <span className="font-medium text-[#1C1917]">
                {latestSet.hip ? `${latestSet.hip} ${latestSet.unit}` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Height</span>
              <span className="font-medium text-[#1C1917]">
                {customer.height ? `${customer.height} cm` : "—"}
              </span>
            </div>
            <p className="col-span-2 text-[10px] uppercase tracking-wide text-stone-400 mt-1">
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
        <SectionLabel>Previous Orders ({orders.length})</SectionLabel>
        {recentOrders.length > 0 ? (
          <ul className="space-y-1.5">
            {recentOrders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-[#1C1917] truncate">{o.garmentDesign}</span>
                <StatusBadge status={o.status} className="shrink-0" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">No previous orders.</p>
        )}
      </div>

      <Separator />

      {/* Recent feedback */}
      <div>
        <SectionLabel>Recent Feedback</SectionLabel>
        {recentFeedback.length > 0 ? (
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
                  <span className="text-[10px] uppercase tracking-wide text-stone-400">
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
        ) : (
          <p className="text-sm text-stone-400">No feedback yet.</p>
        )}
      </div>

      {/* Data confidence (after first generation) */}
      {dataConfidence && (
        <>
          <Separator />
          <div>
            <SectionLabel>Data Confidence</SectionLabel>
            <div className="flex items-center gap-2">
              <ConfidenceDot level={dataConfidence} />
              <span className="text-sm font-semibold text-[#1C1917]">
                {dataConfidence}
              </span>
            </div>
            {confidenceNote && (
              <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                {confidenceNote}
              </p>
            )}
          </div>
        </>
      )}
    </AtelierCard>
  );
}

// ============================================================
// Design Request Form
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
  const set = <K extends keyof DesignRequest>(k: K, v: DesignRequest[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <AtelierCard title="Design Request" bodyClassName="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="sa-garment">
            Garment Type <span className="text-[#800020]">*</span>
          </Label>
          <Input
            id="sa-garment"
            className="rounded-sm"
            placeholder="Evening Gown, Agbada, Suit…"
            value={value.garmentType}
            onChange={(e) => set("garmentType", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sa-occasion">Occasion</Label>
          <Input
            id="sa-occasion"
            className="rounded-sm"
            placeholder="Wedding Guest, Corporate Event…"
            value={value.occasion}
            onChange={(e) => set("occasion", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sa-look">Desired Look</Label>
          <Input
            id="sa-look"
            className="rounded-sm"
            placeholder="Elegant, dramatic…"
            value={value.desiredLook}
            onChange={(e) => set("desiredLook", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Season</Label>
          <Select
            value={value.season}
            onValueChange={(v) => set("season", v)}
          >
            <SelectTrigger className="w-full rounded-sm">
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sa-budget">Budget (GHS)</Label>
          <Input
            id="sa-budget"
            type="number"
            min={0}
            className="rounded-sm"
            placeholder="e.g. 2500"
            value={value.budget}
            onChange={(e) => set("budget", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sa-fabric">Fabric Available</Label>
          <Input
            id="sa-fabric"
            className="rounded-sm"
            placeholder="Italian lace, silk…"
            value={value.fabricAvailable}
            onChange={(e) => set("fabricAvailable", e.target.value)}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sa-colour">Colour Preference</Label>
          <Input
            id="sa-colour"
            className="rounded-sm"
            placeholder="Customer's preferred colour or your suggestion"
            value={value.colourPreference}
            onChange={(e) => set("colourPreference", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sa-direction">Designer Direction</Label>
        <Textarea
          id="sa-direction"
          rows={3}
          className="rounded-sm resize-none"
          placeholder="e.g. elegant but not too fitted, with African print incorporated"
          value={value.designerDirection}
          onChange={(e) => set("designerDirection", e.target.value)}
        />
      </div>

      <Button
        onClick={onGenerate}
        disabled={generating || !value.garmentType.trim()}
        className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-2 w-full sm:w-auto"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Designing…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> Generate Concepts
          </>
        )}
      </Button>
    </AtelierCard>
  );
}

// ============================================================
// Concept Card
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

  const status = concept.status;
  const showStatusBadge = !isDraft && !!status && status !== "Suggested";

  const specs = [
    { label: "Silhouette", value: concept.silhouette },
    { label: "Neckline", value: concept.neckline },
    { label: "Sleeve", value: concept.sleeveStyle },
    { label: "Length", value: concept.length },
    { label: "Fabric", value: concept.fabric },
    { label: "Colour", value: concept.colour },
    { label: "Detailing", value: concept.detailing },
    { label: "Embellishment", value: concept.embellishment },
  ].filter((s) => s.value);

  const showVisualizeActionForSaved =
    !isDraft && !concept.imageUrl && status === "Approved";

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-lg font-semibold text-[#1C1917] leading-snug break-words">
            {concept.conceptName}
          </h4>
          {showStatusBadge && (
            <div className="mt-1.5">
              <StatusBadge status={status!} />
            </div>
          )}
        </div>
        {concept.matchPercent != null && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#800020]/10 text-[#800020] whitespace-nowrap shrink-0">
            <Sparkles className="w-3 h-3" />
            {concept.matchPercent}% match
          </span>
        )}
      </div>

      {/* Image / Visualize area */}
      <div className="mb-4">
        {concept.imageUrl ? (
          <div className="aspect-[3/4] bg-[#FBF9F7] rounded-sm overflow-hidden max-w-[280px] mx-auto border border-[#E7E5E4]">
            <img
              src={concept.imageUrl}
              alt={`Concept visualization for ${concept.conceptName}`}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={onVisualize}
            disabled={visualizing}
            className="aspect-[3/4] max-w-[280px] mx-auto w-full bg-[#FBF9F7] rounded-sm border border-dashed border-[#E7E5E4] flex flex-col items-center justify-center gap-2 hover:bg-[#F5F0EB] hover:border-[#800020]/40 transition group disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Visualize concept"
          >
            {visualizing ? (
              <>
                <Loader2 className="w-6 h-6 text-[#800020] animate-spin" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold">
                  Rendering…
                </span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-white border border-[#800020]/30 flex items-center justify-center group-hover:bg-[#800020] group-hover:border-[#800020] transition">
                  <Wand2 className="w-5 h-5 text-[#800020] group-hover:text-white transition" />
                </div>
                <span className="text-[11px] uppercase tracking-[0.18em] text-[#800020] font-semibold">
                  Visualize Concept
                </span>
                <span className="text-[10px] text-stone-400 max-w-[200px] text-center leading-relaxed">
                  Generate an AI concept image of this design
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Specs grid */}
      {specs.length > 0 && (
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 mb-4 pb-4 border-b border-[#E7E5E4]">
          {specs.map((s) => (
            <SpecField key={s.label} label={s.label} value={s.value} />
          ))}
        </dl>
      )}

      {/* Why this may work */}
      {concept.whyThisMayWork && (
        <div className="bg-[#FBF9F7] border-l-2 border-[#800020]/30 pl-3 py-2 mb-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-1">
            Why this may work
          </p>
          <p className="text-sm text-[#1C1917] leading-relaxed">
            {concept.whyThisMayWork}
          </p>
        </div>
      )}

      {/* Fit considerations */}
      {concept.fitConsiderations && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-1">
            Fit Considerations
          </p>
          <p className="text-sm text-stone-600 leading-relaxed">
            {concept.fitConsiderations}
          </p>
        </div>
      )}

      {/* Design direction */}
      {concept.designDirection && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-1">
            Design Direction
          </p>
          <p className="text-sm text-stone-600 leading-relaxed">
            {concept.designDirection}
          </p>
        </div>
      )}

      {/* Actions */}
      {rejecting ? (
        <div className="mt-4 pt-4 border-t border-[#E7E5E4] space-y-2.5">
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
                  "text-[11px] px-2.5 py-1 rounded-full border transition",
                  reason === r
                    ? "bg-[#800020] text-white border-[#800020]"
                    : "border-[#E7E5E4] text-stone-500 hover:border-stone-300"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea
            rows={2}
            className="rounded-sm resize-none text-sm"
            placeholder="Add details or write your own reason…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-sm"
              onClick={() => {
                setRejecting(false);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-sm bg-stone-800 hover:bg-stone-700 text-white gap-1.5"
              disabled={!reason.trim()}
              onClick={() => {
                onReject?.(reason.trim());
                setRejecting(false);
                setReason("");
              }}
            >
              <X className="w-3.5 h-3.5" /> Confirm Dismiss
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#E7E5E4]">
          {isDraft && (
            <>
              <Button
                size="sm"
                className="rounded-sm bg-[#15803D] hover:bg-[#15803D]/90 text-white gap-1.5"
                onClick={onApprove}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-sm gap-1.5 text-stone-500"
                onClick={() => setRejecting(true)}
                disabled={saving}
              >
                <X className="w-3.5 h-3.5" /> Reject
              </Button>
            </>
          )}

          <Button
            size="sm"
            className={cn(
              "rounded-sm gap-1.5 bg-[#800020] hover:bg-[#6b0018] text-white",
              isDraft && "ml-auto"
            )}
            onClick={onConvert}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Convert to Order
          </Button>

          {showVisualizeActionForSaved && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-sm gap-1.5"
              onClick={onVisualize}
              disabled={visualizing}
            >
              {visualizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              Visualize
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Concept Skeleton (loading state)
// ============================================================

function ConceptSkeleton() {
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm p-5 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-5 bg-stone-100 rounded w-1/2" />
        <div className="h-5 bg-stone-100 rounded-full w-20" />
      </div>
      <div className="aspect-[3/4] max-w-[280px] mx-auto w-full bg-stone-100 rounded-sm mb-4" />
      <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-[#E7E5E4]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-stone-100 rounded" />
        ))}
      </div>
      <div className="h-16 bg-stone-100 rounded mb-4" />
      <div className="flex gap-2 pt-2">
        <div className="h-8 bg-stone-100 rounded w-20" />
        <div className="h-8 bg-stone-100 rounded w-20" />
        <div className="h-8 bg-stone-100 rounded w-32 ml-auto" />
      </div>
    </div>
  );
}
