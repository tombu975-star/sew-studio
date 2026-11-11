"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Trash2,
  Pencil,
  Clock,
  Users as UsersIcon,
  ListChecks,
  Target,
  ChevronDown,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  CircleDot,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/atelier/PageHeader";
import { LearningTabs } from "@/components/atelier/LearningTabs";
import { EmptyState, SkeletonList } from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  PASS_MARK,
  UNIT_STATUS_LABEL,
  programProgress,
  splitLines,
  weeksSince,
  type ProgramProgress,
  type UnitProgress,
  type UnitStatus,
} from "@/lib/learning";
import { cn } from "@/lib/utils";
import type { TrainingProgram, CompetencyUnit, Task, User } from "@/lib/types";
import { useAuth } from "@/stores/auth";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500 flex items-center gap-1">
        {label}
        {required && <span className="text-[#6A1FA0]">*</span>}
      </Label>
      {children}
    </div>
  );
}

/* ============================== Shared bits ============================== */

const STATUS_STYLE: Record<UnitStatus, { pill: string; icon: string }> = {
  "not-started": { pill: "bg-slate-100 text-slate-600 border-slate-200", icon: "text-slate-300" },
  "in-progress": { pill: "bg-blue-50 text-blue-700 border-blue-200", icon: "text-[#6A1FA0]" },
  "needs-work": { pill: "bg-amber-50 text-amber-800 border-amber-200", icon: "text-amber-500" },
  competent: { pill: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: "text-emerald-600" },
};

function StatusIcon({ status, className }: { status: UnitStatus; className?: string }) {
  const cls = cn("size-5 shrink-0", STATUS_STYLE[status].icon, className);
  if (status === "competent") return <CheckCircle2 className={cls} aria-hidden="true" />;
  if (status === "not-started") return <Circle className={cls} aria-hidden="true" />;
  if (status === "needs-work") return <RotateCcw className={cls} aria-hidden="true" />;
  return <CircleDot className={cls} aria-hidden="true" />;
}

function StatusPill({ status }: { status: UnitStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        STATUS_STYLE[status].pill
      )}
    >
      {UNIT_STATUS_LABEL[status]}
    </span>
  );
}

function Bar({ value, label, tone = "blue" }: { value: number; label: string; tone?: "blue" | "green" }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", tone === "green" ? "bg-emerald-500" : "bg-[#6A1FA0]")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Ring({ value, size = 88 }: { value: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${pct}% of the course complete`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E6DFEE" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#6A1FA0"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-lg font-semibold tabular-nums text-[#2A0F45]">
        {pct}%
      </span>
    </div>
  );
}

function QueryProblem({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon={BookOpen}
      title={`We couldn't load ${what}`}
      description="Check your connection and try again."
      action={
        <PremiumButton size="sm" variant="outline" onClick={onRetry}>
          <RotateCcw className="w-4 h-4" /> Try again
        </PremiumButton>
      }
    />
  );
}

/* ============================== Main view ============================== */

export default function Curriculum() {
  const role = useRole();
  const canManage = role.isOwner() || role.isTrainer();

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto w-full">
      <PageHeader
        eyebrow={canManage ? "Training design" : "My training"}
        eyebrowIcon={BookOpen}
        title={canManage ? "Curriculum" : "My course"}
        subtitle={
          canManage
            ? "Design programmes by level, each with its own duration and units of competency, and see how your trainees are getting on."
            : "Your programme: what you'll learn, how you're doing, and what to do next."
        }
      />
      <LearningTabs current="curriculum" />
      {canManage ? <ManagerView /> : <LearnerView />}
    </div>
  );
}

/* ============================== Learner view ============================== */

