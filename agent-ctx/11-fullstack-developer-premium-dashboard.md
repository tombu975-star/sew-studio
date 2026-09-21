# Task 11 — Premium redesign of Dashboard view

Agent: full-stack-developer (premium dashboard)
Task ID: 11
Date: 2025

## Scope
Rewrite `src/views/Dashboard.tsx` (default export `Dashboard`, `"use client"`) — the headline screen users see after login — to be genuinely premium, bound to the PREMIUM REDESIGN CONTRACT at the bottom of `/home/z/my-project/worklog.md`.

## Files changed
- `src/views/Dashboard.tsx` — fully rewritten (premium layout, AnimatedNumber hero metrics, sparklines, status pipeline with category-tinted counts, gradient staff avatars, 6-month burgundy AreaChart with `url(#burgundyGrad)` gradient, business-health gauge, needs-attention list, AI Trend Suggestions with sonner toasts + skeleton loading).
- `src/components/atelier/PremiumMetric.tsx` — widened `value` prop type from `string | number` to `React.ReactNode` so callers can pass `<AnimatedNumber>` inside (per the spec). Backward-compatible; this also fixes pre-existing `tsc` errors in `Fittings.tsx` and `Tasks.tsx` that were passing JSX into the old type.

## Premium primitives used
- `PageHeader` (eyebrow `Atelier overview · {today}` + `CalendarDays` icon + title + subtitle + actions; built-in `animate-fade-in-up`)
- `SectionCard` (surface-premium + elevate-sm + lift) for Active Orders, Status Pipeline, Upcoming Fittings, Staff Workload, Income Trend, Business Health, Needs Attention, AI Trend Suggestions, plus the error-state card
- `PremiumMetric` with `accent`, `spark`, `trend`, `trendLabel`, `icon` for the 4-card money row (Sales This Month, Money Received, Outstanding, Estimated Profit)
- `AnimatedNumber` (`format="currency"` inside every PremiumMetric value and the Business Health `HealthMetric`s; plain count for the staff "My Open Tasks" hero figure)
- `EmptyState` (with icon) for empty Active Orders, Upcoming Fittings, Staff Workload, AI "no suggestions" and the dashboard error state
- `SkeletonCard` grid (4 skeletons for the money row) + `SkeletonList` (3 rows) for the sections during loading — no "Loading…" text
- `PremiumButton` (primary for "New Custom Order"; outline for "Generate insights", "Reload" and "Go to Tasks")
- `StatusBadge` (refined dot indicator) for order + fitting status

## Premium layout (matches contract)
Wrapper: `<div className="p-5 md:p-8 max-w-[1400px] mx-auto w-full">`

1. **PageHeader** — eyebrow `Atelier overview · {weekday, day month year}` with `CalendarDays` icon; title `{ownerLabel}'s Atelier` (or `Your Workbench` for staff); subtitle `A snapshot of the studio today.`; actions = `PremiumButton` "New Custom Order" (primary, Plus icon) → `go("new-order")`.
2. **Money row (Madam only)** — `grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up`. Four `PremiumMetric`s:
   - Sales This Month — accent, spark = last 6 months sales, `TrendingUp` icon
   - Money Received — accent, spark = last 6 months payments, `Wallet` icon, `trend` + `trendLabel` ("% vs last mo" computed from previous-month bucket)
   - Outstanding — `AlertCircle` icon
   - Estimated Profit — `Sparkles` icon
   - Each value is `<AnimatedNumber value={n} format="currency" />`
