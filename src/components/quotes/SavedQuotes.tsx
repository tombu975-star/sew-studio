"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MessageCircle, ShoppingBag, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/atelier/SectionCard";
import { ConfirmDeleteDialog } from "@/components/atelier/ConfirmDeleteDialog";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { apiDelete, apiErrorMessage, apiGet, apiPatch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useNav } from "@/stores/nav";
import { cn } from "@/lib/utils";

export interface SavedQuote {
  id: string;
  customerId: string | null;
  customerName: string | null;
  garment: string;
  total: number;
  deposit: number;
  status: "Draft" | "Sent" | "Accepted" | "Declined";
  validUntil: string | null;
  createdAt: string;
}

const STATUSES: SavedQuote["status"][] = ["Draft", "Sent", "Accepted", "Declined"];
const TONE: Record<SavedQuote["status"], string> = {
  Draft: "bg-stone-100 text-stone-700 border-stone-200",
  Sent: "bg-sky-50 text-sky-800 border-sky-200",
  Accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Declined: "bg-rose-50 text-rose-800 border-rose-200",
};

const fmtDate = (d: string) =>
  new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** Saved quotes: track each one from draft to accepted, share it, or turn it into an order. */
export function SavedQuotes({ shopName }: { shopName?: string }) {
  const go = useNav((s) => s.go);
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<SavedQuote | null>(null);

  const { data = [], isLoading, isError } = useQuery<SavedQuote[]>({
    queryKey: ["quotes"],
    queryFn: () => apiGet<SavedQuote[]>("/api/quotes"),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SavedQuote["status"] }) => apiPatch(`/api/quotes/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); toast.success("Quote status updated"); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/quotes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); toast.success("Quote deleted"); setToDelete(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const share = (q: SavedQuote) => {
    const msg =
      `Hello${q.customerName ? ` ${q.customerName}` : ""}, here is your quote${shopName ? ` from ${shopName}` : ""}:\n` +
      `${q.garment}\nTotal: ${formatCurrency(q.total)}\nDeposit to start: ${formatCurrency(q.deposit)}` +
      (q.validUntil ? `\nValid until ${fmtDate(q.validUntil)}` : "");
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    if (q.status === "Draft") setStatus.mutate({ id: q.id, status: "Sent" });
  };

  return (
    <SectionCard title="Saved quotes" description="Follow each quote from draft to accepted.">
      {isLoading ? (
        <p role="status" className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="size-4 animate-spin" /> Loading quotes…
        </p>
      ) : isError ? (
        <p role="alert" className="text-sm text-rose-700">Saved quotes could not be loaded. Refresh to try again.</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-stone-500">No saved quotes yet. Price a garment above, then choose Save quote.</p>
      ) : (
        <ul className="divide-y divide-[#EEDFE3]">
          {data.map((q) => (
            <li key={q.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-[#2F151B]">{q.garment}</p>
                <p className="text-xs text-stone-500">
                  {q.customerName || "No customer named"} · {fmtDate(q.createdAt)}
                  {q.validUntil ? ` · valid until ${fmtDate(q.validUntil)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 font-display text-lg font-semibold tabular-nums text-[#800020]">{formatCurrency(q.total)}</span>
                <label className="sr-only" htmlFor={`qs-${q.id}`}>Status of {q.garment}</label>
                <select
                  id={`qs-${q.id}`}
                  value={q.status}
                  onChange={(e) => setStatus.mutate({ id: q.id, status: e.target.value as SavedQuote["status"] })}
                  className={cn("h-9 rounded-full border px-3 text-xs font-medium", TONE[q.status])}
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <button type="button" onClick={() => share(q)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EEDFE3] bg-white px-3 text-xs font-medium text-[#2F151B] hover:bg-[#FCF8F9]">
                  <MessageCircle className="size-3.5" /> Share
                </button>
                <PremiumButton
                  size="sm"
                  onClick={() => go("new-order", { params: { garment: q.garment, ...(q.customerId ? { customerId: q.customerId } : {}) } })}
                  disabled={q.status === "Declined"}
                >
                  <ShoppingBag className="size-3.5" /> Convert to order
                </PremiumButton>
                <button type="button" onClick={() => setToDelete(q)} aria-label={`Delete quote for ${q.garment}`} className="grid size-9 place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-700">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete this quote?"
        description={toDelete ? `The ${toDelete.garment} quote for ${formatCurrency(toDelete.total)} will be removed.` : ""}
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </SectionCard>
  );
}
