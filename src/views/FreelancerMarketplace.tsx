"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SectionCard } from "@/components/atelier/SectionCard";
import { apiGet, apiPost, apiPatch, apiErrorMessage } from "@/lib/api";

interface DirectoryEntry {
  id: string;
  name: string;
  specialty?: string | null;
  skills?: string | null;
  linked: boolean;
}
interface Application {
  id: string;
  freelancerId: string;
  name: string;
  specialty?: string | null;
  skills?: string | null;
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
  applications: Application[];
}

const input =
  "w-full h-10 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20";
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

  const directory = directoryQ.data ?? [];
  const posts = postsQ.data ?? [];

  return (
    <div className="space-y-5">
      <SectionCard title={`Post an open job`}>
        <div className="p-4 space-y-3">
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="What needs doing? e.g. Hand-bead the neckline of a kente gown"
            className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input className={input} type="number" min="0" placeholder="Budget (optional)" value={budget} onChange={(e) => setBudget(e.target.value)} />
            <input className={input} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <button
            className={`${btn} bg-[#2563EB] text-white border-[#2563EB]`}
            disabled={!task.trim() || publish.isPending}
            onClick={() => publish.mutate()}
          >
            {publish.isPending ? "Posting…" : "Post job"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title={`Open jobs & applications · ${posts.length}`} bodyClassName="p-0">
        {posts.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">No posts yet. Freelancers see open jobs and can apply.</p>
        ) : (
          <ul className="divide-y divide-[#E2E8F0]">
            {posts.map((p) => (
              <li key={p.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800">{p.taskDescription}</p>
                    <p className="text-xs text-stone-500">
                      {p.status}
                      {p.budget !== null ? ` · budget ${p.budget.toLocaleString()}` : ""}
                      {p.dueDate ? ` · due ${new Date(p.dueDate).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  {p.status === "Open" && (
                    <button className={`${btn} border-[#E2E8F0] text-stone-600`} onClick={() => act.mutate({ id: p.id, body: { action: "close" } })}>
                      Close
                    </button>
                  )}
                </div>
                {p.applications.length === 0 ? (
                  <p className="text-xs text-stone-400">No applicants yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {p.applications.map((a) => (
                      <li key={a.id} className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{a.name}{a.specialty ? ` · ${a.specialty}` : ""}</p>
                            {a.skills && <p className="text-xs text-stone-500">{a.skills}</p>}
                            {a.message && <p className="text-xs text-stone-600 mt-1">“{a.message}”</p>}
                            {a.proposedCost != null && <p className="text-xs text-stone-500 mt-1">Quote: {a.proposedCost.toLocaleString()}</p>}
                          </div>
                          {a.status === "Pending" && p.status === "Open" ? (
                            <div className="flex gap-2 shrink-0">
                              <button className={`${btn} bg-[#2563EB] text-white border-[#2563EB]`} disabled={act.isPending}
                                onClick={() => act.mutate({ id: p.id, body: { action: "accept", applicationId: a.id } })}>
                                Hire
                              </button>
                              <button className={`${btn} border-[#E2E8F0] text-stone-600`} disabled={act.isPending}
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

      <SectionCard title="Find freelancers" bodyClassName="p-0">
        <div className="p-4 border-b border-[#E2E8F0]">
          <input className={input} placeholder="Search by name, specialty or skill" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {directoryQ.isLoading ? (
          <p className="p-4 text-sm text-stone-500">Loading…</p>
        ) : directory.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">No freelancers found.</p>
        ) : (
          <ul className="divide-y divide-[#E2E8F0]">
            {directory.map((f) => (
              <li key={f.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{f.name}{f.specialty ? ` · ${f.specialty}` : ""}</p>
                  {f.skills && <p className="text-xs text-stone-500 truncate">{f.skills}</p>}
                </div>
                {f.linked ? (
                  <span className="text-xs text-emerald-600 shrink-0">On your roster</span>
                ) : (
                  <button className={`${btn} border-[#2563EB] text-[#2563EB]`} disabled={link.isPending} onClick={() => link.mutate(f.id)}>
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
