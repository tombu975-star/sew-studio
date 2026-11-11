"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SectionCard } from "@/components/atelier/SectionCard";
import { VerifiedBadge } from "@/components/atelier/VerifiedBadge";
import { apiGet, apiPost, apiPatch, apiErrorMessage } from "@/lib/api";

interface DirectoryEntry {
  id: string;
  name: string;
  specialty?: string | null;
  skills?: string | null;
  verified?: boolean;
  linked: boolean;
}
interface Application {
  id: string;
  freelancerId: string;
  name: string;
  specialty?: string | null;
  skills?: string | null;
  verified?: boolean;
  message?: string | null;
  proposedCost?: number | null;
  status: string;
}
interface Post {
  id: string;
  taskDescription: string;
  budget: number | null;
  dueDate: string | null;
  status: string;
  fromTask?: boolean;
  applications: Application[];
}

const input =
  "w-full h-10 px-3 rounded-md border border-[#E6DFEE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6A1FA0]/20";
const btn = "h-9 px-3 rounded-md text-xs font-medium border transition-colors disabled:opacity-50";

/** Shop-side: browse registered freelancers and post open jobs they can apply to. */
export function FreelancerMarketplace() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [task, setTask] = useState("");
  const [budget, setBudget] = useState("");
  const [due, setDue] = useState("");

  const directoryQ = useQuery<DirectoryEntry[]>({
    queryKey: ["freelancer-directory", q],
    queryFn: () => apiGet<DirectoryEntry[]>(`/api/freelancers/directory?q=${encodeURIComponent(q)}`),
  });
  const postsQ = useQuery<Post[]>({
    queryKey: ["freelance-job-posts"],
    queryFn: () => apiGet<Post[]>("/api/freelance-job-posts"),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["freelancers"] });
    qc.invalidateQueries({ queryKey: ["freelancer-directory"] });
    qc.invalidateQueries({ queryKey: ["freelance-job-posts"] });
    qc.invalidateQueries({ queryKey: ["freelance-jobs"] });
  };

  const link = useMutation({
    mutationFn: (freelancerId: string) => apiPost("/api/freelancers/directory", { freelancerId }),
    onSuccess: () => { toast.success("Added to your roster."); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const publish = useMutation({
    mutationFn: () => apiPost("/api/freelance-job-posts", { taskDescription: task, budget, dueDate: due || null }),
    onSuccess: () => { toast.success("Job posted for freelancers."); setTask(""); setBudget(""); setDue(""); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const act = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, string> }) =>
      apiPatch(`/api/freelance-job-posts/${id}`, body),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const loadError = directoryQ.error || postsQ.error;
  const directory = directoryQ.data ?? [];
  const posts = postsQ.data ?? [];

  return (
    <div className="space-y-5">
      {loadError && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {apiErrorMessage(loadError, "Could not load the freelancer directory and job posts.")}
        </div>
      )}
      <SectionCard title={`Post an open job`}>
        <div className="p-4 space-y-3">
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="What needs doing? e.g. Hand-bead the neckline of a kente gown"
            className="w-full px-3 py-2 rounded-md border border-[#E6DFEE] text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input className={input} type="number" min="0" placeholder="Budget (optional)" value={budget} onChange={(e) => setBudget(e.target.value)} />
            <input className={input} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <button
            className={`${btn} bg-[#6A1FA0] text-white border-[#6A1FA0]`}
            disabled={!task.trim() || publish.isPending}
            onClick={() => publish.mutate()}
          >
            {publish.isPending ? "Posting…" : "Post job"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title={`Open jobs & applications · ${posts.length}`} bodyClassName="p-0">
        <p className="border-b border-[#E6DFEE] px-4 py-2.5 text-xs text-stone-500">Tasks you create without assigning anyone are listed here automatically so freelancers can request them.</p>
        {posts.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">No posts yet. Freelancers see open jobs and can apply.</p>
        ) : (
          <ul className="divide-y divide-[#E6DFEE]">
            {posts.map((p) => (
              <li key={p.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800">{p.taskDescription}</p>
                    <p className="text-xs text-stone-500">
                      {p.fromTask ? "Unassigned task · " : ""}{p.status}
                      {p.budget !== null ? ` · budget ${p.budget.toLocaleString()}` : ""}
                      {p.dueDate ? ` · due ${new Date(p.dueDate).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  {p.status === "Open" && (
                    <button className={`${btn} border-[#E6DFEE] text-stone-600`} onClick={() => act.mutate({ id: p.id, body: { action: "close" } })}>
                      Close
                    </button>
                  )}
                </div>
                {p.applications.length === 0 ? (
                  <p className="text-xs text-stone-400">No applicants yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {p.applications.map((a) => (
                      <li key={a.id} className="rounded-md bg-[#FAF8FC] border border-[#E6DFEE] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">{a.name}{a.specialty ? ` · ${a.specialty}` : ""}{a.verified && <VerifiedBadge />}</p>
                            {a.skills && <p className="text-xs text-stone-500">{a.skills}</p>}
                            {a.message && <p className="text-xs text-stone-600 mt-1">“{a.message}”</p>}
                            {a.proposedCost != null && <p className="text-xs text-stone-500 mt-1">Quote: {a.proposedCost.toLocaleString()}</p>}
                          </div>
                          {a.status === "Pending" && p.status === "Open" ? (
                            <div className="flex gap-2 shrink-0">
                              <button className={`${btn} bg-[#6A1FA0] text-white border-[#6A1FA0]`} disabled={act.isPending}
                                onClick={() => act.mutate({ id: p.id, body: { action: "accept", applicationId: a.id } })}>
                                Hire
                              </button>
                              <button className={`${btn} border-[#E6DFEE] text-stone-600`} disabled={act.isPending}
                                onClick={() => act.mutate({ id: p.id, body: { action: "decline", applicationId: a.id } })}>
                                Decline
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-500 shrink-0">{a.status}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Find verified freelancers" bodyClassName="p-0">
        <div className="p-4 border-b border-[#E6DFEE]">
          <input className={input} placeholder="Search by name, specialty or skill" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {directoryQ.isLoading ? (
          <p className="p-4 text-sm text-stone-500">Loading…</p>
        ) : directoryQ.error ? (
          <p className="p-4 text-sm text-stone-500">The directory couldn't be loaded.</p>
        ) : directory.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">
            {q ? "No freelancers match your search." : "No freelancers have registered yet. Share your freelancer sign-up link: /freelancer?mode=register"}
          </p>
        ) : (
          <ul className="divide-y divide-[#E6DFEE]">
            {directory.map((f) => (
              <li key={f.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">{f.name}{f.specialty ? ` · ${f.specialty}` : ""}{f.verified && <VerifiedBadge />}</p>
                  {f.skills && <p className="text-xs text-stone-500 truncate">{f.skills}</p>}
                </div>
                {f.linked ? (
                  <span className="text-xs text-emerald-600 shrink-0">On your roster</span>
                ) : (
                  <button className={`${btn} border-[#6A1FA0] text-[#6A1FA0]`} disabled={link.isPending} onClick={() => link.mutate(f.id)}>
                    Add to roster
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
