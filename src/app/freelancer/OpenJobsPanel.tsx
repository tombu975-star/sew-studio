"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SectionCard } from "@/components/atelier/_portal";
import { apiGet, apiPost, apiDelete, apiErrorMessage } from "@/lib/api";

interface OpenJob {
  id: string;
  taskDescription: string;
  budget: number | null;
  dueDate: string | null;
  createdAt: string;
  shop: { name: string };
  myApplication: { status: string; message?: string | null; proposedCost?: number | null } | null;
}

const input = "w-full h-10 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20";

/** Freelancer-side: jobs shops have posted that nobody is assigned to yet. */
export function OpenJobsPanel() {
  const [jobs, setJobs] = useState<OpenJob[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    apiGet<OpenJob[]>("/api/freelancer/open-jobs")
      .then(setJobs)
      .catch((e) => setError(apiErrorMessage(e, "Could not load open jobs.")));
  useEffect(() => { load(); }, []);

  async function apply(id: string) {
    setBusy(id);
    setError("");
    try {
      await apiPost(`/api/freelancer/open-jobs/${id}/apply`, { message, proposedCost: cost });
      setOpenId(null); setMessage(""); setCost("");
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, "Could not send your application."));
    } finally {
      setBusy(null);
    }
  }
  async function withdraw(id: string) {
    setBusy(id);
    try { await apiDelete(`/api/freelancer/open-jobs/${id}/apply`); await load(); }
    catch (e) { setError(apiErrorMessage(e, "Could not withdraw.")); }
    finally { setBusy(null); }
  }

  if (!jobs) {
    return <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" /></div>;
  }
  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {jobs.length === 0 && (
        <SectionCard>
          <p className="text-center text-sm text-stone-500 py-8">No open jobs right now. Check back soon.</p>
        </SectionCard>
      )}
      {jobs.map((j) => (
        <SectionCard key={j.id}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-600">{j.shop.name}</p>
          <p className="text-sm text-stone-800 mt-1">{j.taskDescription}</p>
          <p className="text-xs text-stone-500 mt-1">
            {j.budget !== null ? `Budget ${j.budget.toLocaleString()}` : "Budget open"}
            {j.dueDate ? ` · due ${new Date(j.dueDate).toLocaleDateString()}` : ""}
          </p>

          {j.myApplication ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-stone-600">Your application: {j.myApplication.status}</span>
              {j.myApplication.status === "Pending" && (
                <button className="text-xs text-stone-500 hover:text-red-600" disabled={busy === j.id} onClick={() => withdraw(j.id)}>
                  Withdraw
                </button>
              )}
            </div>
          ) : openId === j.id ? (
            <div className="mt-3 space-y-2">
              <textarea rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Why you're a good fit (optional)" className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-sm" />
              <input className={input} type="number" min="0" placeholder="Your price (optional)" value={cost} onChange={(e) => setCost(e.target.value)} />
              <div className="flex gap-2">
                <button className="h-9 px-4 rounded-md text-xs font-medium bg-[#2563EB] text-white disabled:opacity-50" disabled={busy === j.id} onClick={() => apply(j.id)}>
                  {busy === j.id ? "Sending…" : "Send application"}
                </button>
                <button className="h-9 px-3 text-xs text-stone-500" onClick={() => setOpenId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="mt-3 h-9 px-4 rounded-md text-xs font-medium border border-[#2563EB] text-[#2563EB]" onClick={() => { setOpenId(j.id); setMessage(""); setCost(""); }}>
              Apply
            </button>
          )}
        </SectionCard>
      ))}
    </div>
  );
}
