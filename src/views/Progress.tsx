"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  GraduationCap,
  Plus,
  Mail,
  Phone,
  Trash2,
  CheckSquare,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Scissors,
  CalendarDays,
} from "lucide-react";

import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumMetric } from "@/components/atelier/PremiumMetric";
import { AnimatedNumber } from "@/components/atelier/AnimatedNumber";
import { EmptyState, SkeletonList } from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { StatusBadge } from "@/components/atelier/StatusBadge";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  shortDate,
  todayISO,
  isOverdue,
} from "@/lib/format";
import type {
  Order,
  Task,
  TrainingLog,
  TrainingStatus,
  User,
} from "@/lib/types";
import { useAuth } from "@/stores/auth";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";
import { cn } from "@/lib/utils";

/* ----------------------------- constants ----------------------------- */

const COMMON_SKILLS = [
  "Pattern drafting",
  "Flat-felled seams",
  "Bodice boning",
  "Measurements",
  "Kente cutting",
  "Zippers",
  "Hems",
  "Alterations",
  "Other",
] as const;

const TRAINING_STATUSES: TrainingStatus[] = [
  "Learning",
  "Practicing",
  "Proficient",
];

const STATUS_HINT: Record<TrainingStatus, string> = {
  Learning: "Early days — keep practising.",
  Practicing: "Solid — refining technique.",
  Proficient: "Mastered — ready to teach others.",
};