function LearnerView() {
  const { user } = useAuth();
  const { go } = useNav();

  const usersQ = useQuery<User[]>({ queryKey: ["users"], queryFn: () => apiGet<User[]>("/api/users") });
  const programsQ = useQuery<TrainingProgram[]>({
    queryKey: ["training-programs"],
    queryFn: () => apiGet<TrainingProgram[]>("/api/training-programs"),
  });
  const tasksQ = useQuery<Task[]>({ queryKey: ["tasks"], queryFn: () => apiGet<Task[]>("/api/tasks") });

  const me = useMemo(() => (usersQ.data ?? []).find((u) => u.id === user?.id) ?? null, [usersQ.data, user?.id]);
  const program = useMemo(
    () => (programsQ.data ?? []).find((p) => p.id === me?.programId) ?? null,
    [programsQ.data, me?.programId]
  );
  const myTasks = useMemo(() => (tasksQ.data ?? []).filter((t) => t.staffId === user?.id), [tasksQ.data, user?.id]);
  const progress = useMemo(() => (program ? programProgress(program, myTasks) : null), [program, myTasks]);

  const [openId, setOpenId] = useState<string | null>(null);
  const unitRefs = useRef<Record<string, HTMLDivElement | null>>({});

  if (usersQ.isLoading || programsQ.isLoading) return <SkeletonList rows={4} />;
  if (usersQ.isError || programsQ.isError) {
    return <QueryProblem what="your course" onRetry={() => { usersQ.refetch(); programsQ.refetch(); }} />;
  }
  if (!program || !progress) {
    return (
      <EmptyState
        icon={BookOpen}
        title="You're not enrolled in a programme yet"
        description="Ask your trainer to enrol you. Once they do, your units, assignments and progress will appear here."
      />
    );
  }

  const jumpTo = (unitId: string) => {
    setOpenId(unitId);
    requestAnimationFrame(() =>
      unitRefs.current[unitId]?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };

  const weekNow = Math.min(program.durationWeeks, weeksSince(me?.trainingStartedAt) + 1);
  const allDone = progress.totalUnits > 0 && progress.competent === progress.totalUnits;

  return (
    <div className="space-y-6">
      <CourseHeader program={program} progress={progress} me={me} weekNow={weekNow} />

      {/* Continue / next due */}
      {progress.totalUnits > 0 && (
        <section aria-label="What to do next" className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-[#DDD3E7] bg-white p-4">
            <p className="text-xs font-medium text-slate-500">{allDone ? "Course complete" : "Continue learning"}</p>
            {allDone ? (
              <>
                <p className="mt-1 text-sm font-semibold text-[#2A0F45]">You've shown competence in every unit.</p>
                <PremiumButton className="mt-3" size="sm" onClick={() => go("certificate")}>
                  View certificate <ArrowRight className="w-4 h-4" />
                </PremiumButton>
              </>
            ) : progress.next ? (
              <>
                <p className="mt-1 text-sm font-semibold text-[#2A0F45]">
                  {progress.next.unit.code ? `${progress.next.unit.code} · ` : ""}
                  {progress.next.unit.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{UNIT_STATUS_LABEL[progress.next.status]}</p>
                <PremiumButton className="mt-3" size="sm" onClick={() => jumpTo(progress.next!.unit.id)}>
                  {progress.next.status === "not-started" ? "Start unit" : "Resume unit"} <ArrowRight className="w-4 h-4" />
                </PremiumButton>
              </>
            ) : null}
          </div>
          <div className="rounded-lg border border-[#DDD3E7] bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Next due</p>
            {progress.nextDue ? (
              <>
                <p className="mt-1 text-sm font-semibold text-[#2A0F45]">{progress.nextDue.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <CalendarClock className="size-3.5" aria-hidden="true" />
                  {progress.nextDue.dueDate ? `Due ${formatDate(progress.nextDue.dueDate)}` : "No due date set"}
                </p>
                <PremiumButton className="mt-3" size="sm" variant="outline" onClick={() => go("tasks")}>
                  Open my tasks <ArrowRight className="w-4 h-4" />
                </PremiumButton>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-600">
                {progress.assignmentsTotal ? "You're all caught up. Nothing is waiting on you." : "No assignments have been set for this programme yet."}
              </p>
            )}
          </div>
        </section>
      )}

      {tasksQ.isError && (
        <p role="status" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          We couldn't load your assignments, so unit progress may be incomplete.{" "}
          <button className="font-medium underline underline-offset-2" onClick={() => tasksQ.refetch()}>
            Try again
          </button>
        </p>
      )}

      <CourseContent
        progress={progress}
        openId={openId}
        setOpenId={setOpenId}
        unitRefs={unitRefs}
        onOpenTasks={() => go("tasks")}
      />
    </div>
  );
}

function CourseHeader({
  program,
  progress,
  me,
  weekNow,
}: {
  program: TrainingProgram;
  progress: ProgramProgress;
  me: User | null;
  weekNow: number;
}) {
  const avg = useMemo(() => {
    const graded = progress.units.flatMap((u) => u.tasks).filter((t) => t.score != null && t.maxScore);
    if (!graded.length) return null;
    return Math.round(graded.reduce((s, t) => s + ((t.score ?? 0) / (t.maxScore ?? 1)) * 100, 0) / graded.length);
  }, [progress]);
  const hasStarted = !!me?.trainingStartedAt;

  return (
    <section aria-labelledby="course-title" className="rounded-lg border border-[#DDD3E7] bg-white p-5 md:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-[#6A1FA0]/10 px-2 py-0.5 text-xs font-medium text-[#571A84]">
            {program.level}
          </span>
          <h2 id="course-title" className="mt-2 text-xl font-semibold tracking-tight text-[#2A0F45]">
            {program.name}
          </h2>
          {program.description && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">{program.description}</p>}
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden="true" />
              <dt className="sr-only">Duration</dt>
              <dd>{program.durationWeeks} weeks</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <ListChecks className="size-3.5" aria-hidden="true" />
              <dt className="sr-only">Units</dt>
              <dd>
                {progress.totalUnits} unit{progress.totalUnits === 1 ? "" : "s"}
                {progress.hoursTotal ? ` · ${progress.hoursTotal}h` : ""}
              </dd>
            </div>
            {me?.mentor?.fullName && (
              <div className="flex items-center gap-1.5">
                <UserRound className="size-3.5" aria-hidden="true" />
                <dt className="sr-only">Mentor</dt>
                <dd>Mentor: {me.mentor.fullName}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:gap-2">
          <Ring value={progress.completionPct} />
          <p className="text-xs text-slate-500 sm:text-center">
            <span className="font-semibold text-[#2A0F45]">{progress.competent}</span> of {progress.totalUnits} units competent
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#F0EBF5] pt-4 sm:gap-4">
        <Stat label="Assignments" value={`${progress.assignmentsDone}/${progress.assignmentsTotal}`}>
          <Bar
            label="Assignments done"
            value={progress.assignmentsTotal ? (progress.assignmentsDone / progress.assignmentsTotal) * 100 : 0}
          />
        </Stat>
        <Stat label="Average score" value={avg == null ? "Not graded" : `${avg}%`}>
          <p className="text-[11px] text-slate-400">Pass {PASS_MARK}%</p>
        </Stat>
        <Stat label="Time in programme" value={hasStarted ? `Week ${weekNow}/${program.durationWeeks}` : "Not started"}>
          {hasStarted && <Bar label="Time elapsed" value={(weekNow / program.durationWeeks) * 100} tone="green" />}
        </Stat>
      </div>
    </section>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-[#2A0F45]">{value}</p>
      {children}
    </div>
  );
}

type Filter = "all" | UnitStatus;

function CourseContent({
  progress,
  openId,
  setOpenId,
  unitRefs,
  onOpenTasks,
}: {
  progress: ProgramProgress;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  unitRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onOpenTasks: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: progress.units.length, "not-started": 0, "in-progress": 0, "needs-work": 0, competent: 0 };
    progress.units.forEach((u) => (c[u.status] += 1));
    return c;
  }, [progress.units]);

  const visible = progress.units.filter((u) => {
    if (filter !== "all" && u.status !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || `${u.unit.code ?? ""} ${u.unit.title}`.toLowerCase().includes(q);
  });

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in-progress", label: "In progress" },
    { key: "not-started", label: "Not started" },
    { key: "needs-work", label: "Needs practice" },
    { key: "competent", label: "Competent" },
  ];

  return (
    <section aria-labelledby="content-title">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 id="content-title" className="text-base font-semibold text-[#2A0F45]">
          Course content
        </h2>
        {progress.units.length > 4 && (
          <div className="relative md:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search units"
              aria-label="Search units"
              className="pl-9"
            />
          </div>
        )}
      </div>

      {progress.units.length > 1 && (
        <div role="group" aria-label="Filter units by status" className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0">
          {chips
            .filter((c) => c.key === "all" || counts[c.key] > 0 || filter === c.key)
            .map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={filter === c.key}
                onClick={() => setFilter(c.key)}
                className={cn(
                  "h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6A1FA0]/40",
                  filter === c.key
                    ? "border-[#6A1FA0] bg-[#6A1FA0] text-white"
                    : "border-[#DDD3E7] bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                {c.label} <span className="tabular-nums opacity-80">{counts[c.key]}</span>
              </button>
            ))}
        </div>
      )}

      <div className="mt-3 space-y-3" aria-live="polite">
        {progress.units.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No units have been added yet"
            description="Your trainer is still setting up this programme. Check back soon."
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} title="No units match" description="Try a different search or filter." />
        ) : (
          visible.map((u) => (
            <div
              key={u.unit.id}
              ref={(el) => {
                unitRefs.current[u.unit.id] = el;
              }}
              className="scroll-mt-20"
            >
              <UnitRow
                u={u}
                index={progress.units.indexOf(u) + 1}
                open={openId === u.unit.id}
                onToggle={() => setOpenId(openId === u.unit.id ? null : u.unit.id)}
                onOpenTasks={onOpenTasks}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function UnitRow({
  u,
  index,
  open,
  onToggle,
  onOpenTasks,
}: {
  u: UnitProgress;
  index: number;
  open: boolean;
  onToggle: () => void;
  onOpenTasks: () => void;
}) {
  const outcomes = splitLines(u.unit.learningOutcomes);
  const criteria = splitLines(u.unit.assessmentCriteria);
  const panelId = `unit-${u.unit.id}`;

  return (
    <div className="overflow-hidden rounded-lg border border-[#DDD3E7] bg-white">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6A1FA0]/40 md:gap-4 md:p-5"
        >
          <StatusIcon status={u.status} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[#2A0F45]">
              <span className="text-slate-400">{index}. </span>
              {u.unit.code ? <span className="text-slate-400">{u.unit.code} · </span> : null}
              {u.unit.title}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {u.unit.nominalHours != null && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" aria-hidden="true" />
                  {u.unit.nominalHours}h
                </span>
              )}
              <span>{u.total ? `${u.done} of ${u.total} assignments done` : "No assignments yet"}</span>
              {u.avgPct != null && <span className="tabular-nums">Score {u.avgPct}%</span>}
            </span>
            {u.total > 0 && (
              <span className="mt-2 block max-w-xs">
                <Bar label={`${u.unit.title} progress`} value={u.completionPct} tone={u.status === "competent" ? "green" : "blue"} />
              </span>
            )}
          </span>
          <span className="hidden sm:block">
            <StatusPill status={u.status} />
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </h3>

      {open && (
        <div id={panelId} role="region" aria-label={`${u.unit.title} details`} className="space-y-5 border-t border-[#F0EBF5] bg-[#FAF8FC] p-4 md:p-5">
          <div className="sm:hidden">
            <StatusPill status={u.status} />
          </div>

          {outcomes.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Target className="size-3.5" aria-hidden="true" /> What you'll learn
              </h4>
              <ul className="space-y-1.5">
                {outcomes.map((o, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-[#6A1FA0]" aria-hidden="true" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {criteria.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <ListChecks className="size-3.5" aria-hidden="true" /> How you'll be assessed
              </h4>
              <ul className="space-y-1.5">
                {criteria.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-semibold text-slate-600">Your assignments</h4>
            {u.tasks.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing has been assigned for this unit yet. Your trainer will add work as you go.</p>
            ) : (
              <ul className="divide-y divide-[#E6DFEE] rounded-md border border-[#E6DFEE] bg-white">
                {u.tasks.map((t) => {
                  const pct = t.score != null && t.maxScore ? Math.round((t.score / t.maxScore) * 100) : null;
                  return (
                    <li key={t.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#2A0F45]">{t.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {t.status}
                          {t.dueDate && t.status !== "Done" ? ` · due ${formatDate(t.dueDate)}` : ""}
                        </p>
                        {t.feedback && <p className="mt-1.5 text-xs leading-relaxed text-slate-600">Feedback: {t.feedback}</p>}
                      </div>
                      {pct != null && (
                        <span
                          className={cn(
                            "shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums",
                            pct >= PASS_MARK ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
                          )}
                        >
                          {t.score}/{t.maxScore} · {pct}%
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {u.status === "needs-work" && (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Your average is below the {PASS_MARK}% pass mark. Talk to your mentor about what to practise next.
              </p>
            )}
            {u.tasks.some((t) => t.status !== "Done") && (
              <PremiumButton className="mt-3" size="sm" variant="outline" onClick={onOpenTasks}>
                Open my tasks <ArrowRight className="w-4 h-4" />
              </PremiumButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== Manager view ============================== */

function ManagerView() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<TrainingProgram | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingProgram | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const programsQ = useQuery<TrainingProgram[]>({
    queryKey: ["training-programs"],
    queryFn: () => apiGet<TrainingProgram[]>("/api/training-programs"),
  });
  const usersQ = useQuery<User[]>({ queryKey: ["users"], queryFn: () => apiGet<User[]>("/api/users") });
  const tasksQ = useQuery<Task[]>({ queryKey: ["tasks"], queryFn: () => apiGet<Task[]>("/api/tasks") });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/training-programs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-programs"] });
      toast.success("Programme deleted.");
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error("Could not delete programme.", { description: err.message }),
  });

  const programs = programsQ.data ?? [];
  const trainees = useMemo(() => (usersQ.data ?? []).filter((u) => u.role === "trainee"), [usersQ.data]);
  const shown = programs.filter((p) => !query.trim() || `${p.name} ${p.level}`.toLowerCase().includes(query.trim().toLowerCase()));

  const totals = useMemo(
    () => ({
      programs: programs.length,
      units: programs.reduce((s, p) => s + p.units.length, 0),
      hours: programs.reduce((s, p) => s + p.units.reduce((h, u) => h + (u.nominalHours ?? 0), 0), 0),
      enrolled: trainees.filter((t) => t.programId).length,
    }),
    [programs, trainees]
  );

  const newButton = (
    <PremiumButton size="sm" onClick={() => setCreateOpen(true)}>
      <Plus className="w-4 h-4" /> New programme
    </PremiumButton>
  );

  return (
    <div className="space-y-5">
      {programsQ.isLoading ? (
        <SkeletonList rows={3} />
      ) : programsQ.isError ? (
        <QueryProblem what="your programmes" onRetry={() => programsQ.refetch()} />
      ) : programs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No training programmes yet"
          description="Create a programme to set its level, duration and units of competency. Then enrol trainees from the Team page."
          action={newButton}
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Programmes", totals.programs],
              ["Units", totals.units],
              ["Nominal hours", totals.hours],
              ["Trainees enrolled", totals.enrolled],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border border-[#DDD3E7] bg-white p-4">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-[#2A0F45]">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {programs.length > 3 ? (
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search programmes" aria-label="Search programmes" className="pl-9" />
              </div>
            ) : (
              <span />
            )}
            {newButton}
          </div>

          {shown.length === 0 ? (
            <EmptyState icon={Search} title="No programmes match" description="Try a different search." />
          ) : (
            <div className="space-y-4">
              {shown.map((p) => (
                <ProgramCard
                  key={p.id}
                  program={p}
                  enrolled={trainees.filter((t) => t.programId === p.id)}
                  tasks={tasksQ.data ?? []}
                  expanded={expandedId === p.id}
                  onToggle={() => setExpandedId((cur) => (cur === p.id ? null : p.id))}
                  onEdit={() => setEditProgram(p)}
                  onDelete={() => setDeleteTarget(p)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ProgramFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <ProgramFormDialog
        key={editProgram?.id ?? "edit-none"}
        open={!!editProgram}
        onOpenChange={(v) => !v && setEditProgram(null)}
        mode="edit"
        program={editProgram}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this programme?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?._count?.trainees
                ? `${deleteTarget._count.trainees} trainee(s) are enrolled. They'll be unenrolled, and their task history and grades stay as they are.`
                : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-[#6A1FA0] hover:bg-[#571A84]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================== Program card ============================== */

function ProgramCard({
  program,
  enrolled,
  tasks,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  program: TrainingProgram;
  enrolled: User[];
  tasks: Task[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const panelId = `program-${program.id}`;
  const totalHours = program.units.reduce((sum, u) => sum + (u.nominalHours ?? 0), 0);

  // Cohort report: each enrolled trainee's own progress through this programme.
  const learners = useMemo(
    () =>
      enrolled
        .map((t) => ({ user: t, p: programProgress(program, tasks.filter((x) => x.staffId === t.id)) }))
        .sort((a, b) => a.p.completionPct - b.p.completionPct),
    [enrolled, program, tasks]
  );
  const cohortAvg = learners.length
    ? Math.round(learners.reduce((s, l) => s + l.p.completionPct, 0) / learners.length)
    : null;

  return (
    <div className="overflow-hidden rounded-lg border border-[#DDD3E7] bg-white">
      <div className="flex items-start gap-2 p-4 md:p-5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6A1FA0]/40"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-[#2A0F45]">{program.name}</span>
            <span className="rounded-full bg-[#6A1FA0]/10 px-2 py-0.5 text-xs font-medium text-[#571A84]">{program.level}</span>
          </span>
          {program.description && <span className="mt-1.5 block max-w-xl text-sm text-slate-600">{program.description}</span>}
          <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden="true" /> {program.durationWeeks} weeks
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="size-3.5" aria-hidden="true" /> {program.units.length} unit{program.units.length === 1 ? "" : "s"}
              {totalHours ? ` · ${totalHours}h` : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UsersIcon className="size-3.5" aria-hidden="true" /> {enrolled.length} enrolled
            </span>
            {cohortAvg != null && <span className="tabular-nums">Average completion {cohortAvg}%</span>}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${program.name}`}
            className="rounded-md p-2 text-slate-400 transition hover:bg-[#F6EFFB] hover:text-[#6A1FA0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6A1FA0]/40"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${program.name}`}
            className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? `Collapse ${program.name}` : `Expand ${program.name}`}
            tabIndex={-1}
            className="rounded-md p-2 text-slate-400"
          >
            <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {expanded && (
        <div id={panelId} className="space-y-6 border-t border-[#F0EBF5] bg-[#FAF8FC] p-4 md:p-5">
          <section aria-label="Trainee progress">
            <h4 className="mb-2 text-xs font-semibold text-slate-600">Trainee progress</h4>
            {learners.length === 0 ? (
              <p className="text-sm text-slate-500">No trainees are enrolled in this programme yet.</p>
            ) : (
              <ul className="divide-y divide-[#E6DFEE] rounded-md border border-[#E6DFEE] bg-white">
                {learners.map(({ user, p }) => (
                  <li key={user.id} className="flex items-center gap-4 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#2A0F45]">{user.fullName}</p>
                      <p className="text-xs text-slate-500">
                        {p.competent} of {p.totalUnits} units competent · {p.assignmentsDone}/{p.assignmentsTotal} assignments
                      </p>
                    </div>
                    <div className="w-28 shrink-0">
                      <Bar label={`${user.fullName} completion`} value={p.completionPct} tone={p.completionPct === 100 ? "green" : "blue"} />
                      <p className="mt-1 text-right text-[11px] tabular-nums text-slate-500">{p.completionPct}%</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Units of competency" className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-600">Units of competency</h4>
            {program.units.length === 0 ? (
              <p className="text-sm text-slate-500">No units added yet.</p>
            ) : (
              program.units
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((u) => <UnitCard key={u.id} unit={u} />)
            )}
            <PremiumButton size="sm" variant="outline" onClick={() => setAddUnitOpen(true)}>
              <Plus className="w-4 h-4" /> Add unit of competency
            </PremiumButton>
          </section>
        </div>
      )}

      <UnitFormDialog open={addUnitOpen} onOpenChange={setAddUnitOpen} programId={program.id} />
    </div>
  );
}

function UnitCard({ unit }: { unit: CompetencyUnit }) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/api/competency-units/${unit.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-programs"] });
      toast.success("Unit removed.");
      setConfirmOpen(false);
    },
    onError: (err: Error) => toast.error("Could not remove unit.", { description: err.message }),
  });

  const outcomes = splitLines(unit.learningOutcomes);
  const criteria = splitLines(unit.assessmentCriteria);

  return (
    <div className="rounded-md border border-[#E6DFEE] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#2A0F45]">
            {unit.code ? <span className="text-slate-400">{unit.code} · </span> : null}
            {unit.title}
          </p>
          {unit.nominalHours != null && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <Clock className="size-3" aria-hidden="true" /> {unit.nominalHours}h nominal
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            aria-label={`Edit ${unit.title}`}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-[#F6EFFB] hover:text-[#6A1FA0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6A1FA0]/40"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label={`Remove ${unit.title}`}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {outcomes.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Target className="size-3" aria-hidden="true" /> Learning outcomes
          </p>
          <ul className="space-y-1">
            {outcomes.map((o, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-[#6A1FA0]" aria-hidden="true" /> {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      {criteria.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <ListChecks className="size-3" aria-hidden="true" /> Assessment criteria
          </p>
          <ul className="space-y-1">
            {criteria.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-slate-400" aria-hidden="true" /> {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <UnitFormDialog open={editOpen} onOpenChange={setEditOpen} programId={unit.programId} unit={unit} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this unit?</AlertDialogTitle>
            <AlertDialogDescription>
              Assignments linked to "{unit.title}" keep their grades but will no longer count towards a unit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-[#6A1FA0] hover:bg-[#571A84]">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================== Program form ============================== */

interface ProgramFormState {
  name: string;
  level: string;
  durationWeeks: string;
  description: string;
}

function ProgramFormDialog({
  open,
  onOpenChange,
  mode,
  program,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  program?: TrainingProgram | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProgramFormState>(() => ({
    name: program?.name ?? "",
    level: program?.level ?? "",
    durationWeeks: program ? String(program.durationWeeks) : "12",
    description: program?.description ?? "",
  }));

  const set = <K extends keyof ProgramFormState>(k: K, v: ProgramFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        level: form.level.trim(),
        durationWeeks: Number(form.durationWeeks) || 1,
        description: form.description.trim() || null,
      };
      return mode === "create"
        ? apiPost<TrainingProgram>("/api/training-programs", body)
        : apiPatch<TrainingProgram>(`/api/training-programs/${program?.id}`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-programs"] });
      toast.success(mode === "create" ? "Training program created." : "Program updated.");
      onOpenChange(false);
    },
    onError: (err: Error) =>
      toast.error("Could not save program.", { description: err.message }),
  });

  const valid = form.name.trim() && form.level.trim() && Number(form.durationWeeks) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New training program" : "Edit training program"}
          </DialogTitle>
          <DialogDescription>
            Set the level and duration — you'll add units of competency after saving.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Program name" required>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Bespoke Tailoring Apprenticeship"
              className="h-10 bg-white border-[#E6DFEE] rounded-md"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Level" required>
              <Input
                value={form.level}
                onChange={(e) => set("level", e.target.value)}
                placeholder="e.g. Beginner, NVTI Grade II, GTQF Level 3"
                className="h-10 bg-white border-[#E6DFEE] rounded-md"
              />
            </Field>
            <Field label="Duration (weeks)" required>
              <Input
                type="number"
                min="1"
                step="1"
                value={form.durationWeeks}
                onChange={(e) => set("durationWeeks", e.target.value)}
                className="h-10 bg-white border-[#E6DFEE] rounded-md tabular-nums"
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What this program covers and who it's for."
              className="bg-white border-[#E6DFEE] rounded-md min-h-[80px]"
            />
          </Field>
          <DialogFooter>
            <PremiumButton
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </PremiumButton>
            <PremiumButton
              type="submit"
              variant="primary"
              size="md"
              loading={mutation.isPending}
              disabled={!valid}
            >
              {mode === "create" ? "Create program" : "Save changes"}
            </PremiumButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================== Unit form ============================== */

interface UnitFormState {
  title: string;
  code: string;
  nominalHours: string;
  learningOutcomes: string;
  assessmentCriteria: string;
}

function UnitFormDialog({
  open,
  onOpenChange,
  programId,
  unit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  programId: string;
  unit?: CompetencyUnit;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<UnitFormState>(() => ({
    title: unit?.title ?? "",
    code: unit?.code ?? "",
    nominalHours: unit?.nominalHours != null ? String(unit.nominalHours) : "",
    learningOutcomes: unit?.learningOutcomes ?? "",
    assessmentCriteria: unit?.assessmentCriteria ?? "",
  }));

  const set = <K extends keyof UnitFormState>(k: K, v: UnitFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        title: form.title.trim(),
        code: form.code.trim() || null,
        nominalHours: form.nominalHours ? Number(form.nominalHours) : null,
        learningOutcomes: form.learningOutcomes,
        assessmentCriteria: form.assessmentCriteria,
      };
      return unit
        ? apiPatch(`/api/competency-units/${unit.id}`, body)
        : apiPost(`/api/training-programs/${programId}/units`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-programs"] });
      toast.success(unit ? "Unit updated." : "Unit added.");
      onOpenChange(false);
    },
    onError: (err: Error) =>
      toast.error("Could not save unit.", { description: err.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {unit ? "Edit unit of competency" : "New unit of competency"}
          </DialogTitle>
          <DialogDescription>
            One line per outcome / criterion — they'll render as a bullet list.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid sm:grid-cols-[1fr,110px,110px] gap-3">
            <Field label="Title" required>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Pattern Drafting Fundamentals"
                className="h-10 bg-white border-[#E6DFEE] rounded-md"
              />
            </Field>
            <Field label="Unit code">
              <Input
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="CU-01"
                className="h-10 bg-white border-[#E6DFEE] rounded-md"
              />
            </Field>
            <Field label="Nominal hrs">
              <Input
                type="number"
                min="0"
                value={form.nominalHours}
                onChange={(e) => set("nominalHours", e.target.value)}
                className="h-10 bg-white border-[#E6DFEE] rounded-md tabular-nums"
              />
            </Field>
          </div>
          <Field label="Learning outcomes" required>
            <Textarea
              value={form.learningOutcomes}
              onChange={(e) => set("learningOutcomes", e.target.value)}
              placeholder={"Draft a basic bodice block from measurements\nAdjust darts for fit"}
              className="bg-white border-[#E6DFEE] rounded-md min-h-[90px]"
            />
          </Field>
          <Field label="Assessment criteria" required>
            <Textarea
              value={form.assessmentCriteria}
              onChange={(e) => set("assessmentCriteria", e.target.value)}
              placeholder={"Block matches measurements within 0.5cm\nDarts sit correctly on the stand"}
              className="bg-white border-[#E6DFEE] rounded-md min-h-[90px]"
            />
          </Field>
          <DialogFooter>
            <PremiumButton
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </PremiumButton>
            <PremiumButton
              type="submit"
              variant="primary"
              size="md"
              loading={mutation.isPending}
              disabled={!form.title.trim()}
            >
              {unit ? "Save changes" : "Add unit"}
            </PremiumButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
