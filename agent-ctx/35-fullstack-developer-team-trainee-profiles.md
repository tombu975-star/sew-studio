# Task 35 — full-stack-developer (team trainee profiles)

## Task
Enhance the Trainees tab in `src/views/Team.tsx` so the trainer/owner can configure each trainee's mentor + training duration (school-portal style). Bound to the PREMIUM REDESIGN CONTRACT + CONTRACT FOR GRADING + SCHOOL-PORTAL VIEWS in worklog.md.

## Work Log
- Read `/home/z/my-project/worklog.md` completely — bound to PREMIUM REDESIGN CONTRACT (burgundy #800020 / cream #faf8f5, surface-premium + elevate-sm + lift + animate-fade-in-up + tabular-nums) and the CONTRACT FOR GRADING + SCHOOL-PORTAL VIEWS at the bottom (exact data shapes, role helpers, premium primitives list, quality bar).
- Inspected existing `src/views/Team.tsx` (1405 lines, 3 tabs: Staff & Trainers / Trainees / Freelancers). Confirmed the Trainees card already uses `SectionCard` + `SkeletonList` + `EmptyState` + `PremiumButton` + `StatusBadge` + gradient avatars — premium baseline already in place.
- Verified backend readiness: `GET /api/users` returns flat `User[]` (no `mentor` include), `PATCH /api/users/[id]` accepts `{ mentorId, trainingDurationWeeks, trainingStartedAt }` with proper null-coercion. The `User` type already exposes `mentorId`, `mentor?`, `trainingDurationWeeks?`, `trainingStartedAt?`.
- Confirmed role helpers in `@/stores/role`: `isOwner()`, `isTrainer()` — added `useRole` to the imports.
- Added `formatDate` to the `@/lib/format` import; added `Pencil`, `CalendarDays`, `Clock` to the lucide-react import.
- Added two module-level helpers next to `initialOf`:
  - `weeksElapsedFromStart(startedAt)` → `floor((now - startedAt) / 7d)` (0 if missing/invalid/future).
  - `toDateInput(iso)` → `YYYY-MM-DD` for `<input type="date">` using local date components (avoids TZ drift).
  - `UNASSIGNED_MENTOR = "__none"` sentinel for the mentor `Select` (Radix treats empty string specially).
- Updated the parent `Team()` component: pulled in `useRole()`, computed `canEditTrainees = role.isOwner() || role.isTrainer()`, and passed `mentors` + `canEdit` to `TraineesCard`.
- Rewrote `TraineesCard`:
  - Added `mentors: User[]`, `canEdit: boolean` to props; added local `editTrainee: User | null` state.
  - Built a `userById` map so `trainee.mentorId` is matched client-side (since GET /api/users doesn't include the mentor relation).
  - Each trainee row now shows a **school-portal info row** between the contact line and the existing training-log stats:
    - **Mentor** (UsersRound icon + uppercase micro-label): matched user's fullName, or amber italic "Unassigned" if no mentor / mentorId not found.
    - **Duration** (Clock icon): `"{n} weeks"` (or "week" singular) in tabular-nums, or amber italic "Not set".
    - **Started** (CalendarDays icon): `formatDate(trainingStartedAt)` + "· Week {X} of {Y}" in burgundy font-medium where X = `weeksElapsedFromStart(startedAt)` and Y = `trainingDurationWeeks`. If no startedAt, amber italic "Not started".
  - Below the info row, a **burgundy progress bar** (h-1.5 rounded-full, `bg-gradient-to-r from-[#800020] to-[#a83349]`) showing `weeksElapsed / trainingDurationWeeks * 100%` (clamped 0–100, min 1% so a just-started trainee has a visible sliver). Includes `role="progressbar"` + aria-valuenow/min/max + a "{pct}% complete" tabular-nums caption. Only shown when both `trainingStartedAt` and `trainingDurationWeeks` are set.
  - Kept the existing per-trainee training-log stats line (total logs, proficient/practicing/learning counts) intact below the new info.
  - Added an **"Edit profile" PremiumButton** (variant="outline" size="sm" with `Pencil` icon) next to the existing **"View progress"** button — only rendered when `canEdit` is true (the trainer/owner guard).
  - Removed the redundant "Mentor · {name}" hidden-md label (the mentor is now shown inline in the school-portal row).
  - On small screens, both buttons collapse to icon-only (the labels are `hidden sm:inline`); the row already stacks via `flex-col sm:flex-row`.
- Added the new `EditTraineeDialog` component (placed above the existing `Field` helper):
  - Props: `open`, `onOpenChange`, `trainee: User | null`, `mentors: User[]`.
  - Parent passes `key={editTrainee?.id ?? "closed"}` so the dialog remounts with fresh state per trainee — avoids `setState in useEffect` (lint clean).
  - Lazy `useState` initializer seeds the form from the trainee on mount: `mentorId` (or sentinel), `trainingDurationWeeks` (defaults to "12" if unset), `trainingStartedAt` (via `toDateInput`).
  - Fields:
    - **Mentor** `Select` (trainers + madam) with an explicit "Unassigned" `SelectItem` (sentinel) and a disabled "No trainers or madam available" placeholder when the mentor list is empty. Helper text: "Mentors must be a trainer or the Madam."
    - **Training duration (weeks)** numeric `Input` (min=1, step=1, tabular-nums, placeholder "12").
    - **Training started date** `<Input type="date">` (tabular-nums).
  - Information callout (CalendarDays icon, tinted bg-[#FBF9F7] border) explains that duration + start date drive the progress bar + Week-X-of-Y schedule.
  - **Save profile** PremiumButton (variant="primary" size="md", Pencil icon, loading state) → `apiPatch<User>('/api/users/${trainee.id}', { mentorId, trainingDurationWeeks, trainingStartedAt })` → invalidate `['users']` + sonner success toast "{name}'s profile updated." + auto-close.
  - Cancel button (outline) + error toast on failure.
  - Form submit coerces: mentorId `__none` → null, duration NaN/≤0 → null, empty date → null (matches PATCH route's null-handling).
- Verification:
  - `bunx eslint src/views/Team.tsx` → **clean, zero errors/warnings**.
  - `bunx tsc --noEmit --skipLibCheck | grep Team.tsx` → **no Team.tsx-specific TypeScript errors**.
  - dev.log shows clean recompiles (`✓ Compiled in 9.3s`, `✓ Compiled in 8.4s`) after the edits, no errors.
  - (Note: `bun run lint` shows 3 errors in `src/views/Progress.tsx` — `MentorTrainingCard`/`OverallAverageCard`/`AssignmentsGradesCard` not defined. These belong to Task 32's Progress view scope, not my Task 35 scope.)

## Stage Summary
- File edited: `src/views/Team.tsx` (~1745 lines, single default export `Team`, `"use client"`).
- Features delivered:
  - Each trainee row now displays a school-portal-style info block: Mentor (matched client-side from `user.mentorId`), Training duration ("{n} weeks" or amber "Not set"), Started date + "Week {X} of {Y}" progress (or amber "Not started").
  - Burgundy gradient progress bar (weeksElapsed / trainingDurationWeeks %) with ARIA progressbar role and "% complete" caption.
  - "Edit profile" PremiumButton (outline, sm, Pencil) — guarded by `isTrainer() || isOwner()` — opens EditTraineeDialog.
  - EditTraineeDialog: Mentor Select (trainers + madam + "Unassigned"), Training duration number input (default 12), Training started date input → PATCH `/api/users/[id]` → invalidate `['users']` + toast + close.
  - Kept existing "View progress" button + per-trainee training-log stats (logs total, proficient/practicing/learning counts).
  - Responsive (mobile: stacked rows, icon-only buttons; desktop: inline rows, full labels).
  - Premium: SectionCard + elevate-sm + lift, gradient avatars, tabular-nums on weeks/percentages, PremiumButton loading states, sonner toasts, burgundy #800020 primary throughout.
- Consumes: `@/components/atelier/{PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState, SkeletonList, PremiumButton, StatusBadge}`, `@/components/ui/{Tabs, Dialog, AlertDialog, Input, Label, Textarea, Select}`, `@/lib/api` (apiGet/apiPost/apiPatch/apiDelete), `@/lib/format` (formatCurrency, formatDate), `@/lib/types` (User, Freelancer, TrainingLog), `@/stores/auth` (useAuth), `@/stores/nav` (useNav), `@/stores/role` (useRole — isOwner/isTrainer), `@tanstack/react-query` (useQuery/useMutation/invalidate), `sonner` (toast), `lucide-react` (UsersRound, UserPlus, Mail, Phone, Plus, GraduationCap, ArrowRight, Pencil, CalendarDays, Clock, …).
- API dependency: `GET /api/users` (flat list — mentor matched client-side) + `PATCH /api/users/[id]` accepts `{ mentorId, trainingDurationWeeks, trainingStartedAt }` (already implemented by Task 32 backend).