function initialOf(name: string): string {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

function gradientFor(name: string): string {
  // Deterministic burgundy-leaning gradient avatar.
  const palettes = [
    "from-[#800020] to-[#6b0018]",
    "from-[#800020] to-[#b45309]",
    "from-[#6b0018] to-[#0e7490]",
    "from-[#800020] to-[#15803D]",
    "from-[#6b0018] to-[#800020]",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

/* =============================== Progress =============================== */

export default function Progress() {
  const { user } = useAuth();
  const { isTrainee } = useRole();

  // Trainee always sees their own progress.
  // Owner/trainer uses useNav().selectedId to pick a trainee.
  if (user && isTrainee()) {
    return <TraineeProgress traineeId={user.id} />;
  }
  return <OwnerProgress />;
}

/* =========================== Trainee mode ============================ */

function TraineeProgress({ traineeId }: { traineeId: string }) {
  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto w-full">
      <PageHeader
        eyebrow="My apprenticeship"
        eyebrowIcon={GraduationCap}
        title="My Progress"
        subtitle="Your skill journey at the atelier."
      />
      <ProgressBody traineeId={traineeId} viewerRole="trainee" />
    </div>
  );
}

/* ========================= Owner / Trainer mode ====================== */

function OwnerProgress() {
  const { user } = useAuth();
  const { selectedId, go } = useNav();
  const qc = useQueryClient();

  const usersQ = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiGet<User[]>("/api/users"),
  });

  const trainees = useMemo(
    () =>
      (usersQ.data ?? [])
        .filter((u) => u.role === "trainee")
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [usersQ.data]
  );

  const selectedTrainee = useMemo(
    () => trainees.find((t) => t.id === selectedId) ?? null,
    [trainees, selectedId]
  );

  // If the selectedId doesn't point to a trainee, treat as no selection.
  const activeTraineeId = selectedTrainee ? selectedTrainee.id : null;

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto w-full">
      <PageHeader
        eyebrow="Apprenticeship"
        eyebrowIcon={GraduationCap}
        title="Trainee Progress"
        subtitle="Review your trainees' skill journeys."
        actions={
          user ? (
            <div className="hidden md:flex items-center gap-2 rounded-full border border-[#E7E5E4] bg-white pl-2 pr-3 py-1.5 elevate-sm">
              <span
                className={cn(
                  "w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[11px] font-display font-semibold",
                  gradientFor(user.fullName)
                )}
              >
                {initialOf(user.fullName)}
              </span>
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  {user.role === "trainer" ? "Trainer" : "Owner"}
                </div>
                <div className="text-xs font-medium text-[#1C1917]">
                  {user.fullName}
                </div>
              </div>
            </div>
          ) : undefined
        }
      />

      {/* Trainee picker */}
      <SectionCard
        title="Select a trainee"
        bodyClassName="p-4 sm:p-5"
        className="mb-6"
      >
        {usersQ.isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 h-14 w-44 rounded-lg shimmer"
                aria-hidden
              />
            ))}
          </div>
        ) : trainees.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No trainees yet"
            description="Add trainees from the Team view to track their apprenticeship here."
            action={
              <PremiumButton
                size="sm"
                variant="outline"
                onClick={() => go("team")}
              >
                Go to Team <ArrowRight className="w-3.5 h-3.5" />
              </PremiumButton>
            }
          />
        ) : (
          <>
            {/* Mobile: Select dropdown */}
            <div className="md:hidden">
              <Select
                value={activeTraineeId ?? undefined}
                onValueChange={(v) => go("progress", { id: v })}
              >
                <SelectTrigger className="w-full h-11 bg-white">
                  <SelectValue placeholder="Choose a trainee…" />
                </SelectTrigger>
                <SelectContent>
                  {trainees.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop: chips row */}
            <div className="hidden md:flex gap-3 overflow-x-auto pb-1">
              {trainees.map((t) => {
                const active = t.id === activeTraineeId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => go("progress", { id: t.id })}
                    aria-pressed={active}
                    className={cn(
                      "group shrink-0 flex items-center gap-3 rounded-xl border px-3 py-2 transition-all duration-200",
                      active
                        ? "bg-gradient-to-br from-[#800020] to-[#6b0018] border-[#6b0018] text-white elevate-burgundy"
                        : "bg-white border-[#E7E5E4] text-[#1C1917] hover:border-[#800020]/30 hover:bg-[#faf8f5] elevate-sm lift"
                    )}
                  >
                    <span
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center font-display font-semibold text-sm shrink-0",
                        active
                          ? "bg-white/15 text-white"
                          : "bg-gradient-to-br text-white " +
                            gradientFor(t.fullName)
                      )}
                    >
                      {initialOf(t.fullName)}
                    </span>
                    <span className="text-left">
                      <span className="block text-sm font-medium leading-tight">
                        {t.fullName}
                      </span>
                      <span
                        className={cn(
                          "block text-[10px] uppercase tracking-[0.16em]",
                          active ? "text-white/70" : "text-stone-400"
                        )}
                      >
                        Trainee
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>

      {/* Selected trainee body */}
      {activeTraineeId && selectedTrainee ? (
        <SelectedTraineeHeader
          trainee={selectedTrainee}
          onClear={() => go("progress", { id: null })}
        />
      ) : null}
      {activeTraineeId ? (
        <ProgressBody
          traineeId={activeTraineeId}
          viewerRole="owner"
          mentorId={user?.id}
        />
      ) : (
        !usersQ.isLoading &&
        trainees.length > 0 && (
          <SectionCard>
            <EmptyState
              icon={GraduationCap}
              title="Pick a trainee to begin"
              description="Choose an apprentice above to review their skills, training log, tasks and contributions."
            />
          </SectionCard>
        )
      )}
    </div>
  );
}

