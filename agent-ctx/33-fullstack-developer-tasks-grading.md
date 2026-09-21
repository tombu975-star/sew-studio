# Task ID: 33 — full-stack-developer (tasks grading)

## Task
Scope the Tasks view (`src/views/Tasks.tsx`) to assigned tasks + show grades + enable trainer/owner grading. Bound to PREMIUM REDESIGN CONTRACT + CONTRACT FOR GRADING + SCHOOL-PORTAL VIEWS in `/home/z/my-project/worklog.md`.

## What changed
Edited `src/views/Tasks.tsx` (single `"use client"` default export, ~1140 lines, inline sub-components).

### Role-based scoping
- `traineeMode = isTrainee()` → only tasks where `staffId === user.id`. NO New Task button. Status is read-only (StatusBadge, no Select). "Your assignment" pill instead of staff name.
- `staffMode = isStaff() && !traineeMode` → unchanged behavior (own tasks, can change status, no grading UI, no grade summary card).
- `graderMode = isTrainer() || isOwner()` → ALL tasks where `task.staff?.role === 'trainee'`. Can grade any Done task.
- `canCreate = !traineeMode`, `canChangeStatus = !traineeMode`.

### Grade summary (SectionCard, trainee + grader modes)
- Big AnimatedNumber % colored by percentage (emerald ≥80 / amber 60–79 / orange <60).
- Label switches: trainee → "Your average", grader → "Studio average".
- Grader-only extra metric: "Graded: X / Y tasks" (AnimatedNumber / AnimatedNumber).
- Right-aligned "Graded assignments: X of N" counter.
- Header action: LetterGradeBadge (A≥90, B≥80, C≥70, D≥60, F<60) or "No grades yet" muted pill.

### TaskCard grading area
- Done + graded → burgundy-tinted box (bg-[#800020]/4 + border-l-2 border-[#800020]/30) with ScoreBadge + gradedBy.fullName + gradedAt (shortDate) + italic feedback + (grader only) "Re-grade" outline PremiumButton (sm, GraduationCap).
- Done + not graded → "Awaiting grade" (Clock amber) + (grader only) "Grade" outline PremiumButton (sm, GraduationCap).
- Trainees see graded work + "Awaiting grade" with no grading buttons.
- Status row: Select for staff/grader; read-only StatusBadge for trainees.

### ScoreBadge
Small pill "18/20" with Star icon, tabular-nums, colored by percentage (emerald ≥80 / amber 60–79 / orange <60).

### GradeDialog
- Outer `GradeDialog` controls Dialog open state.
- Inner `GradeForm` keyed by `task.id` — useState lazy initializers prefilled from `task.maxScore ?? 20`, `task.score ?? 0`, `task.feedback ?? ""`. Avoids the `react-hooks/set-state-in-effect` lint rule.
- Fields: Max score (number, min 1, default 20), Score (number, 0–maxScore), Feedback (Textarea).
- Live preview row: percentage + LetterGradeBadge, tone-colored.
- Validation: maxScore > 0, 0 ≤ score ≤ maxScore. Toasts on invalid.
- Submit → `PATCH /api/tasks/[id]` `{ maxScore, score, feedback, gradedById: user.id }` → toast "Grade saved" + description "{title} — {score}/{maxScore}" + invalidate `['tasks']` + close.
- PremiumButton "Save grade" (loading, disabled when invalid) + ghost "Cancel".

### Kept
- 3-column kanban (To Do / In Progress / Done) with SectionCard columns + status-coloured icons + count pills.
- 3-up PremiumMetric stat strip (To Do / In Progress / Done) with AnimatedNumber + accent on first.
- Filter bar (hidden for trainees — they only see their own). Staff filter label switches to "Trainee" in grader mode.
- NewTaskDialog unchanged (still wired for staff/grader).
- PremiumMutation toast on status change + create + grade.
- SkeletonCard during loading, EmptyState for empties (column-level + whole-board, role-specific copy).

### Quality bar
- SectionCard everywhere with elevate-sm + lift; tabular-nums on all scores/percentages/counts; PremiumButton for all CTAs with loading states; animate-fade-in-up on PageHeader (built-in); SkeletonCard loaders; EmptyState for empties; responsive (grids collapse to 1-col on mobile); burgundy #800020 throughout (icons, tints, badges, buttons); sonner toasts for all mutations.

## Verification
- `bun run lint 2>&1 | tail -5` → `$ eslint .` (no errors, no warnings).
- `bunx tsc --noEmit` → zero errors in `src/views/Tasks.tsx` (remaining TS errors are in `upload/extracted/base44/*` legacy source — not mine).
- Dev log: clean compile in 9.4s, GET /api/tasks 200, no runtime errors.

## Imports
- `@/components/atelier/*`: PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState, SkeletonCard, PremiumButton, StatusBadge
- `@/components/ui/*`: Dialog (+ DialogContent/DialogDescription/DialogFooter/DialogHeader/DialogTitle), Input, Label, Textarea, Select (+ SelectContent/SelectItem/SelectTrigger/SelectValue)
- `@/lib/api`: apiGet, apiPatch, apiPost
- `@/lib/format`: isOverdue, PRIORITY_LEVELS, shortDate, todayISO
- `@/lib/types`: Order, Task, User
- `@/lib/utils`: cn
- `@/stores/nav`: useNav
- `@/stores/auth`: useAuth
- `@/stores/role`: useRole
- `@tanstack/react-query`: useMutation, useQuery, useQueryClient
- `sonner`: toast
- `lucide-react`: Plus, AlertCircle, CalendarDays, Link2, ListTodo, Loader2, CheckCheck, KanbanSquare, GraduationCap, Star, CheckSquare, Clock
