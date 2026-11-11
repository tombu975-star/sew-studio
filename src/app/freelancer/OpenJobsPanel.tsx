"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, CalendarDays, Search } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/atelier/_portal";
import { EmptyState } from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { apiDelete, apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";

interface OpenJob {
  id: string;
  taskDescription: string;
  budget: number | null;
  dueDate: string | null;
  createdAt: string;
  shop: { name: string };
  postStatus?: string;
  fromTask?: boolean;
  myApplication: { status: string; message?: string | null; proposedCost?: number | null } | null;
}

const input = "h-10 w-full rounded-md border border-[#E6D4D8] bg-white px-3 text-sm outline-none focus:border-[#832138] focus:ring-2 focus:ring-[#832138]/15";

/** Freelancer-side: jobs shops have posted that nobody is assigned to yet. */
export function OpenJobsPanel({ canApply = true }: { canApply?: boolean }) {
  const [jobs, setJobs] = useState<OpenJob[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<"browse" | "applied">("browse");

  const load = useCallback(
    () =>
      apiGet<OpenJob[]>(`/api/freelancer/open-jobs${view === "applied" ? "?scope=applied" : ""}`)
        .then((j) => { setJobs(j); setError(""); })
        .catch((e) => { setError(apiErrorMessage(e, "Could not load open jobs.")); setJobs((j) => j ?? []); }),
    [view]
  );
  useEffect(() => { setJobs(null); load(); }, [load]);

  async function apply(id: string) {
    setBusy(id);
    try {
      await apiPost(`/api/freelancer/open-jobs/${id}/apply`, { message, proposedCost: cost });
      toast.success("Application sent. The studio will be in touch.");
      setOpenId(null); setMessage(""); setCost("");
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not send your application."));
    } finally {
      setBusy(null);
    }
  }
  async function withdraw(id: string) {
    setBusy(id);
    try { await apiDelete(`/api/freelancer/open-jobs/${id}/apply`); toast.success("Application withdrawn."); await load(); }
    catch (e) { toast.error(apiErrorMessage(e, "Could not withdraw.")); }
    finally { setBusy(null); }
  }

  const tabs = (
    <div className="mb-1 flex gap-2" role="tablist" aria-label="Open jobs view">
      {([["browse", "Browse jobs"], ["applied", "My requests"]] as const).map(([k, label]) => (
        <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
          className={`h-8 rounded-full border px-3.5 text-xs font-medium transition-colors ${
            view === k ? "border-[#6C1C2F] bg-[#6C1C2F] text-white" : "border-[#E6D4D8] bg-white text-stone-600 hover:border-[#6C1C2F]"}`}>
          {label}
        </button>
      ))}
    </div>
  );
  if (!jobs) {
    return (
      <div className="space-y-3" aria-busy="true">
        {tabs}
        {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-lg border border-[#EEDFE3] bg-white" />)}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {tabs}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {jobs.length === 0 && !error && (
        <SectionCard>
          {view === "browse" ? (
            <EmptyState icon={Search} title="No open jobs right now" description="When studios post work you can apply for, it will show up here. You don't need to be on a studio's roster to apply." />
          ) : (
            <EmptyState icon={Search} title="No requests yet" description="Jobs you apply for appear here, with the studio's decision." />
          )}
        </SectionCard>
      )}
      {jobs.map((j) => (
        <SectionCard key={j.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-600">{j.shop.name}{j.fromTask ? " · Studio task" : ""}</p>
              <p className="mt-0.5 text-sm text-stone-800">{j.taskDescription}</p>
            </div>
            {j.myApplication && <StatusBadge status={j.myApplication.status} className="shrink-0" />}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Banknote className="size-3.5" /> {j.budget !== null ? `Budget ${formatCurrency(j.budget, "GHS")}` : "Budget open"}
            </span>
            {j.dueDate && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> Due {formatDate(j.dueDate)}</span>}
          </div>

          {j.myApplication ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-stone-500">
                {j.myApplication.proposedCost != null ? `Your price: ${formatCurrency(j.myApplication.proposedCost, "GHS")}` : "You applied for this job."}
              </p>
              {j.myApplication.status === "Pending" && j.postStatus !== "Closed" && j.postStatus !== "Filled" && (
                <PremiumButton variant="ghost" size="sm" loading={busy === j.id} onClick={() => withdraw(j.id)}>Withdraw</PremiumButton>
              )}
            </div>
          ) : openId === j.id ? (
            <div className="mt-3 space-y-2.5">
              <textarea rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Why you're a good fit (optional)"
                className="w-full rounded-md border border-[#E6D4D8] bg-white px-3 py-2 text-sm outline-none focus:border-[#832138] focus:ring-2 focus:ring-[#832138]/15" />
              <input className={input} type="number" min="0" inputMode="decimal" placeholder="Your price in GHS (optional)" value={cost} onChange={(e) => setCost(e.target.value)} />
              <div className="flex gap-2">
                <PremiumButton size="sm" loading={busy === j.id} onClick={() => apply(j.id)}>Send application</PremiumButton>
                <PremiumButton size="sm" variant="ghost" onClick={() => setOpenId(null)}>Cancel</PremiumButton>
              </div>
            </div>
          ) : (
            canApply ? (
              <PremiumButton className="mt-3" size="sm" variant="outline" onClick={() => { setOpenId(j.id); setMessage(""); setCost(""); }}>
                Apply
              </PremiumButton>
            ) : (
              <p className="mt-3 text-xs text-stone-500">Verify your email to apply for this job.</p>
            )
          )}
        </SectionCard>
      ))}
    </div>
  );
}
