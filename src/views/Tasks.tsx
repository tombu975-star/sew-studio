"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  AlertCircle,
  CalendarDays,
  Link2,
  ListTodo,
  Loader2,
  CheckCheck,
  KanbanSquare,
  GraduationCap,
  Star,
  CheckSquare,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumMetric } from "@/components/atelier/PremiumMetric";
import { AnimatedNumber } from "@/components/atelier/AnimatedNumber";
import {
  EmptyState,
  SkeletonCard,
} from "@/components/atelier/EmptyState";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { isOverdue, PRIORITY_LEVELS, shortDate, todayISO } from "@/lib/format";
import type { Order, Task, User } from "@/lib/types";
import { useNav } from "@/stores/nav";
import { useAuth } from "@/stores/auth";
import { useRole } from "@/stores/role";
import { cn } from "@/lib/utils";

interface TaskWithRelations extends Task {
  order?: (Order & { customer: Order["customer"] }) | null;
  staff?: User | null;
}

const COLUMNS = ["To Do", "In Progress", "Done"] as const;
type ColumnStatus = (typeof COLUMNS)[number];

const PRIORITY_FILTER_OPTIONS = ["All Priority", ...PRIORITY_LEVELS] as const;

const COLUMN_ICON: Record<ColumnStatus, React.ComponentType<{ className?: string }>> = {
  "To Do": ListTodo,
  "In Progress": Loader2,
  Done: CheckCheck,
};

// ---------------------------------------------------------------------------
// Grade helpers
// ---------------------------------------------------------------------------

function scorePercent(score?: number | null, max?: number | null): number | null {
  if (score == null || max == null || max === 0) return null;
  return (score / max) * 100;
}

function letterGrade(pct: number): string {
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

function pctTone(pct: number | null): "emerald" | "amber" | "orange" | "muted" {
  if (pct == null) return "muted";
  if (pct >= 80) return "emerald";
  if (pct >= 60) return "amber";
  return "orange";
}

const TONE_BADGE: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  muted: "bg-stone-100 text-stone-600 border-stone-200",
};

const TONE_DOT: Record<string, string> = {
  emerald: "bg-emerald-600",
  amber: "bg-amber-600",
  orange: "bg-orange-600",
  muted: "bg-stone-400",
};

/** Small pill showing "18/20" colored by percentage. */
function ScoreBadge({
  score,
  max,
  className,
}: {
  score: number;
  max: number;
  className?: string;
}) {
  const pct = scorePercent(score, max);
  const tone = pctTone(pct);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded-md tabular-nums",
        TONE_BADGE[tone],
        className
      )}
    >
      <Star className="w-3 h-3" />
      {score}/{max}
    </span>
  );
}

/** Letter grade pill (A/B/C/D/F) colored by percentage. */
function LetterGradeBadge({ pct }: { pct: number }) {
  const tone = pctTone(pct);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide border rounded-md",
        TONE_BADGE[tone]
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", TONE_DOT[tone])} />
      {letterGrade(pct)}
    </span>
  );
}

// ---------------------------------------------------------------------------

