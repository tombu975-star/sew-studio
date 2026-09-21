# Madam Studio — Fullstack Polish Worklog

Source: `madam-studio-flow.zip` (Vite + React + Base44 SDK atelier management app).
Target: Next.js 16 fullstack app with Prisma + SQLite, AI-powered Style Assist.

---
Task ID: 1
Agent: main
Task: Foundation — design system, Prisma schema, app shell, view router, shared components, seed.

Work Log:
- Analyzed source app: burgundy (#800020) / cream (#FBF9F7) editorial atelier aesthetic, Cormorant Garamond display + Plus Jakarta Sans body, role/mode toggle (Madam/Staff, Trainer/Trainee).
- Set up design system: globals.css (burgundy/cream theme, fonts via layout.tsx), layout.tsx (Plus Jakarta Sans + Cormorant Garamond).
- Prisma schema written + pushed: User, Customer, Order, Payment, Fitting, Task, MeasurementSet, StyleConcept, CustomerFeedback, Settings.
- Seed script (prisma/seed.ts) run: 4 staff, 8 customers, 28 orders across all statuses, payments, fittings, tasks, measurements, 2 approved style concepts, feedback.
- Shared libs: src/lib/format.ts (currency GHS, dates, ORDER_STATUSES, ENTRY_SOURCES, etc.), src/lib/types.ts (all domain types), src/lib/api.ts (fetch helpers), src/lib/db.ts (Prisma client).
- Stores: src/stores/nav.ts (Zustand view router: view + selectedId + params + go()), src/stores/role.ts (Zustand role/mode/ownerLabel, persisted to localStorage).
- Shared components: src/components/atelier/{StatusBadge,MetricCard,AtelierCard,StatusStepper,AppShell}.tsx.
- Providers: src/components/Providers.tsx (TanStack Query client).

Stage Summary — FOUNDATION COMPLETE. The following contract is BINDING for all subsequent tasks.

═══════════════════════════════════════════════════════════════════
## DESIGN SYSTEM (use exactly these tokens — do NOT introduce new colors)
═══════════════════════════════════════════════════════════════════
- Primary burgundy: `#800020` (hover `#6b0018`). Use for CTAs, active nav, accents.
- Background cream: `#FBF9F7` (already on body).
- Card surface: `bg-white`, border `border-[#E7E5E4]`, rounded-sm (NOT rounded-lg).
- Headings: `font-display font-semibold text-[#1C1917]` with inline `style={{ fontSize: 'clamp(...)' }}`.
- Body text: `text-stone-500` for muted, `text-[#1C1917]` for primary.
- Uppercase micro-labels: `text-[10px] or text-[11px] uppercase tracking-[0.18em] text-stone-500`.
- NO indigo/blue as primary. Status badges keep their semantic colors (defined in StatusBadge).
- Page wrapper: `<div className="p-5 md:p-8 max-w-[1400px] mx-auto w-full">`.
- Use existing shadcn/ui components from `@/components/ui/*`. Use `@/components/atelier/*` for atelier cards/metrics/badges/stepper.

## IMPORTS available
- `@/lib/utils` → cn()
- `@/lib/format` → formatCurrency, formatDate, shortDate, todayISO, isWithinDays, isOverdue, ORDER_STATUSES, ACTIVE_STATUSES, ENTRY_SOURCES, CUSTOMER_TYPES, PREFERRED_STYLES, PRIORITY_LEVELS
- `@/lib/types` → all domain interfaces
- `@/lib/api` → apiGet, apiPost, apiPatch, apiDelete
- `@/stores/nav` → useNav (view router): { view, selectedId, params, go(view, {id, params}) }
- `@/stores/role` → useRole: { role, ownerLabel, studioName, mode(), isStaff(), isTrainer(), isTrainee(), setRole, setMode }
- `@/components/atelier/{StatusBadge,MetricCard,AtelierCard,StatusStepper,AppShell}`
- `lucide-react` icons, `recharts` for charts, `framer-motion` optional.

═══════════════════════════════════════════════════════════════════
## API CONTRACT (backend must implement; views must call these)
═══════════════════════════════════════════════════════════════════
All routes under `src/app/api/`. Return JSON. Dates are ISO strings.

### Dashboard aggregate
- `GET /api/dashboard` → `{ orders: Order[], payments: Payment[], fittings: Fitting[], tasks: Task[], users: User[], customers: Customer[], settings: Settings, styleConcepts: StyleConcept[] }`
  (orders include customer + assignedStaff; payments/fittings/tasks as flat arrays with orderId)

### Customers
- `GET /api/customers` → `Customer[]` (each with computed `_orderCount?: number`)
- `POST /api/customers` body: Customer fields → `Customer`
- `GET /api/customers/[id]` → `{ customer: Customer, orders: Order[], measurements: MeasurementSet[], feedback: CustomerFeedback[], styleConcepts: StyleConcept[] }`
- `PATCH /api/customers/[id]` body: partial Customer → `Customer`

### Orders
- `GET /api/orders` → `Order[]` (include customer, assignedStaff, payments[], fittings[])
- `POST /api/orders` body: { customerId, garmentDesign, orderDate, deliveryDate?, status?, assignedStaffId?, sellingPrice?, fabricCost?, labourCost?, notes?, priority? } → `Order`
- `GET /api/orders/[id]` → `Order` (include customer, assignedStaff, payments[], fittings[], tasks[])
- `PATCH /api/orders/[id]` body: partial Order (esp. status) → `Order`
- `POST /api/orders/[id]/payments` body: { amount, method?, note? } → `Payment`
- `POST /api/orders/[id]/fittings` body: { date, status?, notes? } → `Fitting`
- `PATCH /api/fittings/[id]` body: partial Fitting → `Fitting`

### Tasks
- `GET /api/tasks` → `Task[]` (include order.customer, staff)
- `POST /api/tasks` body: { title, orderId?, staffId?, status?, priority?, dueDate?, notes? } → `Task`
- `PATCH /api/tasks/[id]` body: partial Task → `Task`

### Measurements
- `GET /api/customers/[id]/measurements` → `MeasurementSet[]`
- `POST /api/measurements` body: MeasurementSet fields → `MeasurementSet`

### Users / Settings
- `GET /api/users` → `User[]`
- `GET /api/settings` → `Settings` (singleton; create if missing)
- `PATCH /api/settings` body: partial Settings → `Settings`

### Style Concepts
- `GET /api/style-concepts?customerId=ID` → `StyleConcept[]`
- `POST /api/style-concepts` body: StyleConcept fields → `StyleConcept`
- `PATCH /api/style-concepts/[id]` body: partial (esp. status, rejectionReason, imageUrl) → `StyleConcept`

### AI endpoints (backend uses z-ai-web-dev-sdk)
- `POST /api/style-assist/generate` body: `{ customerId, request: { garmentType, occasion?, desiredLook?, season?, budget?, fabricAvailable?, colourPreference?, designerDirection? } }`
  → `{ dataConfidence: 'Limited'|'Good'|'Complete', confidenceNote: string, concepts: ConceptDraft[] }`
  ConceptDraft = { conceptName, silhouette?, neckline?, sleeveStyle?, length?, fabric?, colour?, detailing?, embellishment?, whyThisMayWork, fitConsiderations?, matchPercent?, designDirection? }
- `POST /api/style-assist/visualize` body: `{ concept: { conceptName, silhouette, fabric, colour, neckline, sleeveStyle, length, embellishment } }`
  → `{ imageUrl: string }` (uses image generation skill)
- `POST /api/insights/trends` body: `{ orders, payments, customers, fittings }` (summary arrays) → `{ suggestions: string[] }` (3-5 short business insights)

## z-ai-web-dev-sdk usage (server only)
- LLM: `import ZAI from 'z-ai-web-dev-sdk'; const zai = await ZAI.create(); const res = await zai.chat.completions.create({ messages:[{role:'system',content:...},{role:'user',content:...}], response_format:'json_object' })` — parse res.choices[0].message.content as JSON.
- Image gen: `const img = await zai.images.generate({ prompt, size:'1024x1024' }); const url = img.data[0].url` (check exact API in skill docs).

## VIEW FILE CONTRACT (each view is a default export, client component)
- `src/views/Dashboard.tsx` — default export `Dashboard`
- `src/views/Customers.tsx` — default export `Customers` (list)
- `src/views/CustomerProfile.tsx` — default export `CustomerProfile` (uses useNav selectedId)
- `src/views/Orders.tsx` — default export `Orders` (list)
- `src/views/OrderDetail.tsx` — default export `OrderDetail` (uses useNav selectedId)
- `src/views/NewOrder.tsx` — default export `NewOrder` (uses useNav params for prefill: customerId, garment)
- `src/views/ProductionBoard.tsx` — default export `ProductionBoard`
- `src/views/Fittings.tsx` — default export `Fittings`
- `src/views/Tasks.tsx` — default export `Tasks`
- `src/views/StyleAssist.tsx` — default export `StyleAssist` (uses useNav selectedId as customerId; if null, show a customer picker)
- `src/views/QuickQuote.tsx` — default export `QuickQuote`

The page.tsx router (written by main) renders: dashboard→Dashboard, customers→Customers, customer→CustomerProfile, orders→Orders, order→OrderDetail, new-order→NewOrder, board→ProductionBoard, fittings→Fittings, tasks→Tasks, style-assist→StyleAssist, quote→QuickQuote.

All views must be `"use client"` and self-contained (fetch their own data via @/lib/api + TanStack Query or useEffect).

---
Task ID: 3
Agent: full-stack-developer (dashboard)
Task: Build Dashboard view.

Work Log:
- Read worklog.md binding contract + shared imports (format, types, api, role, nav, atelier components MetricCard/AtelierCard/StatusBadge).
- Inspected AppShell.tsx to understand layout context (mobile bottom nav at fixed bottom-0 h-14, desktop left rail w-20) — confirmed view renders inside <main> and wrapper uses w-full.
- Confirmed TanStack QueryClient is wired in Providers.tsx (staleTime 30s, retry 1) so useQuery(['dashboard']) works.
- Created src/views/Dashboard.tsx — "use client", default export Dashboard.
- Fetches GET /api/dashboard via useQuery with key ['dashboard'] and apiGet; data typed as { orders, payments, fittings, tasks, users, customers, settings, styleConcepts }.
- useMemo computes all derived metrics: salesThisMonth, receivedThisMonth, outstanding, profit, activeOrders, statusCounts (all 11 ORDER_STATUSES), upcomingFittings (Scheduled, sorted asc, max 5), staffWorkload (per-user active orders + open tasks), avgMargin, healthStatus (At Risk > Needs Attention > On Track per spec thresholds), incomeSeries (last 6 months), attentionItems (due-soon, overdue tasks, Ready awaiting collection, open enquiries, quoted awaiting deposit).
- Madam view renders: banner (today's date + CalendarDays micro-label, font-display heading clamp(32px,5vw,44px), burgundy New Custom Order button calling go('new-order')), 4 MetricCards money row, Work+People grid (Active Orders horizontal scroll w-56 cards → go('order',{id}), Status Pipeline tiles, Upcoming Fittings list → order detail, Staff Workload with avatar circles + open-task badges), Income Trend AreaChart (recharts, burgundy #800020 fill + gradient, formatCurrency tooltip), Business Health card (health badge + 4 metric lines), Needs Attention card (amber AlertCircle bullets), AI Trend Suggestions card (Sparkles icon, Generate insights button → POST /api/insights/trends with structured summary {orders, payments, customers, fittings}, displays suggestions with emerald Check icons, loading state on button).
- Staff view (isStaff()): banner "Your Workbench", same Active Orders + Status Pipeline + Upcoming Fittings + "My Open Tasks" big-number card; skips money row, income trend, business health, attention, AI suggestions per spec.
- Mobile: floating burgundy FAB (bottom-20 right-4 z-40) for New Custom Order above the AppShell bottom nav.
- Local helpers: orderPaidTotal, orderCostTotal, sameMonth, monthlyIncome.
- Loading state: <div className="p-10 text-stone-400 text-sm">Loading the atelier…</div> per spec; error state for failed fetch.
- All currency via formatCurrency; no blue/indigo as primary — burgundy #800020 throughout.
- Verified: bun run lint shows zero errors for src/views/Dashboard.tsx (remaining lint errors are in upload/extracted legacy files and other agents' unfinished views). dev.log shows no Dashboard-specific compile errors.

Stage Summary:
- File created: src/views/Dashboard.tsx (~530 lines, single default export, "use client").
- Features: adaptive Madam/Staff dashboard, TanStack Query data fetch, 4 metric cards, active orders horizontal scroll, 11-tile status pipeline, upcoming fittings list, staff workload with avatars, 6-month income AreaChart, business health badge + metrics, needs-attention list, AI trend suggestions via POST /api/insights/trends, mobile FAB, full responsive grid collapse, loading + error + empty states.
- Consumes: @/lib/api (apiGet, apiPost), @/lib/format (formatCurrency, formatDate, shortDate, isWithinDays, isOverdue, ORDER_STATUSES, ACTIVE_STATUSES, ENTRY_SOURCES), @/lib/types, @/stores/nav (useNav.go), @/stores/role (useRole.isStaff, ownerLabel), @/components/atelier/{MetricCard, AtelierCard, StatusBadge}, @/components/ui/button, recharts, lucide-react.
- Backend dependency: GET /api/dashboard must return { orders, payments, fittings, tasks, users, customers, settings, styleConcepts } (orders include customer + assignedStaff). POST /api/insights/trends accepts { orders: {orderCount,totalSales,outstanding,statusBreakdown}, payments: {paymentsThisMonth,totalReceived}, customers: {count,customerSources}, fittings: {upcomingCount} } and returns { suggestions: string[] }.

---
Task ID: 7
Agent: full-stack-developer (fittings/tasks/quote)
Task: Build Fittings, Tasks, QuickQuote views.

Work Log:
- Read worklog.md completely — bound to burgundy/cream design system, shared imports, and API contract.
- Verified dashboard endpoint returns fittings with `order.customer` populated; verified `/api/tasks` returns tasks with `order.customer` + `staff`; verified `/api/orders` is available for the New Task dialog order picker.
- Fittings.tsx: dashboard-driven, status filter Select (All / Scheduled / Completed / Alterations Needed), two AtelierCard sections (Upcoming asc, Recent desc limit 15). Rows clickable to `go('order', { id: fitting.orderId })`; overdue Scheduled fittings highlighted in amber with AlertCircle. Empty states, loading skeletons, error state.
- Tasks.tsx: `/api/tasks` Kanban with 3 AtelierCard columns (To Do / In Progress / Done) + counts. Task cards (border #E7E5E4 rounded-sm p-3 bg-white) show title, linked garment + customer, staff avatar initial, dueDate (amber if overdue & not Done), priority StatusBadge, and a compact status-change Select that PATCHes `/api/tasks/[id]` with optimistic invalidation. Staff + priority filter Selects derived from task data. New Task dialog (burgundy CTA): title, priority, dueDate, optional linked Order select (from `/api/orders`), notes → POST `/api/tasks` via useMutation with sonner toasts.
- QuickQuote.tsx: live in-client pricing calculator. Form (AtelierCard) for garment type, fabric (with per-yard cost shown in option label), yards (default 3), complexity (multiplier shown in option), embellishment (addon shown in option), rush Switch. Live summary (sticky on desktop) shows fabricCost, labour (base × multiplier), embellishment, subtotal, rush premium (25% when on), big burgundy Total, suggested 50% deposit. "Convert to Order" button → `go('new-order', { params: { garment: '${garment} — ${fabric}' } })`. Two-column grid (md+) collapsing to single column on mobile.
- All currency via `formatCurrency`, dates via `formatDate` / `shortDate`, `isOverdue` for amber highlighting. Responsive (mobile-first), burgundy primary CTAs, rounded-sm, #E7E5E4 borders, font-display headings with clamp() sizing.
- Lint: zero ESLint errors on the three new files (`bunx eslint src/views/Fittings.tsx src/views/Tasks.tsx src/views/QuickQuote.tsx`).
- TypeScript: zero `tsc --noEmit` errors against the three new files.
- Dev server log: only remaining "Module not found" errors are for `@/views/StyleAssist` and `@/views/ProductionBoard` — other agents' scope, not mine.

Stage Summary:
- Files created:
  - `src/views/Fittings.tsx` — default export `Fittings`
  - `src/views/Tasks.tsx` — default export `Tasks`
  - `src/views/QuickQuote.tsx` — default export `QuickQuote`
- Features delivered:
  - Fittings: status-filtered list with Upcoming/Recent sections, overdue amber highlight, navigation to order detail.
  - Tasks: Kanban board with inline status transitions, staff + priority filters, New Task dialog.
  - Quick Quote: instant price estimator with line items, rush premium, deposit suggestion, and one-tap convert-to-order.
- All views are `"use client"` default exports, self-contained, and align with the worklog contract.

---
Task ID: 6
Agent: full-stack-developer (style-assist)
Task: Build AI Style Assist view.

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to burgundy/cream design system, shared imports (apiGet/apiPost/apiPatch, useNav, types), and API contract (POST /api/style-assist/generate, POST /api/style-assist/visualize, POST /api/style-concepts, PATCH /api/style-concepts/[id], GET /api/customers, GET /api/customers/[id]).
- Reviewed original Vite StyleAssist.jsx + styleassist/{DesignRequestForm,CustomerStyleSummary,ConceptCard}.jsx for behavior reference; rewrote everything to fit the Next.js contract.
- Created src/views/StyleAssist.tsx (~1315 lines, single self-contained "use client" file with inline sub-components).
- CustomerPicker: centered AtelierCard "Choose a client to design for" with Select of all customers from GET /api/customers (TanStack Query, loading/error states). On pick → go('style-assist', { id }).
- StyleAssistForCustomer: useQuery on GET /api/customers/[id] → { customer, orders, measurements, feedback, styleConcepts }. Renders back-link → go('customer', { id }), Sparkles + "Style Assist" header (font-display clamp), 1/3 + 2/3 grid (lg:grid-cols-3).
- CustomerStyleSummary (left 1/3, AtelierCard titled "{name} — Style Profile"): preferred style chips, favourite colours chips, colours-to-avoid (orange chips), favourite fabrics / preferred fit / design preferences / style notes rows; latest measurement set (bust/waist/hip from MeasurementSet + height from Customer.height, with date); previous orders count + 5 most recent with StatusBadge; recent feedback with star ratings (filled burgundy Stars); data confidence indicator (Limited/Good/Complete dot + note) shown only after first generation.
- DesignRequestForm (top of right 2/3, AtelierCard "Design Request"): Garment Type (required Input), Occasion, Desired Look, Season Select (Dry Season, Harmattan, Raining Season, Festive, Year-round), Budget (GHS number), Fabric Available, Colour Preference, Designer Direction Textarea, Generate Concepts button (burgundy bg-[#800020] hover:bg-[#6b0018], Sparkles icon, spinner + "Designing…" while generating, disabled if garmentType empty).
- ConceptCard (inline): header (conceptName font-display text-lg + burgundy-tinted "% match" pill + StatusBadge if saved), image area (aspect-[3/4] bg-[#FBF9F7] rounded-sm frame — shows <img> if imageUrl else a prominent "Visualize Concept" placeholder button with Wand2 icon, hover-fill animation, per-concept loading state), specs grid (silhouette, neckline, sleeve, length, fabric, colour, detailing, embellishment — 2 cols mobile / 3 cols sm+), "Why this may work" tinted box (bg-[#FBF9F7] border-l-2 border-[#800020]/30 pl-3), fit considerations + design direction paragraphs, actions row (Approve emerald + Reject outline + Convert to Order burgundy for drafts; Convert to Order + Visualize-if-Approved-and-no-image for saved). Reject opens inline reason picker (chips + freeform textarea + Confirm Dismiss).
- ConceptSkeleton: pulse-animated skeleton cards shown while generating (when no drafts yet).
- Data flow: handleGenerate → POST /api/style-assist/generate { customerId, request } → set drafts + dataConfidence/confidenceNote. handleVisualize → POST /api/style-assist/visualize { concept } → { imageUrl }; if saved concept PATCH /api/style-concepts/[id] { imageUrl } + refetch, if draft update local drafts state. handleApprove/handleReject → POST /api/style-concepts with all concept + request fields + status + dataConfidence (+ rejectionReason) → remove from drafts + refetch. handleConvert → go('new-order', { params: { customerId, garment: "conceptName — silhouette — fabric — colour" } }).
- Empty state, error toasts (sonner), loading skeletons, graceful "Could not load customer" retry card all implemented. Responsive: grid collapses on mobile; specs grid 2/3 cols; form 1/2 cols.
- Lint: zero ESLint errors/warnings on src/views/StyleAssist.tsx (bun run lint). TypeScript: zero tsc errors against the file (npx tsc --noEmit --skipLibCheck).

Stage Summary:
- File created: src/views/StyleAssist.tsx — single self-contained "use client" default export with inline sub-components (CustomerPicker, StyleAssistForCustomer, CustomerStyleSummary, DesignRequestForm, ConceptCard, ConceptSkeleton).
- Features: customer picker → AI design request form → AI concept generation (POST /api/style-assist/generate) → per-concept AI image visualization (POST /api/style-assist/visualize) → approve/reject-with-reason → save (POST /api/style-concepts) → convert to order (go new-order with prefilled garment) → saved-concepts gallery (filter status !== Rejected). Editorial aesthetic (burgundy #800020, cream #FBF9F7, rounded-sm, font-display headings, clamp() sizing). Loading skeletons, error toasts, empty state, full responsiveness.
- Consumes: @/lib/api (apiGet, apiPost, apiPatch), @/lib/types (Customer, Order, MeasurementSet, CustomerFeedback, StyleConcept), @/lib/format (shortDate), @/stores/nav (useNav.go), @/components/atelier/{AtelierCard, StatusBadge}, @/components/ui/{Button, Input, Label, Textarea, Separator, Select + parts}, @tanstack/react-query (useQuery + refetch), sonner (toast), lucide-react (Sparkles, ArrowLeft, Check, X, Loader2, Wand2, ShoppingBag, Star).
- AI integration: GET /api/customers + GET /api/customers/[id] for context, POST /api/style-assist/generate for concept drafts (returns dataConfidence, confidenceNote, concepts[]), POST /api/style-assist/visualize for per-concept AI image rendering, POST /api/style-concepts + PATCH /api/style-concepts/[id] for persistence. AI endpoints remain TBD by backend agents — the view degrades gracefully with toast errors until they exist.

---
Task ID: 4
Agent: full-stack-developer (customers)
Task: Build Customers list + CustomerProfile views.

Work Log:
- Read worklog.md for BINDING design system, API contract, and shared imports.
- Built `src/views/Customers.tsx` (default export `Customers`): list page with header + Add Customer button (burgundy), search Input with absolute-left Search icon (filters by name/phone/email), Client Sources breakdown chips (entrySource counts), customer list as `divide-y` rows with avatar initials + Phone/Mail subtext + order count, Add Customer Dialog (Name, Phone, Email, Gender select, City, Entry Source select, Referred By conditional on Referral, Customer Type select, comma-separated Preferred Styles, Notes) that POSTs to `/api/customers` and invalidates the customers query, sonner toast on success. Loading skeletons + empty states. Falls back to fetching `/api/orders` for client-side order counts.
- Built `src/views/CustomerProfile.tsx` (default export `CustomerProfile`): reads `selectedId` from `useNav` (prompt if null); back link to customers; CustomerHeader (w-16 avatar, font-display name, contact row with Phone/Mail/MessageSquare/MapPin, customer type StatusBadge, entry source, loyalty points, Edit button); prominent burgundy "Open Style Assist" CTA → `go('style-assist', { id: selectedId })`; Tabs (Overview/Measurements/Orders/Style/Notes) with horizontal scroll on mobile. Overview = AtelierCard facts grid (Customer Since, Occupation, Gender, Height/Weight, Preferred Fit, Skin Tone) + Style Snapshot card (favourite colours / colours to avoid / favourite fabrics / preferred styles) + recent feedback with Stars. Measurements = cards per set with bust/waist/hip/shoulder/length/sleeve + Add Measurement Dialog (numeric inputs + notes, POST `/api/measurements`). Orders = clickable rows (garmentDesign, shortDate, staff, StatusBadge, formatCurrency) → `go('order', { id })` plus "New Order for {name}" → `go('new-order', { params: { customerId } })`. Style = concept cards with imageUrl, matchPercent + status badges, silhouette/fabric/colour, whyThisMayWork (Rejected dimmed). Notes = General + Style AtelierCards. `useQuery(['customer', selectedId])` refetches on id change and after edits. EditPersonalDialog reuses Add form prefilled, PATCHes `/api/customers/[id]`. Loading skeleton + error retry.
- Built backend API routes (folders were empty) so the views work end-to-end:
  - `src/app/api/customers/route.ts`: GET (returns `_orderCount` via `_count.orders`), POST (validates name, coerces height/weight/loyaltyPoints).
  - `src/app/api/customers/[id]/route.ts`: GET (`{ customer, orders (with assignedStaff), measurements, feedback, styleConcepts }`), PATCH (whitelisted string + numeric fields, null coercion).
  - `src/app/api/measurements/route.ts`: POST (validates customerId + existence, coerces numeric measurement fields).
- All routes strictly typed via `Prisma.*Unchecked*Input` namespaces.
- Verified: `bunx tsc --noEmit` clean for my files; `bun run lint` clean; dev log shows `GET /api/customers 200`.

Stage Summary:
- Files created:
  - `src/views/Customers.tsx` — Customers list (search, source breakdown, add dialog, order counts).
  - `src/views/CustomerProfile.tsx` — Customer detail (header, Style Assist CTA, 5 tabs, edit + measurement dialogs).
  - `src/app/api/customers/route.ts` — GET list / POST create.
  - `src/app/api/customers/[id]/route.ts` — GET detail aggregate / PATCH update.
  - `src/app/api/measurements/route.ts` — POST create.
- Features: full burgundy/cream/stone design system, responsive grids, horizontal-scroll tabs on mobile, loading/empty/error states, sonner toasts, TanStack Query with proper cache invalidation, formatCurrency/formatDate/shortDate throughout, rounded-sm borders, AtelierCard + StatusBadge reuse.

---
Task ID: 5
Agent: full-stack-developer (orders+board)
Task: Build Orders list, Order detail, New Order, ProductionBoard.

Work Log:
- Read worklog.md (binding design system + API contract). Confirmed no /api/orders, /api/customers, /api/users, /api/tasks routes existed yet — implemented all of them so the views can run.
- Created API routes:
  - src/app/api/orders/route.ts (GET list with customer/assignedStaff/payments/fittings; POST create)
  - src/app/api/orders/[id]/route.ts (GET full order with tasks; PATCH partial incl. status)
  - src/app/api/orders/[id]/payments/route.ts (POST record payment)
  - src/app/api/orders/[id]/fittings/route.ts (POST schedule fitting)
  - src/app/api/customers/route.ts (GET with _orderCount; POST)
  - src/app/api/users/route.ts (GET list staff)
  - src/app/api/tasks/route.ts (GET with order.customer + staff; POST supports orderId)
- Built src/views/Orders.tsx: list with status/staff filters + search, table-like card with customer avatar initials, garment, dates, overdue highlight, StatusBadge, price/paid columns, High priority marker. Loading + empty states.
- Built src/views/OrderDetail.tsx: header with garment title + clickable customer name + status Select (PATCH), Order Journey StatusStepper, 2/3 + 1/3 grid with Financials (record payment Dialog + payments list), Fittings (schedule Dialog + list), Tasks (add Dialog + list), Notes editor (PATCH), Customer Snapshot, simple Timeline.
- Built src/views/NewOrder.tsx: AtelierCard form with Customer Select, Garment Textarea (prefilled+decoded from params.garment), dates, status/staff/priority Selects, three cost inputs, notes. Submit → POST /api/orders → go('order', {id}). Disables while saving, toast on success/error.
- Built src/views/ProductionBoard.tsx: 6 columns horizontally scrollable, staff filter, OrderCards with customer/garment/StatusBadge/priority dot/delivery/paid mini line. @dnd-kit DnD with useDroppable columns + useDraggable cards + DragOverlay, PointerSensor distance:5 so clicks still navigate. onDragEnd PATCHes status to column's first status with optimistic update + rollback.
- Added upload/**, download/**, tests/** to eslint ignores (pre-existing lint errors in the original Vite source zip).

Stage Summary:
- Files delivered: src/views/Orders.tsx, src/views/OrderDetail.tsx, src/views/NewOrder.tsx, src/views/ProductionBoard.tsx (+ 7 API route files, + eslint config tweak).
- Features: list filter/search, status changer, payment recording, fitting scheduling, task adding inline, notes editing, prefill new-order from params, kanban drag-and-drop across 6 stages.
- DnD approach: @dnd-kit/core — DndContext wraps the column row, each column is useDroppable (id = col.key, isOver renders burgundy ring), each card is useDraggable (id = order.id, CSS.Translate transform, opacity drop while dragging), PointerSensor activationConstraint distance:5 so clicks still navigate to order detail, DragOverlay renders rotated+shadowed clone, closestCorners collision. onDragEnd PATCHes /api/orders/{id} with the target column's first status. Optimistic update via TanStack onMutate (snapshot + mutate cached array) + onError rollback + onSettled invalidate. Toast confirms each move.
- Verified: bun run lint clean; tsc --noEmit clean for my files; dev server compiled all 4 views with HTTP 200 and no errors; all 4 new API endpoints return 200 with seeded data.

---
Task ID: 9 (login feature)
Agent: main
Task: Add a real login page + database-backed auth that gates the whole app.

Work Log:
- Added `password` field to User schema; ran db:push (non-destructive) + re-seeded all staff with password "atelier2025".
- Built 3 auth API routes (cookie session):
  - POST /api/auth/login — validates email+password against DB, sets httpOnly `ms_session` cookie (base64 id:email, 7-day expiry).
  - POST /api/auth/logout — clears cookie.
  - GET /api/auth/me — reads cookie, returns current user or null.
- Built src/stores/auth.ts (Zustand): user, status (loading/authenticated/unauthenticated), hydrate(), login(), logout(). On login/hydrate it syncs the role store (ownerLabel from gender, default role from user.role).
- Built src/components/atelier/LoginPage.tsx — elegant split-layout login: editorial left panel (burgundy gradient over AI-generated atelier image, studio name, tagline "Where every stitch tells a story"), right panel with email/password form, show/hide password, demo-account quick-fill chips, error states.
- Generated /public/atelier-login.jpg (768x1344 atelier interior) via image-generation skill.
- Updated src/app/page.tsx with an AuthGate: loading screen while hydrating → LoginPage when unauthenticated → AppShell+views when authenticated.
- Added user chip + logout button to AppShell (desktop rail bottom + mobile header).
- Restarted dev server to load the regenerated Prisma client (cached globalForPrisma had the pre-password schema).

Stage Summary:
- Auth fully working: verified login (correct → user, wrong → 401), cookie session (/me returns user with cookie, null without).
- Demo accounts: madam@studio.com / akos@studio.com / yaw@studio.com / esi@studio.com — all password "atelier2025".
- Lint clean. App now requires sign-in before reaching the dashboard.
