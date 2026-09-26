"use client";

import { useEffect, useState } from "react";
import { Scissors, LogOut, Loader2, AlertCircle, CalendarDays, Banknote } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/atelier/_portal";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { formatDate } from "@/lib/format";

interface FreelancerProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  specialty?: string | null;
  skills?: string | null;
}

interface FreelanceJob {
  id: string;
  taskDescription: string;
  cost?: number | null;
  dueDate?: string | null;
  status: string;
  createdAt: string;
  shop?: { name: string };
}

const JOB_STATUSES = ["Commissioned", "In Progress", "Delivered", "Paid"] as const;

const STATUS_STYLE: Record<string, string> = {
  Commissioned: "bg-stone-100 text-stone-600 border-stone-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  Delivered: "bg-sky-50 text-sky-700 border-sky-200",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function FreelancerPortalClient() {
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<FreelancerProfile | null>(null);

  useEffect(() => {
    apiGet<FreelancerProfile>("/api/freelancer-auth/me")
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#faf8f5]">
        <Loader2 className="w-6 h-6 animate-spin text-[#800020]" />
      </div>
    );
  }

  if (!profile) {
    return <FreelancerLogin onLoggedIn={setProfile} />;
  }

  return (
    <FreelancerDashboard profile={profile} onLogout={() => setProfile(null)} />
  );
}

function FreelancerLogin({
  onLoggedIn,
}: {
  onLoggedIn: (p: FreelancerProfile) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiPost<{ freelancer: FreelancerProfile }>(
        "/api/freelancer-auth/login",
        { email, password }
      );
      onLoggedIn(res.freelancer);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#faf8f5] px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#800020] to-[#6b0018] flex items-center justify-center text-white shadow-sm mb-4">
            <Scissors className="w-5 h-5" />
          </div>
          <h1 className="font-display font-semibold text-[#1C1917] text-2xl">
            Freelancer sign in
          </h1>
          <p className="text-sm text-stone-500 mt-1 text-center">
            See the jobs shops have commissioned you for.
          </p>
        </div>

        <SectionCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-[#E7E5E4] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]/20"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-[#E7E5E4] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]/20"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-md bg-[#800020] hover:bg-[#6b0018] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </SectionCard>

        <p className="text-xs text-stone-400 text-center mt-6">
          Your login works the same way across every shop that commissions
          you — one account, all your jobs.
        </p>
      </div>
    </div>
  );
}

function FreelancerDashboard({
  profile,
  onLogout,
}: {
  profile: FreelancerProfile;
  onLogout: () => void;
}) {
  const [jobs, setJobs] = useState<FreelanceJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<FreelanceJob[]>("/api/freelancer/jobs")
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id);
    try {
      const updated = await apiPatch<FreelanceJob>(
        `/api/freelancer/jobs/${id}`,
        { status }
      );
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleLogout() {
    await apiPost("/api/freelancer-auth/logout", {});
    onLogout();
  }

  return (
    <div className="min-h-dvh bg-[#faf8f5]">
      <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12">
        <div className="flex items-start justify-between gap-4 mb-2">
          <PageHeader
            eyebrow="Freelancer"
            title={`Hi, ${profile.fullName.split(" ")[0]}`}
            subtitle={
              profile.specialty
                ? `${profile.specialty} · your commissioned jobs across every shop`
                : "Your commissioned jobs across every shop"
            }
          />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#800020] transition-colors mt-1 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#800020]" />
          </div>
        ) : jobs.length === 0 ? (
          <SectionCard>
            <div className="text-center py-8">
              <p className="text-sm text-stone-500">
                No jobs commissioned yet. Check back once a shop assigns you
                work.
              </p>
            </div>
          </SectionCard>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <SectionCard key={j.id}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    {j.shop && (
                      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-1">
                        {j.shop.name}
                      </p>
                    )}
                    <p className="font-medium text-[#1C1917] text-sm">
                      {j.taskDescription}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md border ${
                      STATUS_STYLE[j.status] || STATUS_STYLE.Commissioned
                    }`}
                  >
                    {j.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mb-3">
                  {j.dueDate && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" /> Due{" "}
                      {formatDate(j.dueDate)}
                    </span>
                  )}
                  {j.cost != null && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Banknote className="w-3.5 h-3.5" /> GHS {j.cost}
                    </span>
                  )}
                </div>

                <select
                  value={j.status}
                  onChange={(e) => handleStatusChange(j.id, e.target.value)}
                  disabled={updatingId === j.id}
                  className="h-9 px-2.5 rounded-md border border-[#E7E5E4] bg-white text-sm disabled:opacity-60"
                >
                  {JOB_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </SectionCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
