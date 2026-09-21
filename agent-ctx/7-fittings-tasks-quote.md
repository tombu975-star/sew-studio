# Task 7 — Fittings / Tasks / QuickQuote views

Agent: full-stack-developer (fittings/tasks/quote)
Date: 2025

## Scope
Build three `"use client"` default-export view files for the Madam Studio atelier app, bound to the design system + API contract in `/home/z/my-project/worklog.md`.

## Files written
- `src/views/Fittings.tsx` — default export `Fittings`
- `src/views/Tasks.tsx` — default export `Tasks`
- `src/views/QuickQuote.tsx` — default export `QuickQuote`

## API used (already implemented by other agents)
- `GET /api/dashboard` → `{ fittings, … }` (each fitting has `order.customer`)
- `GET /api/tasks` → `Task[]` with `order.customer` + `staff`
- `GET /api/orders` → `Order[]` (for the New Task dialog order picker)
- `POST /api/tasks` → create
- `PATCH /api/tasks/[id]` → status change (called from the Kanban card; backend agent should add the `[id]/route.ts` PATCH handler if not yet present — the Fittings PATCH handler at `/api/fittings/[id]` is already implemented)

## Key implementation notes
- Fittings: status filter (All / Scheduled / Completed / Alterations Needed), Upcoming (Scheduled, asc) + Recent (non-Scheduled, desc, top 15). Rows clickable → `go('order', { id: fitting.orderId })`. Scheduled fittings whose date is in the past are highlighted amber with an AlertCircle.
- Tasks: 3-column Kanban (To Do / In Progress / Done) inside AtelierCards. Each task card has an inline status Select that PATCHes `/api/tasks/[id]` via `useMutation` + query invalidation. Filters: staff Select (derived from tasks) and priority Select. New Task dialog (burgundy CTA) with title / priority / dueDate / linked order / notes.
- QuickQuote: pure-client live calculator. fabricCost = yards × fabricBasePerYard; labour = labourBase[garment] × complexityMultiplier; embellishment add-on; subtotal; rush (Switch) adds 25%; total; suggested 50% deposit. "Convert to Order" → `go('new-order', { params: { garment: '${garment} — ${fabric}' } })`. Two-column grid (form left, sticky summary right) on desktop, single column on mobile.

## Quality checks
- `bunx eslint src/views/Fittings.tsx src/views/Tasks.tsx src/views/QuickQuote.tsx` → 0 errors.
- `bunx tsc --noEmit -p tsconfig.json` → 0 errors in any of the three new files (remaining src/ errors are in `OrderDetail.tsx`, `ProductionBoard.tsx`, `api/customers/route.ts` — other agents' scope).
- Dev log: the only "Module not found" errors at the home route are for `@/views/StyleAssist` and `@/views/ProductionBoard` (other agents' tasks). My three files resolve cleanly.

## Reused shared imports
- `@/components/atelier/{AtelierCard, StatusBadge}`
- `@/components/ui/{Dialog, Input, Label, Textarea, Select+parts, Button, Switch, Separator, Skeleton}`
- `@/lib/{api, format, utils, types}`
- `@/stores/nav`
- `@tanstack/react-query` (`useQuery`, `useMutation`, `useQueryClient`)
- `sonner` toast
- `lucide-react` icons: CalendarDays, CheckSquare, Plus, Zap, ArrowRight, AlertCircle, ChevronRight
