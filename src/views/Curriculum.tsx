"use client";

import { useMemo, useState } from "react";
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
  ChevronUp,
} from "lucide-react";

import { PageHeader } from "@/components/atelier/PageHeader";
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
import type { TrainingProgram, CompetencyUnit, User } from "@/lib/types";
import { useAuth } from "@/stores/auth";
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
        {required && <span className="text-[#2563EB]">*</span>}
      </Label>
      {children}
    </div>
  );
}

/* ============================== Main view ============================== */

export default function Curriculum() {
  const { user } = useAuth();
  const role = useRole();
  const canManage = role.isOwner() || role.isTrainer();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<TrainingProgram | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingProgram | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const programsQ = useQuery<TrainingProgram[]>({
    queryKey: ["training-programs"],
    queryFn: () => apiGet<TrainingProgram[]>("/api/training-programs"),
  });

  // Trainees only see the curriculum they're enrolled in.
  const usersQ = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiGet<User[]>("/api/users"),
    enabled: role.isTrainee(),
  });
  const myProgramId = useMemo(() => {
    if (!role.isTrainee() || !user) return null;
    const me = (usersQ.data ?? []).find((u) => u.id === user.id);
    return me?.programId ?? null;
  }, [role, user, usersQ.data]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/training-programs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-programs"] });
      toast.success("Training program deleted.");
      setDeleteTarget(null);
    },
    onError: (err: Error) =>
      toast.error("Could not delete program.", { description: err.message }),
  });

  const allPrograms = programsQ.data ?? [];
  const visiblePrograms = role.isTrainee()
    ? allPrograms.filter((p) => p.id === myProgramId)
    : allPrograms;

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto w-full">
      <PageHeader
        eyebrow={canManage ? "Training design" : "My training"}
        eyebrowIcon={BookOpen}
        title={canManage ? "Curriculum" : "My Curriculum"}
        subtitle={
          canManage
            ? "Design training programs by level — each with its own duration and units of competency, with learning outcomes and assessment criteria."
            : "The program you're enrolled in — what you'll cover, and what you'll be assessed on."
        }
        actions={
          canManage ? (
            <PremiumButton size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> New program
            </PremiumButton>
          ) : undefined
        }
      />

      {programsQ.isLoading ? (
        <SkeletonList rows={3} />
      ) : visiblePrograms.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={
            role.isTrainee()
              ? "You're not enrolled in a program yet"
              : "No training programs yet"
          }
          description={
            role.isTrainee()
              ? "Ask your trainer to enroll you in a training program."
              : "Create a program to define its level, duration, and units of competency."
          }
          action={
            canManage ? (
              <PremiumButton size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" /> New program
              </PremiumButton>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {visiblePrograms.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              canManage={canManage}
              expanded={expandedId === p.id}
              onToggle={() =>
                setExpandedId((cur) => (cur === p.id ? null : p.id))
              }
              onEdit={() => setEditProgram(p)}
              onDelete={() => setDeleteTarget(p)}
            />
          ))}
        </div>
      )}

      <ProgramFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />
      <ProgramFormDialog
        key={editProgram?.id ?? "edit-none"}
        open={!!editProgram}
        onOpenChange={(v) => !v && setEditProgram(null)}
        mode="edit"
        program={editProgram}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this training program?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?._count?.trainees
                ? `${deleteTarget._count.trainees} trainee(s) are enrolled — they'll just be unenrolled, their task history and grades are untouched.`
                : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-[#2563EB] hover:bg-[#1D4ED8]"
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
  canManage,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  program: TrainingProgram;
  canManage: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const totalHours = program.units.reduce(
    (sum, u) => sum + (u.nominalHours ?? 0),
    0,
  );

  return (
    <div className="surface-premium border border-[#E2E8F0] rounded-lg elevate-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-5 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg font-semibold text-[#0F172A]">
              {program.name}
            </h3>
            <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#2563EB] bg-[#2563EB]/8 px-2 py-0.5 rounded-full">
              {program.level}
            </span>
          </div>
          {program.description && (
            <p className="text-sm text-stone-500 mt-1.5 max-w-xl">
              {program.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-stone-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {program.durationWeeks} weeks
            </span>
            <span className="flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5" /> {program.units.length}{" "}
              unit{program.units.length === 1 ? "" : "s"}
              {totalHours ? ` · ${totalHours}h nominal` : ""}
            </span>
            {canManage && (
              <span className="flex items-center gap-1.5">
                <UsersIcon className="w-3.5 h-3.5" />{" "}
                {program._count?.trainees ?? 0} enrolled
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canManage && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 rounded-md hover:bg-[#EFF6FF] text-stone-400 hover:text-[#2563EB] transition"
                title="Edit program"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 rounded-md hover:bg-red-50 text-stone-400 hover:text-red-600 transition"
                title="Delete program"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#E2E8F0] bg-[#EFF6FF] p-5 space-y-3">
          {program.units.length === 0 ? (
            <p className="text-sm text-stone-400 italic">
              No units of competency added yet.
            </p>
          ) : (
            program.units
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((u) => <UnitCard key={u.id} unit={u} canManage={canManage} />)
          )}
          {canManage && (
            <PremiumButton
              size="sm"
              variant="outline"
              onClick={() => setAddUnitOpen(true)}
            >
              <Plus className="w-4 h-4" /> Add unit of competency
            </PremiumButton>
          )}
        </div>
      )}

      <UnitFormDialog
        open={addUnitOpen}
        onOpenChange={setAddUnitOpen}
        programId={program.id}
      />
    </div>
  );
}

function UnitCard({
  unit,
  canManage,
}: {
  unit: CompetencyUnit;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/api/competency-units/${unit.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-programs"] });
      toast.success("Unit removed.");
    },
    onError: (err: Error) =>
      toast.error("Could not remove unit.", { description: err.message }),
  });

  const outcomes = unit.learningOutcomes
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const criteria = unit.assessmentCriteria
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-md p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0F172A]">
            {unit.code ? <span className="text-stone-400">{unit.code} · </span> : null}
            {unit.title}
          </p>
          {unit.nominalHours != null && (
            <p className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {unit.nominalHours}h nominal
            </p>
          )}
        </div>
        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="p-1.5 rounded-md hover:bg-[#EFF6FF] text-stone-400 hover:text-[#2563EB] transition"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              className="p-1.5 rounded-md hover:bg-red-50 text-stone-400 hover:text-red-600 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {outcomes.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-stone-400 flex items-center gap-1.5 mb-1.5">
            <Target className="w-3 h-3" /> Learning outcomes
          </p>
          <ul className="space-y-1">
            {outcomes.map((o, i) => (
              <li key={i} className="text-sm text-stone-600 flex gap-2">
                <span className="text-[#2563EB] mt-0.5">•</span> {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      {criteria.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-stone-400 flex items-center gap-1.5 mb-1.5">
            <ListChecks className="w-3 h-3" /> Assessment criteria
          </p>
          <ul className="space-y-1">
            {criteria.map((c, i) => (
              <li key={i} className="text-sm text-stone-600 flex gap-2">
                <span className="text-[#2563EB] mt-0.5">•</span> {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <UnitFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        programId={unit.programId}
        unit={unit}
      />
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
              className="h-10 bg-white border-[#E2E8F0] rounded-md"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Level" required>
              <Input
                value={form.level}
                onChange={(e) => set("level", e.target.value)}
                placeholder="e.g. Beginner, NVTI Grade II, GTQF Level 3"
                className="h-10 bg-white border-[#E2E8F0] rounded-md"
              />
            </Field>
            <Field label="Duration (weeks)" required>
              <Input
                type="number"
                min="1"
                step="1"
                value={form.durationWeeks}
                onChange={(e) => set("durationWeeks", e.target.value)}
                className="h-10 bg-white border-[#E2E8F0] rounded-md tabular-nums"
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What this program covers and who it's for."
              className="bg-white border-[#E2E8F0] rounded-md min-h-[80px]"
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
                className="h-10 bg-white border-[#E2E8F0] rounded-md"
              />
            </Field>
            <Field label="Unit code">
              <Input
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="CU-01"
                className="h-10 bg-white border-[#E2E8F0] rounded-md"
              />
            </Field>
            <Field label="Nominal hrs">
              <Input
                type="number"
                min="0"
                value={form.nominalHours}
                onChange={(e) => set("nominalHours", e.target.value)}
                className="h-10 bg-white border-[#E2E8F0] rounded-md tabular-nums"
              />
            </Field>
          </div>
          <Field label="Learning outcomes" required>
            <Textarea
              value={form.learningOutcomes}
              onChange={(e) => set("learningOutcomes", e.target.value)}
              placeholder={"Draft a basic bodice block from measurements\nAdjust darts for fit"}
              className="bg-white border-[#E2E8F0] rounded-md min-h-[90px]"
            />
          </Field>
          <Field label="Assessment criteria" required>
            <Textarea
              value={form.assessmentCriteria}
              onChange={(e) => set("assessmentCriteria", e.target.value)}
              placeholder={"Block matches measurements within 0.5cm\nDarts sit correctly on the stand"}
              className="bg-white border-[#E2E8F0] rounded-md min-h-[90px]"
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
