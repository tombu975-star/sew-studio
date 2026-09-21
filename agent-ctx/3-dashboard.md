# Task 3 — Dashboard view

**Agent:** full-stack-developer (dashboard)
**Deliverable:** `src/views/Dashboard.tsx` (single file, `"use client"`, default export `Dashboard`)

## What it renders

The atelier overview / command center. Adaptive via `useRole().isStaff()`:

### Madam (owner) view — full
1. **Banner** — today's date (e.g. "Monday, 15 January 2025") as uppercase micro-label with `CalendarDays` icon; `font-display` heading `{ownerLabel}'s Atelier` at `clamp(32px, 5vw, 44px)`; subtitle; burgundy `New Custom Order` button (desktop) → `go('new-order')`. Mobile FAB bottom-right.
2. **Money row** — 4 `MetricCard`s: Sales This Month, Money Received (accent), Outstanding, Estimated Profit (accent). Grid `grid-cols-2 lg:grid-cols-4`.
3. **Work + People grid** (`lg:grid-cols-3`):
   - Left 2/3 stack: **Active Orders** (horizontal scroll, `w-56` cards, status badge, → order detail), **Status Pipeline** (11 tiles for every `ORDER_STATUSES`), **Upcoming Fittings** (Scheduled, max 5, → order detail).
   - Right 1/3: **Staff Workload** — avatar circle (initial) + name + active-order count + open-task badge per staff user.
4. **Income Trend** — recharts `AreaChart` of payments grouped by month (last 6), burgundy `#800020` fill + gradient, `formatCurrency` tooltip & Y-axis. `h-[240px]`.
5. **Business Health** — computed badge ("On Track" green / "Needs Attention" amber / "At Risk" burgundy) + 4 metric lines (avg margin, outstanding, overdue tasks, ready-for-collection). Thresholds: At Risk if outstanding > 5000 OR overdueTasks > 3; Needs Attention if outstanding > 1000 OR overdueTasks > 0.
6. **Needs Attention** — 3–6 amber `AlertCircle` bullet rows: orders due within 7 days, overdue tasks, Ready awaiting collection, open enquiries, quotes awaiting deposit.
7. **AI Trend Suggestions** — `Sparkles` icon, "Generate insights" button POSTs a small structured summary to `/api/insights/trends` (`{ orders, payments, customers, fittings }` summaries), displays returned `suggestions` with emerald `Check` icons. Loading state on button.

### Staff view (`isStaff()`)
- Banner "Your Workbench".
- Active Orders + Status Pipeline + Upcoming Fittings + "My Open Tasks" big-number card.
- Skips money row, income trend, business health, attention, AI sections.

## Data
- `useQuery({ queryKey: ['dashboard'], queryFn: () => apiGet<DashboardData>('/api/dashboard') })`.
- All derived metrics computed in a `useMemo` from the response.
- Local helpers: `orderPaidTotal`, `orderCostTotal`, `sameMonth`, `monthlyIncome`.

## Quality
- Loading: `<div className="p-10 text-stone-400 text-sm">Loading the atelier…</div>`.
- Error state for failed fetch.
- Empty states with helpful copy.
- All currency via `formatCurrency`.
- Responsive: grids collapse on mobile, chart `h-[240px]` min.
- Burgundy `#800020` primary throughout — no blue/indigo as primary.
- `bun run lint`: zero errors for this file.

## Backend dependencies (for other agents)
- `GET /api/dashboard` → `{ orders, payments, fittings, tasks, users, customers, settings, styleConcepts }` (orders include customer + assignedStaff).
- `POST /api/insights/trends` body `{ orders: {orderCount,totalSales,outstanding,statusBreakdown}, payments: {paymentsThisMonth,totalReceived}, customers: {count,customerSources}, fittings: {upcomingCount} }` → `{ suggestions: string[] }`.
