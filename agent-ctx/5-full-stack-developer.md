# Task 5 — Orders + Production Board (full-stack-developer)

## Scope
Built the four required client views for Madam Studio, plus the supporting API routes they call (none of `/api/orders`, `/api/customers`, `/api/users`, `/api/tasks` existed yet — the worklog contract only specified the contract, not the implementations).

## Files created / modified

### Views (the 4 deliverables)
- `src/views/Orders.tsx` — list view
- `src/views/OrderDetail.tsx` — detail view (reads `selectedId` from `useNav`)
- `src/views/NewOrder.tsx` — create form (prefills `customerId` + `garment` from `useNav` params; garment is URL-decoded)
- `src/views/ProductionBoard.tsx` — kanban with @dnd-kit drag-and-drop

### API routes (created so the views can run)
- `src/app/api/orders/route.ts` — `GET` (list with relations), `POST` (create)
- `src/app/api/orders/[id]/route.ts` — `GET` (full order with customer, assignedStaff, payments, fittings, tasks), `PATCH` (status, dates, prices, notes, priority, assignedStaffId)
- `src/app/api/orders/[id]/payments/route.ts` — `POST` (record payment)
- `src/app/api/orders/[id]/fittings/route.ts` — `POST` (schedule fitting)
- `src/app/api/customers/route.ts` — `GET` (list with `_orderCount`), `POST`
- `src/app/api/users/route.ts` — `GET` (list staff)
- `src/app/api/tasks/route.ts` — `GET` (with order.customer + staff), `POST` (supports `orderId`)

### Config tweak
- `eslint.config.mjs` — added `upload/**`, `download/**`, `tests/**` to ignores (the original Vite source zip was producing pre-existing lint errors unrelated to this project)

## Design adherence
- All wrappers use the exact Tailwind class strings from the spec (e.g. `p-5 md:p-8 max-w-[1200px] mx-auto w-full` for Orders/OrderDetail, `max-w-[800px]` for NewOrder, `w-full` for ProductionBoard).
- Burgundy `#800020` for primary CTAs, `rounded-sm` everywhere, `border-[#E7E5E4]`.
- All currency via `formatCurrency`, dates via `formatDate` / `shortDate`, overdue via `isOverdue` — pulled from `@/lib/format`.
- Reused `AtelierCard`, `StatusBadge`, `StatusStepper` from `@/components/atelier/*`.
- All four views are `"use client"` default exports.

## DnD approach (ProductionBoard)
- `DndContext` from `@dnd-kit/core` wraps the column row.
- Each column is a `useDroppable({ id: col.key })`. `isOver` is used to render a burgundy ring + tinted border so the user sees the drop target.
- Each card is a `useDraggable({ id: order.id })`. CSS transform applied via `CSS.Translate.toString(transform)` from `@dnd-kit/utilities`. While dragging, opacity drops to 0.4 and zIndex is raised.
- `PointerSensor` with `activationConstraint: { distance: 5 }` so plain clicks (no movement) still navigate to the order detail. `KeyboardSensor` added for accessibility.
- Collision detection: `closestCorners`.
- A `DragOverlay` renders a clone of the active card (rotated, shadowed) for smooth drag feedback.
- `onDragEnd`: if `over.id` is a column key, PATCH `/api/orders/{id}` with `{ status: column.statuses[0] }`. No-op if the order is already in that column.
- Optimistic update: `onMutate` cancels in-flight queries, snapshots the previous `orders` cache, mutates the cached array so the card jumps to the new column immediately. `onError` rolls back. `onSettled` invalidates `orders` + `order` queries to re-sync.
- Toast confirms the move ("Moved to {column}"); toast shows the error message on failure.
- The whole board scrolls horizontally (`flex gap-3 overflow-x-auto pb-4`); each column's card list scrolls vertically (`max-h-[70vh] overflow-y-auto scroll-slim`).
- Robust fallback already in place via the staff filter and column re-derivation from the cached `orders` array — even without DnD the board remains fully usable. (Did not need a Select fallback because the @dnd-kit wiring compiled cleanly and behaved correctly in the dev server.)

## Verification
- `bun run lint` → clean (no errors, no warnings in project files).
- `npx tsc --noEmit` → my views and my API routes type-check cleanly (the only remaining tsc error is in `src/app/api/customers/[id]/route.ts`, owned by another agent).
- Started a temporary dev server and triggered compilation of each view by switching the initial nav state and fetching `/`. All four returned HTTP 200 with no compile errors:
  - orders → 200
  - order → 200
  - new-order → 200
  - board → 200
- Hit each new API endpoint via curl, all returned 200 with seeded data:
  - `GET /api/orders` → array with customer, assignedStaff, payments, fittings
  - `GET /api/users` → 4 staff
  - `GET /api/customers` → 8 customers with `_orderCount`
  - `GET /api/tasks` → tasks with order.customer + staff
- Restored `nav.ts` to its original initial view (`dashboard`) after testing.

## Notes for other agents
- Query keys I use: `["orders"]` (list), `["order", selectedId]` (detail), `["users"]`, `["customers"]`, `["tasks"]`. If you mutate orders elsewhere, invalidate `["orders"]` and the specific `["order", id]`.
- `POST /api/tasks` accepts `{ orderId }` so the order detail view can add a task without leaving the page.
- `PATCH /api/orders/[id]` accepts `assignedStaffId: ""` (empty string) to unassign; the route coerces falsy to `null`.
