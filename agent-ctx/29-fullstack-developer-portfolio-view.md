# Task 29 — Portfolio view (full-stack-developer)

## Task
Build `src/views/Portfolio.tsx` — a luxury lookbook gallery of the studio's finished pieces. Studio-wide for owner/trainer (with a staff filter), self-scoped for staff/trainee.

## Context consumed
- Read `/home/z/my-project/worklog.md` fully — bound to the **PREMIUM REDESIGN CONTRACT** (burgundy `#800020` / cream `#faf8f5`, surface-premium + elevate-sm + lift + animate-fade-in-up + shimmer + tabular-nums) and the **CONTRACT FOR ROLE-SCOPING + PORTFOLIO + CERTIFICATE** (exact API shapes, role helpers, layout).
- Inspected premium primitives: PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState/SkeletonCard, StatusBadge, PremiumButton.
- Verified API endpoints exist:
  - `GET /api/portfolio` → studio-wide Order[] (status in [Completed, Collected/Delivered], with customer + assignedStaff).
  - `GET /api/portfolio?staffId=ID` → that person's portfolio.
  - `GET /api/users` → User[] (for the staff filter).
- Verified role helpers in `@/stores/role`: `canSeeAllCustomers()` (madam|trainer), `isTrainee()`, etc.
- Verified `useAuth().user.id` is the self-scope key.
- Verified `useNav().go('order', { id })` for navigation.

## Implementation
**File created:** `src/views/Portfolio.tsx` — single `"use client"` default export `Portfolio`, ~240 lines, with inline `GalleryCard` sub-component.

### Layout
- Wrapper: `<div className="p-5 md:p-8 max-w-[1300px] mx-auto w-full">`.
- **PageHeader**: eyebrow `"Our work"` with `ImageIcon`, title `"Portfolio"`, subtitle switches by mode (`"A showcase of finished pieces from the atelier."` for owner/trainer; `"Your completed pieces from the atelier."` for staff/trainee). Actions slot: a staff filter `Select` shown only when `canSeeAllCustomers()` — `"All staff"` + each user from `/api/users`. Self-scoped users get no Select.
- **Stat strip** (3 PremiumMetrics, `animate-fade-in-up`): Total Pieces (accent, ImageIcon), With Photos (designImage != null count, ImageIcon), This Year (orderDate year == current year, CalendarDays). All values via `AnimatedNumber` (tabular-nums auto-applied).
- **Gallery**: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`. Each item is a `<button>` → `go('order', { id })`:
  - Card classes: `rounded-lg overflow-hidden border border-[#E7E5E4] surface-premium elevate-sm lift group hover:border-[#800020]/30 transition-colors focus-visible:ring-2 focus-visible:ring-[#800020]/30 animate-fade-in-up`.
  - Staggered via `style={{ animationDelay: idx * 50 + "ms" }}`.
  - Image area `aspect-[3/4] bg-[#faf8f5] relative overflow-hidden`. If `designImage`: `<img>` object-cover absolute inset-0 with `group-hover:scale-105 transition-transform duration-500` + a `bg-gradient-to-t from-black/45` overlay that fades in on hover. If no image: a centered circle with `Scissors` icon + garment name `line-clamp-2`.
  - Floating `StatusBadge` absolute top-right with `bg-white/95 backdrop-blur-sm shadow-sm` so Completed/Collected stays legible against any image.
  - Info area `p-3 space-y-1`: garment name (font-medium text-sm truncate, tints burgundy on hover), customer name row (text-xs stone-500 with `User` icon), date row (text-xs stone-400 `tabular-nums` with `CalendarDays` icon, `shortDate(orderDate)`).
- **Loading**: a grid of 8 `SkeletonCard` items in the same gallery grid (`aspect-[3/4] flex flex-col justify-end p-4` className override — twMerge dedupes the default `p-5`).
- **Empty state**: `EmptyState` with `ImageIcon` — title `"No completed work yet."` for owner/trainer, `"You haven't completed any pieces yet."` for staff/trainee; description differentiates self vs studio scope. Wrapped in `SectionCard`.
- **Error state**: `SectionCard` + `EmptyState` with `ImageIcon` "Couldn't load the gallery" + retry hint.

### Data flow
- `useQuery<Order[]>(["portfolio", effectiveStaffId || "all"])` — fetches `/api/portfolio` (studio) or `/api/portfolio?staffId=ID` (scoped). `enabled: !selfScoped || !!user` to wait for auth hydrate before self-scoping.
- `useQuery<UserType[]>(["users"])` — only enabled for owner/trainer (drives the staff filter options).
- `effectiveStaffId`: self-scoped → `user.id`; owner/trainer → empty when `"all"`, else the selected id.
- `stats` memoized: total / withPhotos / thisYear.
- No mutations — pure read view; clicks route via `go('order', { id })`.

### Quality bar hit
- SectionCard + elevate-sm + lift on every container.
- `tabular-nums` on dates + AnimatedNumber on stat strip values.
- `animate-fade-in-up` on PageHeader (built-in) + stat strip + staggered on every gallery card (50ms steps).
- Skeleton loaders for loading, EmptyState for empty + error.
- Responsive: 2 cols mobile → 3 cols md → 4 cols lg.
- Burgundy `#800020` primary (hover border tint, focus ring, accent metric). No blue/indigo.
- Lookbook feel: 3/4 portrait image frames, subtle hover gradient, floating status chip, gentle image zoom.

## Lint
- `bunx eslint src/views/Portfolio.tsx` → clean (no errors, no warnings).
- `bun run lint` (project-wide): 2 pre-existing errors in `src/views/Dashboard.tsx` from another task (`TraineeDashboard` / `TrainerTraineesCard` not defined) — NOT in this file. Portfolio.tsx itself is clean.

## Dev log
- Before this file existed, `dev.log` showed `Module not found: Can't resolve '@/views/Portfolio'` (page.tsx was already importing it dynamically).
- After creating the file: `✓ Compiled in 9.2s` + `GET / 200`. Resolved.

## Deliverable
- `/home/z/my-project/src/views/Portfolio.tsx` (~240 lines, single self-contained `"use client"` default export with inline `GalleryCard`).
