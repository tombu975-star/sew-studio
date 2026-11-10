import type { CompetencyUnit, Task, TrainingProgram } from "@/lib/types";

/** A unit counts as passed when the average of its graded assignments reaches this. */
export const PASS_MARK = 60;

export type UnitStatus = "not-started" | "in-progress" | "needs-work" | "competent";

export const UNIT_STATUS_LABEL: Record<UnitStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  "needs-work": "Needs more practice",
  competent: "Competent",
};

export interface UnitProgress {
  unit: CompetencyUnit;
  tasks: Task[];
  total: number;
  done: number;
  graded: number;
  /** Average of graded assignments, 0-100, or null when nothing is graded yet. */
  avgPct: number | null;
  status: UnitStatus;
  /** Assignments finished out of assignments set (0-100). */
  completionPct: number;
}

export function averagePct(tasks: Task[]): number | null {
  const graded = tasks.filter((t) => t.score != null && t.maxScore);
  if (!graded.length) return null;
  return Math.round(
    graded.reduce((s, t) => s + ((t.score ?? 0) / (t.maxScore ?? 1)) * 100, 0) / graded.length
  );
}

export function unitProgress(unit: CompetencyUnit, allTasks: Task[]): UnitProgress {
  const tasks = allTasks.filter((t) => t.competencyUnitId === unit.id);
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "Done").length;
  const graded = tasks.filter((t) => t.score != null && t.maxScore).length;
  const avgPct = averagePct(tasks);

  let status: UnitStatus = "not-started";
  if (total > 0) {
    const everythingAssessed = done === total && graded === total;
    if (everythingAssessed) {
      status = (avgPct ?? 0) >= PASS_MARK ? "competent" : "needs-work";
    } else if (done > 0 || graded > 0 || tasks.some((t) => t.status === "In Progress")) {
      status = "in-progress";
    }
  }
  return {
    unit,
    tasks,
    total,
    done,
    graded,
    avgPct,
    status,
    completionPct: total ? Math.round((done / total) * 100) : 0,
  };
}

export interface ProgramProgress {
  units: UnitProgress[];
  competent: number;
  inProgress: number;
  totalUnits: number;
  /** Units passed out of units in the programme (0-100). */
  completionPct: number;
  assignmentsDone: number;
  assignmentsTotal: number;
  hoursTotal: number;
  hoursCompetent: number;
  /** Where to carry on: the first unit not yet passed, preferring ones with open work. */
  next: UnitProgress | null;
  /** Soonest-due assignment still open in this programme. */
  nextDue: Task | null;
}

export function programProgress(program: TrainingProgram, allTasks: Task[]): ProgramProgress {
  const units = program.units
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((u) => unitProgress(u, allTasks));

  const competent = units.filter((u) => u.status === "competent").length;
  const inProgress = units.filter((u) => u.status === "in-progress").length;
  const open = units.filter((u) => u.status !== "competent");
  const next =
    open.find((u) => u.status === "in-progress") ??
    open.find((u) => u.status === "needs-work") ??
    open[0] ??
    null;

  const programTasks = units.flatMap((u) => u.tasks);
  const openTasks = programTasks
    .filter((t) => t.status !== "Done")
    .sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return ad - bd;
    });

  return {
    units,
    competent,
    inProgress,
    totalUnits: units.length,
    completionPct: units.length ? Math.round((competent / units.length) * 100) : 0,
    assignmentsDone: programTasks.filter((t) => t.status === "Done").length,
    assignmentsTotal: programTasks.length,
    hoursTotal: units.reduce((s, u) => s + (u.unit.nominalHours ?? 0), 0),
    hoursCompetent: units
      .filter((u) => u.status === "competent")
      .reduce((s, u) => s + (u.unit.nominalHours ?? 0), 0),
    next,
    nextDue: openTasks[0] ?? null,
  };
}

/** Weeks since training started, capped for display. */
export function weeksSince(startedAt?: string | null): number {
  if (!startedAt) return 0;
  const ms = Date.now() - new Date(startedAt).getTime();
  return ms > 0 ? Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) : 0;
}

export function splitLines(text: string | null | undefined): string[] {
  return (text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