3. **Work + People grid** — `grid grid-cols-1 lg:grid-cols-3 gap-4`:
   - Left 2/3 stack:
     - **Active Orders** SectionCard (header action "View all" → `go("orders")`). Horizontal scroll of order cards (`w-60 shrink-0`, `rounded-lg border border-[#E7E5E4] p-4 lift hover:border-[#800020]/30`). Each card: garment (`line-clamp-2 min-h-[2.5rem]`), delivery `shortDate`, `StatusBadge`. Click → `go("order", { id })`. Empty state with `ClipboardList` icon.
     - **Status Pipeline** SectionCard: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5` (2 rows on desktop, all 11 statuses visible). Each tile: big count (`font-display text-2xl font-semibold tabular-nums`) tinted by category (consultation=stone, confirmed/Deposit Paid=blue, In Production=violet, Fitting/Alterations=cyan, Ready=emerald, Collected/Completed=teal), uppercase tracking label.
     - **Upcoming Fittings** SectionCard (header action "All fittings" → `go("fittings")`): list of max 5 scheduled fittings. Each row: garment + formatDate + StatusBadge, hover lift (`hover:bg-[#FBF9F7]`). Click → order detail. Empty state with `CalendarDays` icon.
   - Right 1/3 **Staff Workload** SectionCard (Madam): for each staff, a row with gradient avatar (initial, burgundy→purple→teal palette seeded by user id), name, active orders count, burgundy pill with open-task count. For staff view: a centered hero `<AnimatedNumber value={openTasks.length} />` in `text-6xl font-display text-[#800020]` plus "Go to Tasks" `PremiumButton`.
4. **Income Trend** SectionCard (Madam): recharts `AreaChart`, last 6 months payments, `linearGradient id="burgundyGrad"` (transparent→burgundy `#800020`), X axis short month labels, Y axis hidden ticks (currency formatter), tooltip with `formatCurrency`. `h-[260px]`. Header action shows total received this period (`formatCurrency(totalReceived6m)` in `tabular-nums`).
5. **Business Health** SectionCard (Madam): premium gauge — a large status pill (`On Track` = emerald, `Needs Attention` = amber, `At Risk` = burgundy) with a colored dot. Below, a `grid grid-cols-2 gap-3` of mini-metrics (`HealthMetric` inline component): Avg Margin / Order (`Coins`), Outstanding (`CircleDollarSign`), Overdue Tasks (`Timer`), Ready for Collection (`PackageCheck`) — each with icon + `<AnimatedNumber>` value. Health computed per spec: At Risk if outstanding > 5000 OR overdueTasks > 3; Needs Attention if outstanding > 1000 OR overdueTasks > 0; else On Track.
6. **Needs Attention** SectionCard (Madam): list of 3-6 amber `AlertCircle` rows — orders due within 7 days, overdue tasks, Ready awaiting collection, open enquiries, awaiting-deposit quotes. Each row hover lift.
7. **AI Trend Suggestions** SectionCard (Madam) with `Sparkles` icon in title slot. `PremiumButton` "Generate insights" (outline, `loading` state) POSTs to `/api/insights/trends` with the flat summary `{ orderCount, totalSales, outstanding, statusBreakdown, paymentsThisMonth, upcomingFittings, customerSources }`. Returned `suggestions` rendered as styled list items with emerald `Check` icons and `animate-fade-in-up` (staggered by 60ms per item). Empty state uses `EmptyState` with `Sparkles` icon. Toasts via `sonner` (`toast.success` for N insights, `toast` for empty, `toast.error` for failures).

## Staff view (when `isStaff()`)
- PageHeader: title "Your Workbench", subtitle for staff
- Big `<AnimatedNumber>` open tasks in the right-rail Staff Workload card (replaces workload list)
- Active Orders + Status Pipeline + Upcoming Fittings sections still render
- Money row, Income Trend, Business Health, Needs Attention, AI Trend Suggestions all skipped

## Loading + error states
- Loading: shimmer header (3 lines) + 4 `SkeletonCard`s for the money row + `SkeletonCard` + `SkeletonList` for the work/people grid. No "Loading…" text.
- Error: `SectionCard` titled "Could not load dashboard" containing an `EmptyState` with `AlertCircle` icon + Reload `PremiumButton` (calls `window.location.reload()`).

## Quality bar met
- Every card uses `SectionCard` (elevate-sm + lift)
- Hero metrics use `<AnimatedNumber>` inside `PremiumMetric` + sparkline + trend
- `animate-fade-in-up` on PageHeader (built-in) and the money row + first section (Active Orders)
- Tabular numbers on ALL financial figures (`tabular-nums` via `AnimatedNumber` and on `totalReceived6m` header)
- Toasts via `sonner` for the AI insights action
- Responsive: grids collapse (2 → 4 cols on money row, 1 → 3 cols on work/people grid, 2 → 6 cols on pipeline), chart `h-[260px]`
- Burgundy `#800020` primary throughout; no blue/indigo as primary
- Empty states use `EmptyState` with icon
- Mobile FAB (`md:hidden fixed bottom-20 right-4`) with `elevate-burgundy`

## Lint + type check
- `bunx eslint src/views/Dashboard.tsx` → 0 errors, 0 warnings
- `bunx tsc --noEmit --skipLibCheck` → 0 errors in `src/views/` (PremiumMetric type widening also cleared pre-existing errors in Fittings.tsx + Tasks.tsx)
- `bun run lint` → 0 errors project-wide (only a pre-existing warning in CustomerProfile.tsx unrelated to this task)
