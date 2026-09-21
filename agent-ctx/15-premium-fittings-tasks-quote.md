# Task 15 — Premium redesign of Fittings / Tasks / QuickQuote

Agent: full-stack-developer (premium fittings/tasks/quote)
Task ID: 15
Date: 2025

## Scope
Rewrite three `"use client"` default-export views for the Madam Studio atelier app, bound to the PREMIUM REDESIGN CONTRACT in `/home/z/my-project/worklog.md`.

## Files rewritten
- `src/views/Fittings.tsx` — default export `Fittings`
- `src/views/Tasks.tsx` — default export `Tasks`
- `src/views/QuickQuote.tsx` — default export `QuickQuote`

## Premium primitives used
- `PageHeader` (eyebrow + eyebrowIcon + title + subtitle + actions; built-in `animate-fade-in-up`)
- `SectionCard` (surface-premium + border + elevate-sm + lift; supports `bodyClassName` for tight lists / kanban columns)
- `PremiumMetric` (label, value, icon, accent) for the 3-up stat strips
- `AnimatedNumber` (`format="currency"` for the QuickQuote hero total, plain for stat-strip counts)
- `EmptyState` + `SkeletonCard` + `SkeletonList` for empty + loading
- `PremiumButton` (primary/ghost variants, `loading` state) for all CTAs
- `StatusBadge` (refined dot indicator) for fitting + task statuses + task priority

## Reused shared imports
- shadcn/ui: `Dialog` (+parts), `Input`, `Label`, `Textarea`, `Select` (+parts), `Switch`, `Separator`
- icons from `lucide-react` (CalendarClock, CalendarDays, AlertCircle, ChevronRight, Plus, ListTodo, Loader2, CheckCheck, KanbanSquare, Link2, Zap, ShoppingBag, TrendingUp, Scissors, CheckCircle2)
- `toast` from `sonner`
- `apiGet, apiPatch, apiPost` from `@/lib/api`
- `useQuery, useMutation, useQueryClient` from `@tanstack/react-query`
- `useNav` from `@/stores/nav`
- `formatCurrency, formatDate, shortDate, isOverdue, PRIORITY_LEVELS, todayISO` from `@/lib/format`
- types from `@/lib/types`

## Per-file highlights
### Fittings.tsx
- `GET /api/dashboard` → `fittings` array (each has `order.customer`).
- PageHeader actions = status filter Select (All / Scheduled / Completed / Alterations Needed).
- Premium stat strip: 3 PremiumMetric cards (Scheduled, Completed this month, Alterations Needed) using AnimatedNumber.
- Two SectionCards: Upcoming (Scheduled, date asc) + Recent (non-Scheduled, date desc, top 15).
- Each row: custom `DateChip` (month + day calendar tile) + garment + customer with avatar dot + formatDate + StatusBadge + ChevronRight.
- Overdue scheduled fittings render amber-tinted row with AlertCircle + "Overdue" label.
- Loading: SkeletonList inside SectionCards. Empty: EmptyState with CalendarDays icon.
- Click → `go('order', { id: fitting.orderId })`.

### Tasks.tsx
- `GET /api/tasks` (with order.customer + staff), `GET /api/orders` (for the New Task order picker).
- PageHeader action = PremiumButton "New Task" → Dialog (title, priority Select, dueDate, optional orderId Select, notes) → POST `/api/tasks` + invalidate + toast.
- Premium stat strip: To Do / In Progress / Done as PremiumMetric cards (AnimatedNumber, accent on first).
- Filter SectionCard (py-3 body) with Staff + Priority Selects.
- 3-column Kanban (`grid grid-cols-1 md:grid-cols-3 gap-4`); each column = SectionCard (bodyClassName p-3) with status title + count pill + status-coloured icon.
- Premium TaskCard: `rounded-lg bg-white border border-[#E7E5E4] p-3.5 elevate-sm lift`, title, linked garment with Link2 icon, staff avatar dot (initial) + name, dueDate shortDate (amber AlertCircle when overdue & not Done), priority StatusBadge, compact inline status Select → PATCH `/api/tasks/[id]` + toast.
- Loading: 3 × SkeletonCard. Empty column: compact EmptyState.

### QuickQuote.tsx
- Pure-client live calculator; calculation runs in `useMemo`, recomputed on every input change.
- Two-column grid `lg:grid-cols-5` — form 3/5, sticky summary 2/5 (`lg:sticky lg:top-6`).
- Calculator SectionCard "Garment details": Garment Type, Fabric (with per-yard cost hint), Yards (default 3), Complexity (with multiplier hint), Embellishment (with add-on hint), Rush Switch.
- Summary SectionCard "Estimate": line items (Fabric / Labour / Embellishment / Subtotal / Rush premium in amber when active), Separator, big burgundy Total using `<AnimatedNumber value={total} format="currency" />` inside a burgundy gradient wash card, 50% deposit row, emerald Est. margin row with TrendingUp icon, full-width PremiumButton "Convert to Order" (ShoppingBag) → `go('new-order', { params: { garment: `${garment} — ${fabric}` } })`.
- Fabric per-yard costs (GHS): Lace 180, Silk 220, Kente 350, Cotton 80, Velvet 200, Chiffon 120, Satin 150, Wool 250, Linen 140, Crepe 160, Other 150.
- Labour base by garment (GHS): Gown 600, Suit 800, Dress 500, Agbada 700, Skirt Set 450, Slit & Koba 500, Shirt 300, Trousers 350, Other 500.
- Complexity multipliers: Simple 1.0, Moderate 1.3, Elaborate 1.6, Couture 2.0.
- Embellishment add-ons: Beading +400, Embroidery +250, Crystal +600, Hand-painted +350.
- Rush = +25% of subtotal.
- Est. margin = total − direct material costs (fabric + embellishment), shown as GHS + %.

## Quality bar
- `bun run lint` → 0 errors (only an unrelated unused eslint-disable warning elsewhere).
- `bunx tsc --noEmit` → 0 errors in any of the three rewritten files.
- All cards use SectionCard with `elevate-sm lift`; all CTAs use PremiumButton with loading states; all money uses `tabular-nums` (or AnimatedNumber for hero figures); PageHeader gets `animate-fade-in-up` for free; toasts on every mutation; responsive grids collapse on mobile; burgundy #800020 primary throughout.
