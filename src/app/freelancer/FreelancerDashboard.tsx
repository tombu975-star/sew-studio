"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Banknote, Briefcase, CalendarDays, CheckCircle2, Clock, Hammer, LogOut, Scissors, Search, UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard } from "@/components/atelier/_portal";
import { PremiumMetric } from "@/components/atelier/PremiumMetric";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { VerifiedBadge } from "@/components/atelier/VerifiedBadge";
import { VerifyBanner } from "./VerifyBanner";
import { EmptyState } from "@/components/atelier/EmptyState";
import { apiGet, apiPatch, apiPost, setOnSessionExpired } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OpenJobsPanel } from "./OpenJobsPanel";
import { ProfilePanel } from "./ProfilePanel";
import { JOB_STATUSES, type FreelanceJob, type FreelancerProfile } from "./types";

type Tab = "jobs" | "open" | "profile";
const NAV: { id: Tab; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { id: "jobs", label: "My jobs", icon: Briefcase },
  { id: "open", label: "Open jobs", icon: Search },
  { id: "profile", label: "Profile", icon: UserRound },
];
const CURRENCY = "GHS";
const IDLE_MS = 20 * 60 * 1000;
const WARN_MS = 60 * 1000;

export function FreelancerDashboard({
  profile,
  onProfileChange,
  onLogout,
}: {
  profile: FreelancerProfile;
  onProfileChange: (p: FreelancerProfile) => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("jobs");

  const logout = useCallback(async () => {
    await apiPost("/api/freelancer-auth/logout", {}).catch(() => {});
    onLogout();
  }, [onLogout]);

  // Expired session → back to sign in (same behaviour as the studio app).
  useEffect(() => {
    setOnSessionExpired(() => {
      toast.error("Your session has expired. Please sign in again.");
      onLogout();
    });
  }, [onLogout]);

  // Idle sign-out after 20 minutes, with a one-minute warning (matches the studio app).
  const lastActivity = useRef(Date.now());
  const warned = useRef(false);
  useEffect(() => {
    const bump = () => { lastActivity.current = Date.now(); warned.current = false; };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_MS) { toast.info("Signed out due to inactivity."); logout(); }
      else if (idle >= IDLE_MS - WARN_MS && !warned.current) {
        warned.current = true;
        toast.warning("You'll be signed out in a minute due to inactivity.");
      }
    }, 5000);
    return () => { events.forEach((e) => window.removeEventListener(e, bump)); window.clearInterval(timer); };
  }, [logout]);

  const initials = profile.fullName.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-dvh bg-[#FCF8F9] pb-24 md:pb-10">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[#EEDFE3] bg-white/95 backdrop-blur-md pt-safe">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#800020] to-[#650019] text-white">
              <Scissors className="size-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-[#2F151B]">Freelancer portal</p>
              <p className="flex items-center gap-1.5 truncate text-[11px] text-stone-500">{profile.fullName}{profile.verified && <VerifiedBadge compact />}</p>
            </div>
          </div>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                  tab === id ? "bg-[#FAF0F2] text-[#650019]" : "text-stone-600 hover:bg-[#F7EFF1]"
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab("profile")}
              className="grid size-9 place-items-center rounded-full bg-[#FAF0F2] text-xs font-semibold text-[#650019] md:hidden"
              aria-label="Profile"
            >
              {initials || "F"}
            </button>
            <PremiumButton variant="ghost" size="sm" onClick={logout} className="hidden md:inline-flex">
              <LogOut className="size-3.5" /> Sign out
            </PremiumButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 animate-fade-in">
        {!profile.verified && <VerifyBanner onVerified={onProfileChange} />}
        {tab === "jobs" && <MyJobs profile={profile} onBrowse={() => setTab("open")} />}
        {tab === "open" && (
          <>
            <PageHeader eyebrow="Find work" title="Open jobs" subtitle="Jobs studios have posted. Apply with your price and a short note — no roster invitation needed." />
            <OpenJobsPanel canApply={!!profile.verified} />
          </>
        )}
        {tab === "profile" && <ProfilePanel profile={profile} onChange={onProfileChange} onLogout={logout} />}
      </main>

      {/* Mobile bottom nav (same pattern as the studio app) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 pb-safe pl-safe pr-safe border-t border-[#EEDFE3] bg-white/95 backdrop-blur-md" aria-label="Sections">
        <div className="flex h-14 items-center justify-around">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} aria-current={active ? "page" : undefined}
                className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-2 py-1.5">
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#800020]" />}
                <Icon className={cn("size-5", active ? "text-[#800020]" : "text-stone-400")} strokeWidth={active ? 2 : 1.5} />
                <span className={cn("text-[10px] leading-tight", active ? "font-semibold text-[#800020]" : "text-stone-400")}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ───────────── My jobs ───────────── */

type Filter = "all" | "active" | "Delivered" | "Paid";

function MyJobs({ profile, onBrowse }: { profile: FreelancerProfile; onBrowse: () => void }) {
  const [jobs, setJobs] = useState<FreelanceJob[] | null>(null);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(() => {
    setError("");
    apiGet<FreelanceJob[]>("/api/freelancer/jobs")
      .then(setJobs)
      .catch((e) => { setError(apiErrorMessage(e, "Could not load your jobs.")); setJobs((j) => j ?? []); });
  }, []);
  useEffect(load, [load]);

  async function setStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const updated = await apiPatch<FreelanceJob>(`/api/freelancer/jobs/${id}`, { status });
      setJobs((prev) => (prev ?? []).map((j) => (j.id === id ? { ...j, ...updated } : j)));
      toast.success(`Marked as ${status}.`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not update that job."));
    } finally {
      setUpdatingId(null);
    }
  }

  const stats = useMemo(() => {
    const list = jobs ?? [];
    const active = list.filter((j) => j.status === "Commissioned" || j.status === "In Progress");
    return {
      active: active.length,
      overdue: active.filter((j) => isOverdue(j.dueDate)).length,
      awaiting: list.filter((j) => j.status === "Delivered").reduce((s, j) => s + Number(j.cost || 0), 0),
      earned: list.filter((j) => j.status === "Paid").reduce((s, j) => s + Number(j.cost || 0), 0),
    };
  }, [jobs]);

  const visible = (jobs ?? []).filter((j) =>
    filter === "all" ? true : filter === "active" ? j.status === "Commissioned" || j.status === "In Progress" : j.status === filter
  );

  const first = profile.fullName.split(" ")[0];
  return (
    <>
      <PageHeader eyebrow="Overview" title={`Hello, ${first}`} subtitle="Your commissions across every studio." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PremiumMetric label="Active jobs" value={jobs ? stats.active : "–"} icon={Hammer} accent />
        <PremiumMetric label="Overdue" value={jobs ? stats.overdue : "–"} icon={AlertTriangle} />
        <PremiumMetric label="Awaiting payment" value={jobs ? formatCurrency(stats.awaiting, CURRENCY) : "–"} icon={Clock} />
        <PremiumMetric label="Earned" value={jobs ? formatCurrency(stats.earned, CURRENCY) : "–"} icon={Banknote} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter jobs">
        {([["all", "All"], ["active", "Active"], ["Delivered", "Delivered"], ["Paid", "Paid"]] as [Filter, string][]).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
            className={cn("h-8 rounded-full border px-3.5 text-xs font-medium transition-colors",
              filter === k ? "border-[#650019] bg-[#650019] text-white" : "border-[#E6D4D8] bg-white text-stone-600 hover:border-[#650019]")}>
            {label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}

      {jobs === null ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-lg border border-[#EEDFE3] bg-white" />)}
        </div>
      ) : visible.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={Briefcase}
            title={jobs.length === 0 ? "No commissions yet" : "Nothing in this view"}
            description={jobs.length === 0
              ? "Browse open jobs to apply, or ask a studio to add you to their roster."
              : "Try a different filter."}
            action={jobs.length === 0 ? <PremiumButton size="sm" onClick={onBrowse}>Browse open jobs</PremiumButton> : undefined}
          />
        </SectionCard>
      ) : (
        <div className="space-y-3">
          {visible.map((j) => {
            const late = isOverdue(j.dueDate) && (j.status === "Commissioned" || j.status === "In Progress");
            return (
              <SectionCard key={j.id}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {j.shop?.name && <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-600">{j.shop.name}</p>}
                    <p className="mt-0.5 text-sm text-stone-800">{j.taskDescription}</p>
                  </div>
                  <StatusBadge status={j.status} className="shrink-0" />
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                  {j.dueDate && (
                    <span className={cn("inline-flex items-center gap-1", late && "font-medium text-[#8E3232]")}>
                      <CalendarDays className="size-3.5" /> {late ? "Overdue · " : "Due "}{formatDate(j.dueDate)}
                    </span>
                  )}
                  {j.cost != null && (
                    <span className="inline-flex items-center gap-1 tabular-nums"><Banknote className="size-3.5" /> {formatCurrency(Number(j.cost), CURRENCY)}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Update status">
                  {JOB_STATUSES.map((s) => (
                    <button key={s} disabled={updatingId === j.id || j.status === s} onClick={() => setStatus(j.id, s)}
                      aria-pressed={j.status === s}
                      className={cn("inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:cursor-default",
                        j.status === s ? "border-[#650019] bg-[#FAF0F2] text-[#650019]" : "border-[#E6D4D8] bg-white text-stone-600 hover:border-[#650019] disabled:opacity-50")}>
                      {j.status === s && <CheckCircle2 className="size-3.5" />} {s}
                    </button>
                  ))}
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </>
  );
}
