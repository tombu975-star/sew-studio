# Task 25 — full-stack-developer (progress view)

## Task
Build the Progress view for "Madam Studio" (Next.js 16 premium atelier app) — trainee skill journey + mentor oversight. One file: `src/views/Progress.tsx` (default export `Progress`, "use client"). Two modes based on logged-in user's role.

## Bound contracts
- `/home/z/my-project/worklog.md` — PREMIUM REDESIGN CONTRACT (burgundy #800020 / cream #faf8f5, surface-premium + elevate-sm + lift + animate-fade-in-up) + CONTRACT FOR TEAM UPDATE + PROGRESS VIEW (exact API shapes, two modes, premium primitives, quality bar).
- Read completely before starting.

## Work Log
1. Read worklog.md completely — extracted design tokens, premium primitive list, exact API contract, role context (useAuth/useRole/useNav), quality bar.
2. Inspected premium primitives (`PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState/SkeletonList, PremiumButton, StatusBadge`) for exact prop shapes; inspected `Team.tsx`, `Tasks.tsx`, `Orders.tsx` for gradient-avatar + premium row patterns.
3. Verified backend already exists (Task 23): `GET /api/training-logs?traineeId=ID` (with trainee + mentor, ordered date desc), `POST /api/training-logs`, `PATCH/DELETE /api/training-logs/[id]`, `GET /api/users`, `GET /api/tasks`, `GET /api/orders`. Read the actual route handlers to confirm field handling.
4. Additively extended `src/components/atelier/StatusBadge.tsx` (non-breaking) with Learning=amber / Practicing=sky / Proficient=emerald entries in both `STATUS_STYLES` + `DOT_COLOR` maps.
5. Wrote `src/views/Progress.tsx` (~1170 lines, single "use client" default export `Progress`):
   - Top-level role switch: trainees → `<TraineeProgress traineeId={user.id}>`; owners/trainers → `<OwnerProgress>` (uses `useNav().selectedId`).
   - **TraineeProgress**: wrapper (max-w-[1100px] p-5 md:p-8) + PageHeader (eyebrow "My apprenticeship" + GraduationCap, title "My Progress", subtitle) → shared `<ProgressBody viewerRole="trainee">`.
   - **OwnerProgress**: PageHeader (eyebrow "Apprenticeship" + GraduationCap, title "Trainee Progress", actions slot = owner/trainer chip with gradient avatar). Trainee picker `SectionCard`: desktop = horizontal scrollable chip row (gradient avatar + name + "Trainee" label, active chip = burgundy gradient + elevate-burgundy + white text, inactive = white surface + lift hover); mobile = Select dropdown. On pick → `go('progress', { id: trainee.id })`. Empty state with "Go to Team" outline button.
   - **SelectedTraineeHeader**: premium surface-premium card with large burgundy gradient avatar, trainee name + "Trainee" StatusBadge, email (Mail) + phone (Phone), "Change trainee" ghost button.
   - **Shared ProgressBody** (parameterised by traineeId + viewerRole + mentorId):
     - TanStack useQuery on `GET /api/training-logs?traineeId={id}` (key `['training-logs', traineeId]`); useQuery on `/api/tasks` + `/api/orders`.
     - Premium stat strip (`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6`): 4 PremiumMetric — Total Logs (accent), Proficient, Practicing, Learning. AnimatedNumber tabular-nums.
     - **SkillMasteryCard**: groups logs by skill (deterministic). Each row: skill name (font-medium) + latest status StatusBadge + entry count + STATUS_HINT micro-copy + slim burgundy progress bar showing % Proficient. Sorted latest entry desc. Empty: EmptyState with GraduationCap.
     - **TrainingLog timeline** (SectionCard "Training log" bodyClassName=p-0, header action = PremiumButton "Log new learning"/"Log for trainee" + Plus → LogDialog):
       - Each row (animate-fade-in-up staggered 60ms): date column (month + day + year), vertical Separator, content (skill chip burgundy-tinted + Scissors icon, title, note whitespace-pre-wrap, mentor line "with {mentor.fullName}" with GraduationCap), actions (inline Select for status PATCH + ghost Trash2 → AlertDialog confirm → DELETE).
       - Loading: SkeletonList 4 rows. Empty: EmptyState.
     - **MyTasksCard**: tasks filtered by staffId, sorted pending-first then due date asc. Row: title + priority StatusBadge, customer/garment subtext, dueDate (CalendarDays, amber+bold if overdue & not Done), StatusBadge. Empty: EmptyState with CheckSquare.
     - **OrdersContributedCard**: orders filtered by assignedStaffId, newest first, capped 8. Row = button → go('order', {id}): garment + customer, shortDate, formatCurrency, StatusBadge, ArrowRight (burgundy on hover). Empty: EmptyState with ShoppingBag.
     - **LogDialog** split into LogDialog wrapper + LogForm child so the form remounts fresh on each open (avoids the `react-hooks/set-state-in-effect` lint rule — no useEffect needed). Fields: Skill Select (9 COMMON_SKILLS incl. Other), Status Select (Learning/Practicing/Proficient), conditional custom-skill Input, required Title Input, Note Textarea, Date input defaulting to todayISO. PremiumButton "Add entry" (loading) → POST → invalidate + toast "Training log added." + close. mentorId passed only in owner mode.
   - Helpers: `initialOf(name)`, `gradientFor(name)` — deterministic burgundy-leaning gradient palettes.
6. Verified: `bunx eslint src/views/Progress.tsx src/components/atelier/StatusBadge.tsx` → 0 errors, 0 warnings. `bunx tsc --noEmit --skipLibCheck` → 0 errors in my files. Dev log: `GET /api/training-logs 200 in 736ms`.
7. Appended worklog entry (Task ID 25) with full stage summary.

## Stage Summary
- Files created/modified:
  - `src/views/Progress.tsx` — premium two-mode progress view (default export `Progress`, "use client", ~1170 lines, inline sub-components).
  - `src/components/atelier/StatusBadge.tsx` — additive extension with Learning/Practicing/Proficient statuses (amber/sky/emerald).
- Features delivered: role-based two-mode view (trainee sees own journey, owner/trainer picks a trainee via chip row or mobile Select); premium stat strip with AnimatedNumber counts; skill mastery overview grouping logs by skill with progress bars + status hints; staggered training-log timeline with inline status PATCH Select + AlertDialog-confirmed DELETE; "My tasks" section filtered by staffId with overdue highlighting; "Orders I've contributed to" section filtered by assignedStaffId with navigation to order detail; premium Log dialog (Skill/Status/Title/Note/Date, conditional custom-skill input, loading state) supporting both trainee self-log and mentor "Log for trainee" mode; SkeletonList loaders; EmptyState for every empty; sonner toasts on every mutation; animate-fade-in-up on PageHeader + SelectedTraineeHeader + staggered on skill rows + log rows; fully responsive (grids collapse 2→4 cols, trainee chips scroll horizontally on desktop + Select on mobile, dialog max-w-lg).
- Consumes: `@/components/atelier/*`, `@/components/ui/*`, `@/lib/api`, `@/lib/format`, `@/lib/types`, `@/stores/{auth,nav,role}`, `@tanstack/react-query`, `sonner`, `lucide-react`, `@/lib/utils`.
- Backend dependency (already implemented by Task 23): all `/api/training-logs` + `/api/users` + `/api/tasks` + `/api/orders` routes used by this view are live and returning data.

## Deliverable
- `src/views/Progress.tsx` — created.
- `src/components/atelier/StatusBadge.tsx` — extended additively.
- Lint clean for both files. TypeScript clean for both files.