function SelectedTraineeHeader({
  trainee,
  onClear,
}: {
  trainee: User;
  onClear: () => void;
}) {
  return (
    <div className="surface-premium border border-[#E7E5E4] rounded-lg elevate-sm lift p-5 mb-6 flex items-center gap-4 animate-fade-in-up">
      <div
        className={cn(
          "w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-display font-semibold text-xl shrink-0 shadow-sm",
          gradientFor(trainee.fullName)
        )}
        aria-hidden
      >
        {initialOf(trainee.fullName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-display font-semibold text-[#1C1917] text-xl leading-tight">
            {trainee.fullName}
          </h2>
          <StatusBadge status="Trainee" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
          {trainee.email && (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {trainee.email}
            </span>
          )}
          {trainee.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> {trainee.phone}
            </span>
          )}
        </div>
      </div>
      <PremiumButton
        size="sm"
        variant="ghost"
        onClick={onClear}
        className="hidden sm:inline-flex"
      >
        Change trainee
      </PremiumButton>
    </div>
  );
}

/* ===================== Shared progress body ===================== */

function ProgressBody({
  traineeId,
  viewerRole,
  mentorId,
}: {
  traineeId: string;
  viewerRole: "trainee" | "owner";
  mentorId?: string;
}) {
  const qc = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);

  // Training logs for this trainee.
  const logsQ = useQuery<TrainingLog[]>({
    queryKey: ["training-logs", traineeId],
    queryFn: () =>
      apiGet<TrainingLog[]>(`/api/training-logs?traineeId=${traineeId}`),
  });

  // Tasks for this trainee.
  const tasksQ = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => apiGet<Task[]>("/api/tasks"),
  });

  // Orders for this trainee (assignedStaffId).
  const ordersQ = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/api/orders"),
  });

  const logs = logsQ.data ?? [];

  const stats = useMemo(() => {
    const total = logs.length;
    const proficient = logs.filter((l) => l.status === "Proficient").length;
    const practicing = logs.filter((l) => l.status === "Practicing").length;
    const learning = logs.filter((l) => l.status === "Learning").length;
    return { total, proficient, practicing, learning };
  }, [logs]);

  // Group logs by skill for the mastery overview.
  const skillGroups = useMemo(() => {
    const map = new Map<
      string,
      { skill: string; logs: TrainingLog[]; latest: TrainingLog }
    >();
    for (const log of logs) {
      const skill = log.skill?.trim() || "General";
      const existing = map.get(skill);
      if (!existing) {
        map.set(skill, { skill, logs: [log], latest: log });
      } else {
        existing.logs.push(log);
        // logs come newest-first from the API (date desc); keep latest as the first seen
        // (which is the most recent by date).
        if (
          new Date(log.date).getTime() > new Date(existing.latest.date).getTime()
        ) {
          existing.latest = log;
        }
      }
    }
    // Sort skills by latest entry date desc.
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.latest.date).getTime() - new Date(a.latest.date).getTime()
    );
  }, [logs]);

  const myTasks = useMemo(
    () =>
      (tasksQ.data ?? [])
        .filter((t) => t.staffId === traineeId)
        .sort((a, b) => {
          // Pending first, then by due date asc.
          const aDone = a.status === "Done" ? 1 : 0;
          const bDone = b.status === "Done" ? 1 : 0;
          if (aDone !== bDone) return aDone - bDone;
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return ad - bd;
        }),
    [tasksQ.data, traineeId]
  );

  const myOrders = useMemo(
    () =>
      (ordersQ.data ?? [])
        .filter((o) => o.assignedStaffId === traineeId)
        .sort(
          (a, b) =>
            new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
        )
        .slice(0, 8),
    [ordersQ.data, traineeId]
  );

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["training-logs", traineeId] });
    qc.invalidateQueries({ queryKey: ["training-logs"] });
  };

  return (
    <>
      {/* Premium stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PremiumMetric
          label="Total Logs"
          value={<AnimatedNumber value={stats.total} />}
          icon={GraduationCap}
          accent
        />
        <PremiumMetric
          label="Proficient"
          value={<AnimatedNumber value={stats.proficient} />}
          icon={Sparkles}
        />
        <PremiumMetric
          label="Practicing"
          value={<AnimatedNumber value={stats.practicing} />}
          icon={Scissors}
        />
        <PremiumMetric
          label="Learning"
          value={<AnimatedNumber value={stats.learning} />}
          icon={GraduationCap}
        />
      </div>

      {/* Skills mastery overview */}
      <div className="mb-6">
        <SkillMasteryCard
          skillGroups={skillGroups}
          isLoading={logsQ.isLoading}
        />
      </div>

      {/* Training log timeline */}
      <div className="mb-6">
        <SectionCard
          title="Training log"
          bodyClassName="p-0"
          action={
            <PremiumButton size="sm" onClick={() => setLogOpen(true)}>
              <Plus className="w-4 h-4" />
              {viewerRole === "trainee" ? "Log new learning" : "Log for trainee"}
            </PremiumButton>
          }
        >
          {logsQ.isLoading ? (
            <SkeletonList rows={4} />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No log entries yet"
              description={
                viewerRole === "trainee"
                  ? "Log your first learning to start tracking your skill journey."
                  : "Log the first learning entry for this trainee."
              }
              action={
                <PremiumButton size="sm" onClick={() => setLogOpen(true)}>
                  <Plus className="w-4 h-4" />{" "}
                  {viewerRole === "trainee"
                    ? "Log new learning"
                    : "Log for trainee"}
                </PremiumButton>
              }
            />
          ) : (
            <div className="divide-y divide-[#E7E5E4]/70">
              {logs.map((log, idx) => (
                <TrainingLogRow
                  key={log.id}
                  log={log}
                  index={idx}
                  canEdit
                  onInvalidated={invalidateAll}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* My tasks */}
      <div className="mb-6">
        <MyTasksCard tasks={myTasks} isLoading={tasksQ.isLoading} />
      </div>

      {/* Orders contributed */}
      <div className="mb-2">
        <OrdersContributedCard orders={myOrders} isLoading={ordersQ.isLoading} />
      </div>

      {/* Log dialog */}
      <LogDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        traineeId={traineeId}
        mentorId={viewerRole === "owner" ? mentorId : undefined}
        onDone={invalidateAll}
      />
    </>
  );
}

/* ======================= Skill mastery card ======================= */

function SkillMasteryCard({
  skillGroups,
  isLoading,
}: {
  skillGroups: {
    skill: string;
    logs: TrainingLog[];
    latest: TrainingLog;
  }[];
  isLoading: boolean;
}) {
  return (
    <SectionCard title="Skill mastery" bodyClassName="p-0">
      {isLoading ? (
        <SkeletonList rows={3} />
      ) : skillGroups.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No skills logged yet"
          description="Once training entries are logged, this overview groups them by skill."
        />
      ) : (
        <ul className="divide-y divide-[#E7E5E4]/70">
          {skillGroups.map((group, idx) => {
            const proficientCount = group.logs.filter(
              (l) => l.status === "Proficient"
            ).length;
            const pct = Math.round(
              (proficientCount / group.logs.length) * 100
            );
            return (
              <li
                key={group.skill}
                className="flex items-center gap-4 px-5 py-4 hover:bg-[#faf8f5] transition-colors animate-fade-in-up"
                style={{ animationDelay: `${Math.min(idx, 8) * 50}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[#1C1917]">
                      {group.skill}
                    </span>
                    <StatusBadge status={group.latest.status} />
                    <span className="text-[11px] text-stone-400 tabular-nums">
                      {group.logs.length}{" "}
                      {group.logs.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    {STATUS_HINT[group.latest.status]}
                  </p>
                  {/* Progress hint bar */}
                  <div className="mt-2 h-1 w-full max-w-[220px] rounded-full bg-[#E7E5E4]/80 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#800020] to-[#6b0018] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                    Latest
                  </div>
                  <div className="text-xs text-stone-500 tabular-nums">
                    {shortDate(group.latest.date)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

/* ===================== Training log timeline row ===================== */

function TrainingLogRow({
  log,
  index,
  canEdit,
  onInvalidated,
}: {
  log: TrainingLog;
  index: number;
  canEdit: boolean;
  onInvalidated: () => void;
}) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const patchMut = useMutation({
    mutationFn: (status: TrainingStatus) =>
      apiPatch<TrainingLog>(`/api/training-logs/${log.id}`, { status }),
    onSuccess: () => {
      toast.success("Training log updated.");
      onInvalidated();
    },
    onError: (e: Error) => toast.error(e.message || "Could not update log."),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiDelete(`/api/training-logs/${log.id}`),
    onSuccess: () => {
      toast.success("Training log deleted.");
      onInvalidated();
      qc.invalidateQueries({ queryKey: ["training-logs"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete log."),
  });

  return (
    <div
      className="group px-5 py-4 hover:bg-[#faf8f5] transition-colors animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 10) * 60}ms` }}
    >
      <div className="flex items-start gap-4">
        {/* Date column */}
        <div className="shrink-0 w-16 text-center pt-0.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
            {new Date(log.date).toLocaleDateString("en-GB", {
              month: "short",
            })}
          </div>
          <div className="font-display font-semibold text-[#1C1917] text-lg leading-none tabular-nums">
            {new Date(log.date).getDate()}
          </div>
          <div className="text-[10px] text-stone-400 tabular-nums mt-0.5">
            {new Date(log.date).getFullYear()}
          </div>
        </div>

        <Separator orientation="vertical" className="h-16 bg-[#E7E5E4]/70" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {log.skill && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#800020] bg-[#800020]/8 border border-[#800020]/15 px-1.5 py-0.5 rounded-md">
                <Scissors className="w-3 h-3" /> {log.skill}
              </span>
            )}
            <span className="font-medium text-[#1C1917]">{log.title}</span>
          </div>
          {log.note && (
            <p className="text-xs text-stone-500 mt-1.5 whitespace-pre-wrap leading-relaxed">
              {log.note}
            </p>
          )}
          {log.mentor && (
            <p className="text-[11px] text-stone-400 mt-2 inline-flex items-center gap-1.5">
              <GraduationCap className="w-3 h-3" /> with {log.mentor.fullName}
            </p>
          )}
        </div>

        {/* Actions column */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {canEdit ? (
            <Select
              value={log.status}
              onValueChange={(v) =>
                patchMut.mutate(v as TrainingStatus)
              }
              disabled={patchMut.isPending}
            >
              <SelectTrigger
                size="sm"
                className="h-7 w-[120px] text-[11px] bg-white"
                aria-label="Update status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRAINING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <StatusBadge status={log.status} />
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              aria-label="Delete log entry"
              className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-7 h-7 rounded-md text-stone-400 hover:text-[#b91c1c] hover:bg-[#b91c1c]/8 focus:opacity-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this log entry?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{log.title}&rdquo; logged on {formatDate(log.date)} will be
              permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#b91c1c] text-white hover:bg-[#991b1b]"
              onClick={() => deleteMut.mutate()}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ========================= My tasks card ========================= */

function MyTasksCard({
  tasks,
  isLoading,
}: {
  tasks: Task[];
  isLoading: boolean;
}) {
  const { go } = useNav();
  return (
    <SectionCard title="My tasks" bodyClassName="p-0">
      {isLoading ? (
        <SkeletonList rows={3} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks assigned to you"
          description="When the atelier assigns you a task, it will appear here."
        />
      ) : (
        <ul className="divide-y divide-[#E7E5E4]/70">
          {tasks.map((task) => {
            const overdue =
              task.status !== "Done" &&
              task.dueDate &&
              isOverdue(task.dueDate);
            return (
              <li
                key={task.id}
                className="px-5 py-3.5 flex items-center gap-4 hover:bg-[#faf8f5] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[#1C1917] text-sm">
                      {task.title}
                    </span>
                    {task.priority && (
                      <StatusBadge status={task.priority} />
                    )}
                  </div>
                  {task.order?.customer && (
                    <p className="text-xs text-stone-400 mt-0.5 truncate">
                      {task.order.customer.name} ·{" "}
                      {task.order.garmentDesign}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  {task.dueDate && (
                    <span
                      className={cn(
                        "text-[11px] tabular-nums inline-flex items-center gap-1",
                        overdue ? "text-[#b91c1c] font-medium" : "text-stone-500"
                      )}
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      {shortDate(task.dueDate)}
                    </span>
                  )}
                  <StatusBadge status={task.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

/* ===================== Orders contributed card ===================== */

function OrdersContributedCard({
  orders,
  isLoading,
}: {
  orders: Order[];
  isLoading: boolean;
}) {
  const { go } = useNav();

  if (isLoading) {
    return (
      <SectionCard title="Orders I've contributed to" bodyClassName="p-0">
        <SkeletonList rows={3} />
      </SectionCard>
    );
  }
  if (orders.length === 0) {
    return (
      <SectionCard title="Orders I've contributed to" bodyClassName="p-0">
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="Orders you've worked on will be tracked here."
        />
      </SectionCard>
    );
  }
  return (
    <SectionCard
      title="Orders I've contributed to"
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-[#E7E5E4]/70">
        {orders.map((order) => (
          <li key={order.id}>
            <button
              type="button"
              onClick={() => go("order", { id: order.id })}
              className="w-full text-left px-5 py-3.5 flex items-center gap-4 hover:bg-[#faf8f5] transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[#1C1917] text-sm">
                    {order.garmentDesign}
                  </span>
                  {order.customer && (
                    <span className="text-xs text-stone-400">
                      · {order.customer.name}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5 tabular-nums">
                  {shortDate(order.orderDate)}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <span className="text-sm font-medium text-[#1C1917] tabular-nums">
                  {formatCurrency(order.sellingPrice)}
                </span>
                <StatusBadge status={order.status} />
                <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-[#800020] transition-colors" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/* ========================== Log dialog ========================== */

function LogDialog({
  open,
  onOpenChange,
  traineeId,
  mentorId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  traineeId: string;
  mentorId?: string;
  onDone: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Remount the form on each open so fields reset to defaults. */}
        {open ? (
          <LogForm
            key="log-form"
            traineeId={traineeId}
            mentorId={mentorId}
            onDone={onDone}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LogForm({
  traineeId,
  mentorId,
  onDone,
  onCancel,
}: {
  traineeId: string;
  mentorId?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [skill, setSkill] = useState<string>("Pattern drafting");
  const [customSkill, setCustomSkill] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<TrainingStatus>("Learning");
  const [date, setDate] = useState<string>(todayISO());

  const createMut = useMutation({
    mutationFn: () => {
      const finalSkill =
        skill === "Other" ? customSkill.trim() || "Other" : skill;
      return apiPost<TrainingLog>("/api/training-logs", {
        traineeId,
        mentorId: mentorId ?? null,
        skill: finalSkill,
        title: title.trim(),
        note: note.trim() || null,
        status,
        date,
      });
    },
    onSuccess: () => {
      toast.success("Training log added.");
      onDone();
      onCancel();
    },
    onError: (e: Error) =>
      toast.error(e.message || "Could not add training log."),
  });

  const finalSkillIsOther = skill === "Other";
  const titleValid = title.trim().length > 0;
  const canSubmit = titleValid && !createMut.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Log a training entry</DialogTitle>
      </DialogHeader>

      <div className="grid gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
              Skill
            </Label>
            <Select value={skill} onValueChange={setSkill}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_SKILLS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as TrainingStatus)}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRAINING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {finalSkillIsOther && (
          <div className="grid gap-1.5">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
              Skill name
            </Label>
            <Input
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              placeholder="e.g. French seams"
              className="bg-white"
            />
          </div>
        )}

        <div className="grid gap-1.5">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Title <span className="text-[#800020]">*</span>
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Practised princess seam bodice"
            className="bg-white"
          />
        </div>

        <div className="grid gap-1.5">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Note
          </Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you learn or struggle with?"
            rows={3}
            className="bg-white resize-none"
          />
        </div>

        <div className="grid gap-1.5">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Date
          </Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-white"
          />
        </div>
      </div>

      <DialogFooter>
        <PremiumButton
          variant="outline"
          onClick={onCancel}
          disabled={createMut.isPending}
        >
          Cancel
        </PremiumButton>
        <PremiumButton
          onClick={() => createMut.mutate()}
          loading={createMut.isPending}
          disabled={!canSubmit}
        >
          <Plus className="w-4 h-4" /> Add entry
        </PremiumButton>
      </DialogFooter>
    </>
  );
}