export default function Tasks() {
  const go = useNav((s) => s.go);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isTrainee = useRole((s) => s.isTrainee);
  const isStaff = useRole((s) => s.isStaff);
  const isTrainer = useRole((s) => s.isTrainer);
  const isOwner = useRole((s) => s.isOwner);

  const traineeMode = isTrainee();
  const graderMode = isTrainer() || isOwner();
  // Staff (non-trainee) keeps existing behaviour — their own tasks, can change status.
  const staffMode = isStaff() && !traineeMode;
  // Trainees cannot create tasks; everyone else with access can.
  const canCreate = !traineeMode;
  // Trainees are read-only (status set by mentor). Everyone else can move tasks.
  const canChangeStatus = !traineeMode;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [gradeDialogTask, setGradeDialogTask] = useState<TaskWithRelations | null>(null);
  const [staffFilter, setStaffFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All Priority");

  const { data: tasks = [], isLoading, isError } = useQuery<TaskWithRelations[]>({
    queryKey: ["tasks"],
    queryFn: () => apiGet<TaskWithRelations[]>("/api/tasks"),
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/api/orders"),
  });

  // Role-based scoping — what tasks this viewer should see.
  const scopedTasks = useMemo(() => {
    if (traineeMode) {
      // Trainee: ONLY their own assignments.
      return tasks.filter((t) => t.staffId === user?.id);
    }
    if (graderMode) {
      // Trainer/Owner: ALL tasks assigned to trainees (filter staff?.role === 'trainee').
      return tasks.filter((t) => t.staff?.role === "trainee");
    }
    // Staff (non-trainee): keep existing — their own tasks.
    return tasks.filter((t) => t.staffId === user?.id);
  }, [tasks, traineeMode, graderMode, user?.id]);

  const staffOptions = useMemo(() => {
    const map = new Map<string, User>();
    for (const t of scopedTasks) {
      if (t.staff) map.set(t.staff.id, t.staff);
    }
    return Array.from(map.values());
  }, [scopedTasks]);

  const filtered = useMemo(() => {
    return scopedTasks.filter((t) => {
      if (staffFilter !== "All") {
        if (staffFilter === "Unassigned" && t.staff) return false;
        if (staffFilter !== "Unassigned" && t.staff?.id !== staffFilter)
          return false;
      }
      if (priorityFilter !== "All Priority" && t.priority !== priorityFilter)
        return false;
      return true;
    });
  }, [scopedTasks, staffFilter, priorityFilter]);

  const grouped = useMemo(() => {
    const map: Record<ColumnStatus, TaskWithRelations[]> = {
      "To Do": [],
      "In Progress": [],
      Done: [],
    };
    for (const t of filtered) {
      const status = (COLUMNS as readonly string[]).includes(t.status)
        ? (t.status as ColumnStatus)
        : "To Do";
      map[status].push(t);
    }
    return map;
  }, [filtered]);

  const stats = useMemo(
    () => ({
      todo: grouped["To Do"].length,
      inProgress: grouped["In Progress"].length,
      done: grouped.Done.length,
    }),
    [grouped]
  );

  // Grade summary
  const gradedTasks = useMemo(
    () => filtered.filter((t) => t.score != null && t.maxScore != null),
    [filtered]
  );
  const doneCount = filtered.filter((t) => t.status === "Done").length;
  const avgPct = useMemo(() => {
    if (gradedTasks.length === 0) return null;
    const sum = gradedTasks.reduce(
      (acc, t) => acc + ((t.score ?? 0) / (t.maxScore ?? 1)) * 100,
      0
    );
    return sum / gradedTasks.length;
  }, [gradedTasks]);

  const createMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      priority: string;
      dueDate?: string;
      orderId?: string;
      notes?: string;
    }) => apiPost<Task>("/api/tasks", payload),
    onSuccess: () => {
      toast.success("Task created");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch<Task>(`/api/tasks/${id}`, { status }),
    onSuccess: (task) => {
      toast.success(`Task moved to ${task.status}`);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const gradeMutation = useMutation({
    mutationFn: ({
      id,
      maxScore,
      score,
      feedback,
    }: {
      id: string;
      maxScore: number;
      score: number;
      feedback?: string;
    }) =>
      apiPatch<Task>(`/api/tasks/${id}`, {
        maxScore,
        score,
        feedback,
        gradedById: user?.id,
      }),
    onSuccess: (task) => {
      toast.success("Grade saved", {
        description: `${task.title} — ${task.score}/${task.maxScore}`,
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setGradeDialogTask(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const showFilters = !traineeMode && staffOptions.length > 0;

  const subtitle = traineeMode
    ? "Your practice assignments and graded work from the atelier."
    : graderMode
    ? "Trainee assignments across the studio. Grade completed work to track progress."
    : "Everything the atelier needs to do.";

  return (
    <div className="p-5 md:p-8 max-w-[1300px] mx-auto w-full">
      <PageHeader
        eyebrow={
          traineeMode
            ? "My assignments"
            : graderMode
            ? "Trainee assignments"
            : "Studio workflow"
        }
        eyebrowIcon={traineeMode || graderMode ? GraduationCap : KanbanSquare}
        title="Tasks"
        subtitle={subtitle}
        actions={
          canCreate ? (
            <PremiumButton onClick={() => setDialogOpen(true)} size="md">
              <Plus className="w-4 h-4" />
              New Task
            </PremiumButton>
          ) : undefined
        }
      />

      {/* Premium stat strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <PremiumMetric
          label="To Do"
          value={<AnimatedNumber value={stats.todo} />}
          icon={ListTodo}
          accent
        />
        <PremiumMetric
          label="In Progress"
          value={<AnimatedNumber value={stats.inProgress} />}
          icon={Loader2}
        />
        <PremiumMetric
          label="Done"
          value={<AnimatedNumber value={stats.done} />}
          icon={CheckCheck}
        />
      </div>

      {/* Grade summary — trainee + trainer/owner modes */}
      {(traineeMode || graderMode) && (
        <SectionCard
          className="mb-5"
          bodyClassName="py-4"
          title={traineeMode ? "Your grades" : "Trainee grading"}
          action={
            avgPct != null ? (
              <LetterGradeBadge pct={avgPct} />
            ) : (
              <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                No grades yet
              </span>
            )
          }
        >
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
                {traineeMode ? "Your average" : "Studio average"}
              </span>
              <div className="font-display font-semibold text-[#1C1917] leading-none tabular-nums flex items-baseline gap-1">
                {avgPct != null ? (
                  <>
                    <span
                      style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}
                      className={cn(
                        pctTone(avgPct) === "emerald" && "text-emerald-700",
                        pctTone(avgPct) === "amber" && "text-amber-700",
                        pctTone(avgPct) === "orange" && "text-orange-700",
                        pctTone(avgPct) === "muted" && "text-stone-700"
                      )}
                    >
                      <AnimatedNumber value={Math.round(avgPct)} />
                    </span>
                    <span className="text-lg text-stone-400">%</span>
                  </>
                ) : (
                  <span className="text-base text-stone-400 font-sans font-normal">
                    No graded work yet
                  </span>
                )}
              </div>
            </div>

            {graderMode && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
                  Graded
                </span>
                <div className="font-display font-semibold text-[#1C1917] leading-none tabular-nums flex items-baseline gap-1.5">
                  <span style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
                    <AnimatedNumber value={gradedTasks.length} />
                  </span>
                  <span className="text-lg text-stone-400">
                    / <AnimatedNumber value={doneCount} /> tasks
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1 ml-auto">
              <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
                {traineeMode ? "Graded assignments" : "Graded assignments"}
              </span>
              <span className="text-2xl font-display font-semibold text-[#1C1917] tabular-nums">
                <AnimatedNumber value={gradedTasks.length} />
                <span className="text-sm text-stone-400 font-sans font-normal ml-1">
                  of {filtered.length}
                </span>
              </span>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Filter bar (trainees have no staff filter — they only see their own) */}
      {showFilters && (
        <SectionCard bodyClassName="py-3" className="mb-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
                {graderMode ? "Trainee" : "Staff"}
              </span>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger
                  className="w-[180px] h-8 bg-white"
                  aria-label="Filter by staff"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">
                    {graderMode ? "All Trainees" : "All Staff"}
                  </SelectItem>
                  {staffOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullName}
                    </SelectItem>
                  ))}
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
                Priority
              </span>
              <Select
                value={priorityFilter}
                onValueChange={setPriorityFilter}
              >
                <SelectTrigger
                  className="w-[160px] h-8 bg-white"
                  aria-label="Filter by priority"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_FILTER_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Board */}
      {isError ? (
        <SectionCard title="Error">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <AlertCircle className="w-4 h-4 text-[#800020]" />
            Could not load tasks. Please try again.
          </div>
        </SectionCard>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="h-72" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={traineeMode ? GraduationCap : ListTodo}
            title={
              traineeMode
                ? "No assignments yet"
                : graderMode
                ? "No trainee assignments"
                : "No tasks yet"
            }
            description={
              traineeMode
                ? "Your mentor will assign practice work and graded assignments here."
                : graderMode
                ? "Assign tasks to trainees to start tracking their grades."
                : "Create a new task to get started."
            }
            action={
              canCreate ? (
                <PremiumButton onClick={() => setDialogOpen(true)} size="sm">
                  <Plus className="w-4 h-4" />
                  New Task
                </PremiumButton>
              ) : undefined
            }
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const Icon = COLUMN_ICON[col];
            const count = grouped[col].length;
            return (
              <SectionCard
                key={col}
                bodyClassName="p-3 flex flex-col gap-2.5"
                title={col}
                action={
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5",
                        col === "To Do" && "text-[#800020]",
                        col === "In Progress" && "text-blue-600",
                        col === "Done" && "text-[#15803D]"
                      )}
                    />
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] text-[10px] font-semibold text-stone-600 tabular-nums">
                      {count}
                    </span>
                  </div>
                }
              >
                {grouped[col].length === 0 ? (
                  <EmptyState
                    className="py-8"
                    title={`No ${col.toLowerCase()} tasks`}
                    description={
                      col === "To Do"
                        ? "New assignments will appear here."
                        : "Tasks will appear here as they progress."
                    }
                  />
                ) : (
                  grouped[col].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(status) =>
                        statusMutation.mutate({ id: task.id, status })
                      }
                      onClick={() =>
                        task.orderId && go("order", { id: task.orderId })
                      }
                      canChangeStatus={canChangeStatus}
                      showGradeControl={graderMode}
                      onGrade={() => setGradeDialogTask(task)}
                      showStaff={!traineeMode}
                    />
                  ))
                )}
              </SectionCard>
            );
          })}
        </div>
      )}

      {canCreate && (
        <NewTaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          orders={orders}
          onSubmit={(payload) => createMutation.mutate(payload)}
          submitting={createMutation.isPending}
        />
      )}

      <GradeDialog
        task={gradeDialogTask}
        onOpenChange={(v) => !v && setGradeDialogTask(null)}
        onSubmit={(payload) =>
          gradeMutation.mutate({ id: gradeDialogTask!.id, ...payload })
        }
        submitting={gradeMutation.isPending}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function TaskCard({
  task,
  onStatusChange,
  onClick,
  canChangeStatus,
  showGradeControl,
  onGrade,
  showStaff,
}: {
  task: TaskWithRelations;
  onStatusChange: (status: string) => void;
  onClick: () => void;
  canChangeStatus: boolean;
  showGradeControl: boolean;
  onGrade: () => void;
  showStaff: boolean;
}) {
  const overdue =
    !!task.dueDate && isOverdue(task.dueDate) && task.status !== "Done";
  const garment = task.order?.garmentDesign;
  const customerName = task.order?.customer?.name;
  const staffName = task.staff?.fullName;
  const initial = staffName ? staffName.charAt(0).toUpperCase() : "?";

  const isGraded = task.score != null && task.maxScore != null;
  const isDone = task.status === "Done";
  const showAwaiting = isDone && !isGraded;

  return (
    <div className="rounded-lg bg-white border border-[#E7E5E4] p-3.5 elevate-sm lift flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={onClick}
          disabled={!task.orderId}
          className={cn(
            "text-left flex-1 min-w-0",
            task.orderId && "hover:underline"
          )}
        >
          <p className="text-sm font-medium text-[#1C1917] leading-snug">
            {task.title}
          </p>
        </button>
        <StatusBadge status={task.priority} />
      </div>

      {garment && (
        <button
          onClick={onClick}
          disabled={!task.orderId}
          className="text-left text-xs text-stone-500 truncate inline-flex items-center gap-1.5 hover:text-stone-700"
        >
          {task.orderId && <Link2 className="w-3 h-3 text-stone-400 shrink-0" />}
          <span className="truncate">
            {garment}
            {customerName ? ` · ${customerName}` : ""}
          </span>
        </button>
      )}

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2 min-w-0">
          {showStaff && staffName ? (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <span className="w-5 h-5 rounded-full bg-[#800020]/10 text-[#800020] text-[10px] font-semibold flex items-center justify-center shrink-0">
                {initial}
              </span>
              <span className="text-xs text-stone-500 truncate">
                {staffName}
              </span>
            </span>
          ) : !showStaff ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-stone-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#800020]/40" />
              Your assignment
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wide text-stone-400">
              Unassigned
            </span>
          )}
        </div>

        {task.dueDate && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] shrink-0",
              overdue ? "text-amber-700 font-medium" : "text-stone-500"
            )}
          >
            {overdue ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <CalendarDays className="w-3 h-3" />
            )}
            {shortDate(task.dueDate)}
          </span>
        )}
      </div>

      {/* Grading area — Done tasks show grade + feedback or "Awaiting grade". */}
      {isDone && isGraded && (
        <div className="rounded-md bg-[#800020]/4 border-l-2 border-[#800020]/30 pl-3 pr-2 py-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <ScoreBadge score={task.score!} max={task.maxScore!} />
            {task.gradedBy && (
              <span className="text-[10px] text-stone-500 tabular-nums">
                by {task.gradedBy.fullName}
                {task.gradedAt ? ` · ${shortDate(task.gradedAt)}` : ""}
              </span>
            )}
          </div>
          {task.feedback && (
            <p className="text-xs text-stone-600 italic leading-snug">
              &ldquo;{task.feedback}&rdquo;
            </p>
          )}
          {showGradeControl && (
            <PremiumButton
              size="sm"
              variant="outline"
              onClick={onGrade}
              className="self-start mt-0.5 h-7"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Re-grade
            </PremiumButton>
          )}
        </div>
      )}

      {showAwaiting && (
        <div
          className={cn(
            "flex items-center gap-2 pt-2 border-t border-[#E7E5E4]/70",
            showGradeControl && "justify-between"
          )}
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-500">
            <Clock className="w-3 h-3 text-amber-600" />
            Awaiting grade
          </span>
          {showGradeControl && (
            <PremiumButton
              size="sm"
              variant="outline"
              onClick={onGrade}
              className="h-7"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Grade
            </PremiumButton>
          )}
        </div>
      )}

      {/* Status row */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E7E5E4]/70">
        <span className="text-[10px] uppercase tracking-[0.16em] text-stone-400">
          Status
        </span>
        {canChangeStatus ? (
          <Select value={task.status} onValueChange={onStatusChange}>
            <SelectTrigger size="sm" className="h-7 w-[140px] text-xs bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLUMNS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <StatusBadge status={task.status} dot={false} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface NewTaskPayload {
  title: string;
  priority: string;
  dueDate?: string;
  orderId?: string;
  notes?: string;
}

function NewTaskDialog({
  open,
  onOpenChange,
  orders,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orders: Order[];
  onSubmit: (payload: NewTaskPayload) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("none");
  const [notes, setNotes] = useState<string>("");

  const reset = () => {
    setTitle("");
    setPriority("Medium");
    setDueDate("");
    setOrderId("none");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }
    const payload: NewTaskPayload = {
      title: title.trim(),
      priority,
    };
    if (dueDate) payload.dueDate = dueDate;
    if (orderId && orderId !== "none") payload.orderId = orderId;
    if (notes.trim()) payload.notes = notes.trim();
    onSubmit(payload);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setTimeout(reset, 150);
      }}
    >
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-[#1C1917]">
            New Task
          </DialogTitle>
          <DialogDescription>
            Capture a quick to-do. You can attach it to an existing order.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Source buttons for Akosua gown"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="task-priority" className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_LEVELS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                min={todayISO()}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="task-order">Linked Order</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger id="task-order" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="none">None — general task</SelectItem>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.garmentDesign}
                    {o.customer?.name ? ` · ${o.customer.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional details, links, supplier contacts…"
              rows={3}
            />
          </div>

          <DialogFooter>
            <PremiumButton
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </PremiumButton>
            <PremiumButton type="submit" loading={submitting}>
              Create Task
            </PremiumButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

interface GradePayload {
  maxScore: number;
  score: number;
  feedback?: string;
}

function GradeDialog({
  task,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  task: TaskWithRelations | null;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: GradePayload) => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={!!task} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-lg">
        {task && (
          <GradeForm
            key={task.id}
            task={task}
            submitting={submitting}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function GradeForm({
  task,
  onSubmit,
  onCancel,
  submitting,
}: {
  task: TaskWithRelations;
  onSubmit: (payload: GradePayload) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  // Lazy initializers — fields prefilled from the task (incl. already-graded tasks).
  // The parent uses `key={task.id}` so this component remounts per task.
  const [maxScore, setMaxScore] = useState<number>(
    () => (task.maxScore != null ? task.maxScore : 20)
  );
  const [score, setScore] = useState<number>(() => task.score ?? 0);
  const [feedback, setFeedback] = useState<string>(() => task.feedback ?? "");

  const safeMax = maxScore > 0 ? maxScore : 0;
  const pct = safeMax > 0 ? (score / safeMax) * 100 : 0;
  const valid =
    safeMax > 0 && Number.isFinite(score) && score >= 0 && score <= safeMax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (safeMax <= 0) {
      toast.error("Max score must be greater than 0");
      return;
    }
    if (score < 0 || score > safeMax) {
      toast.error(`Score must be between 0 and ${safeMax}`);
      return;
    }
    onSubmit({
      maxScore: safeMax,
      score,
      feedback: feedback.trim() || undefined,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-[#1C1917] flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#800020]/10 text-[#800020] flex items-center justify-center">
            <GraduationCap className="w-4 h-4" />
          </span>
          Grade assignment
        </DialogTitle>
        <DialogDescription className="text-stone-500">
          {task.title}
          {task.staff?.fullName ? ` · ${task.staff.fullName}` : ""}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="grade-max">Max score</Label>
            <Input
              id="grade-max"
              type="number"
              min={1}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              className="tabular-nums"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="grade-score">
              Score
              <span className="ml-1 text-[10px] font-normal text-stone-400">
                0 – {safeMax || "—"}
              </span>
            </Label>
            <Input
              id="grade-score"
              type="number"
              min={0}
              max={safeMax || undefined}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="tabular-nums"
            />
          </div>
        </div>

        {/* Live percentage + letter grade preview */}
        <div className="rounded-md bg-[#FBF9F7] border border-[#E7E5E4] px-3 py-2.5 flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Percentage · Grade
          </span>
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                pctTone(pct) === "emerald" && "text-emerald-700",
                pctTone(pct) === "amber" && "text-amber-700",
                pctTone(pct) === "orange" && "text-orange-700",
                pctTone(pct) === "muted" && "text-stone-500"
              )}
            >
              {safeMax > 0 ? `${pct.toFixed(0)}%` : "—"}
            </span>
            {safeMax > 0 && <LetterGradeBadge pct={pct} />}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="grade-feedback">Feedback</Label>
          <Textarea
            id="grade-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Constructive notes for the trainee…"
            rows={4}
          />
          <p className="text-[10px] text-stone-400">
            Visible to the trainee on their assignment card.
          </p>
        </div>

        <DialogFooter>
          <PremiumButton type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </PremiumButton>
          <PremiumButton
            type="submit"
            loading={submitting}
            disabled={!valid}
          >
            <CheckSquare className="w-4 h-4" />
            Save grade
          </PremiumButton>
        </DialogFooter>
      </form>
    </>
  );
}
