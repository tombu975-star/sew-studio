Task ID: 13
Agent: full-stack-developer (premium orders+board)
Task: Redesign Orders, OrderDetail, NewOrder, ProductionBoard to premium.

# Work Log

- Read /home/z/my-project/worklog.md completely — bound to the PREMIUM REDESIGN CONTRACT (design tokens, premium primitives, quality bar). Confirmed imports available: PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState (+ SkeletonCard/SkeletonList/SkeletonRow), PremiumButton, StatusBadge, StatusStepper from @/components/atelier/*; shadcn Dialog/Input/Label/Textarea/Select/Tabs/Sheet/Switch; apiGet/apiPost/apiPatch/apiDelete; ORDER_STATUSES + ACTIVE_STATUSES + PRIORITY_LEVELS + formatCurrency + shortDate + formatDate + todayISO + isOverdue; useNav router.
- Inspected existing Orders.tsx, OrderDetail.tsx, NewOrder.tsx, ProductionBoard.tsx (legacy AtelierCard-based) and all premium primitives (PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState, PremiumButton, StatusBadge, StatusStepper) + globals.css tokens (lift, surface-premium, elevate-*, animate-fade-in-up, scroll-slim, shimmer, tabular-nums) before rewriting.
- Rewrote src/views/Orders.tsx: PageHeader (eyebrow "Production" + ShoppingBag icon, "Orders" title, subtitle, PremiumButton "New Order" → go('new-order')). Premium stat strip — 4 PremiumMetrics (Total Orders / Active / Ready for Collection / Completed This Month) in grid-cols-2 lg:grid-cols-4. Filter bar in SectionCard (py-3 body): status Select + staff Select + search Input. Orders table inside SectionCard (p-0): sticky header row with uppercase tracking-[0.18em] labels (Customer, Garment, Ordered, Delivery, Status, Amount, Paid), each row clickable → go('order', {id}), gradient avatar (AVATAR_GRADIENTS) + name + High priority burgundy dot, garment truncate 1 line, orderDate/deliveryDate shortDate + amber AlertCircle when overdue, StatusBadge, sellingPrice tabular-nums, paid with thin % progress bar (emerald when fully paid, burgundy otherwise). Loading: SkeletonList. Empty: EmptyState with ShoppingBag icon + Clear filters CTA. Wrapper p-5 md:p-8 max-w-[1300px].
- Rewrote src/views/OrderDetail.tsx: back link to orders. Premium header band (rounded-xl elevate-md surface-premium border p-6) with garmentDesign font-display clamp(26-34px), clickable customer name with small gradient avatar, meta row (orderDate, deliveryDate amber+AlertCircle if overdue, priority StatusBadge, assigned staff with UserCircle2 icon). Right side: status Select (premium styled) → PATCH + toast, PremiumButton Edit (outline). StatusStepper inside SectionCard "Order Journey". 2/3 + 1/3 grid: LEFT — Financials SectionCard (premium 6-stat breakdown with tabular-nums, Selling/Paid/Outstanding/Fabric/Labour/Margin with ok/warn tones, payment progress bar, "Record Payment" PremiumButton → Dialog (amount/method/note) → POST /api/orders/[id]/payments, payments list as rows with avatar circle + CheckCircle2 icon + date/method/note). Fittings SectionCard with schedule Dialog. Tasks SectionCard with add Dialog (POST /api/tasks with orderId). Notes SectionCard with NotesEditor (Textarea + Save/Cancel PremiumButtons) → PATCH. RIGHT — Customer Snapshot (gradient avatar, clickable name, contact rows, Entry Source/Preferred Styles rows, "View profile" PremiumButton ghost sm → customer profile). Timeline SectionCard (Created / Last updated / days in production). Loading: shimmer header + SkeletonCard grid. Empty: EmptyState for missing order.
- Rewrote src/views/NewOrder.tsx: back link to orders. PageHeader (eyebrow "New commission" + Pencil icon, "New Custom Order"). SectionCard containing form: Customer required Select, Garment Design required Textarea (prefill from params.garment decodeURIComponent), Order Date (default today) + Delivery Date date inputs, Status Select (default Enquiry), Assigned Staff Select (Unassigned default), Selling/Fabric/Labour cost number inputs with tabular-nums, Priority Select, Notes Textarea. LIVE margin preview (emerald if positive, amber if negative) with AnimatedNumber (currency format, 400ms duration) + TrendingUp icon, updates as user types. Submit PremiumButton primary full-width with loading state → POST /api/orders → go('order', {id}) + toast. Wrapper max-w-[820px].
- Rewrote src/views/ProductionBoard.tsx: PageHeader (eyebrow "Live workflow" + LayoutGrid icon, "Production Board", subtitle, actions = staff filter Select). 6 BOARD_COLUMNS (consultation / confirmed / production / fitting / ready / done). Each column: w-80 shrink-0 rounded-xl border bg-[#faf8f5]/60 elevate-sm. Header: uppercase tracking-[0.22em] micro-label + count pill (rounded-full white bg + border). Body: max-h-[72vh] overflow-y-auto scroll-slim space-y-2.5 p-2.5. Premium OrderCard (useDraggable): rounded-lg bg-white border p-3.5 elevate-sm lift cursor-grab active:cursor-grabbing, gradient avatar dot + customer name, garment truncate 2 lines font-medium, delivery shortDate (amber + AlertCircle if overdue), StatusBadge, High priority dot, thin paid-progress bar with %. DragOverlay renders rotated shadowed clone. PointerSensor distance:5 so clicks still navigate. closestCorners collision. onDragEnd → PATCH /api/orders/[id] {status: column.statuses[0]} with optimistic update (onMutate snapshot + mutate cached array, onError rollback, onSettled invalidate ['orders'] + ['order']). Toast on drop. Empty: EmptyState with New Order CTA. Loading: shimmer column skeletons.
- Premium quality bar across all 4 files: SectionCard everywhere, elevate-sm + lift on interactive cards, gradient avatars (hashIndex for stable colour), tabular-nums on all money, AnimatedNumber on NewOrder margin, PremiumButton for all CTAs with loading states, paid-progress bars on order cards/rows (emerald when full, burgundy when partial), animate-fade-in-up on PageHeader / header band, sonner toasts for all mutations, SkeletonList/SkeletonCard loaders, EmptyState for empties, responsive (board scrolls horizontally with scroll-slim; table collapses to 2-col grid on mobile). Burgundy #800020 primary throughout; no indigo/blue accents.
- Lint: bun run lint clean (no errors). tsc --noEmit clean for the four files. dev.log shows successful compiles after each save (Compiled in 8-11s) with GET / 200.

# Stage Summary

Files rewritten (4):
- src/views/Orders.tsx — premium list with stat strip, refined filters, gradient-avatars table, paid progress bars.
- src/views/OrderDetail.tsx — premium header band, StatusStepper journey, premium financials with progress bar, dialogs for payments/fittings/tasks, notes editor, customer snapshot + timeline.
- src/views/NewOrder.tsx — premium form with live AnimatedNumber margin preview.
- src/views/ProductionBoard.tsx — premium kanban with @dnd-kit/core (PointerSensor distance:5, useDroppable columns, useDraggable cards, CSS.Translate transform, opacity 0.4 while dragging, DragOverlay rotated clone, closestCorners collision, optimistic PATCH + invalidate + toast).

Premium features:
- PageHeader + SectionCard + PremiumMetric + PremiumButton + StatusBadge + StatusStepper + AnimatedNumber + EmptyState + SkeletonList/SkeletonCard
- Gradient avatars (hashIndex for stable colour)
- tabular-nums on all money
- Thin paid-progress bars on rows/cards (emerald when full, burgundy when partial)
- emerald/burgundy/amber semantic tones
- animate-fade-in-up on headers
- sonner toasts on every mutation
- Responsive: board scrolls horizontally (scroll-slim), table collapses to 2-col grid on mobile

DnD approach:
- @dnd-kit/core DndContext wraps the columns row
- Each column is useDroppable({id: col.key}) with isOver rendering burgundy ring
- Each card is useDraggable({id: order.id}) with CSS.Translate.toString(transform) + opacity drop while dragging
- DragOverlay renders a rotated shadowed clone
- PointerSensor activationConstraint distance:5 so clicks still navigate to order detail
- closestCorners collision detection
- onDragEnd PATCHes /api/orders/{id} with target column's first status with optimistic update (onMutate snapshot + cache mutate, onError rollback, onSuccess invalidate ['orders'] + ['order']) + sonner toast

Verified:
- bun run lint clean
- tsc --noEmit clean for the four files
- dev server compiled successfully with HTTP 200
