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

---
Task ID: 10 (premium redesign foundation)
Agent: main
Task: Establish premium design system + primitives for full UI redesign.

Work Log:
- Upgraded globals.css: premium elevation tokens (--shadow-xs/sm/md/lg/burgundy), refined radius (0.375rem), warmer background (#faf8f5), premium utilities (lift hover, shimmer skeleton, animate-fade-in-up, surface-premium gradient, text-gradient-burgundy, tabular-nums, elevate-* classes).
- Built premium primitives in src/components/atelier/:
  - PageHeader.tsx — editorial header with eyebrow + display title + actions, fade-in-up animation
  - SectionCard.tsx — elevated surface-premium card with lift hover, optional accent left-border
  - PremiumMetric.tsx — metric card with icon, trend delta badge, inline Sparkline SVG
  - AnimatedNumber.tsx — counts up to target with easeOutCubic
  - EmptyState.tsx — icon + title + description + action; SkeletonCard/SkeletonRow/SkeletonList shimmer placeholders
  - PremiumButton.tsx — variants (primary/secondary/ghost/outline/danger) + sizes + loading state, burgundy shadow on primary
  - StatusBadge.tsx — refined with better contrast + dot indicator
- Existing AtelierCard + MetricCard kept for backward compat but NEW views should use SectionCard + PremiumMetric.

Stage Summary — PREMIUM DESIGN SYSTEM READY.

═══════════════════════════════════════════════════════════════════
## PREMIUM REDESIGN CONTRACT (binding for all redesign agents)
═══════════════════════════════════════════════════════════════════

### Design tokens (use these EXACT classes)
- Page bg: body already #faf8f5. Page wrapper: `<div className="p-5 md:p-8 max-w-[1400px] mx-auto w-full">`
- Primary burgundy `#800020`, hover `#6b0018`. Cream surface `#faf8f5`. Card border `#E7E5E4`.
- Card surface: use `surface-premium` (subtle white→off-white gradient) + `border border-[#E7E5E4] rounded-lg elevate-sm lift`
- Headings: `font-display font-semibold text-[#1C1917]` with `style={{ fontSize: 'clamp(...)' }}`
- Micro-labels: `text-[10px] uppercase tracking-[0.22em] text-stone-400` (use tracking-[0.18em] for card titles)
- Financial numbers: wrap in `tabular-nums` (or use AnimatedNumber for hero metrics)
- Hover lift: `lift` class on cards (translates Y -2px on hover)
- Animations: `animate-fade-in-up` on page sections, `animate-fade-in` on actions

### Premium primitives (PREFER these over old AtelierCard/MetricCard)
- `import { PageHeader } from "@/components/atelier/PageHeader"` — `<PageHeader eyebrow="..." eyebrowIcon={Icon} title="..." subtitle="..." actions={...} />`
- `import { SectionCard } from "@/components/atelier/SectionCard"` — `<SectionCard title="..." action={...} accent>{children}</SectionCard>`
- `import { PremiumMetric, Sparkline } from "@/components/atelier/PremiumMetric"` — `<PremiumMetric label="..." value="..." accent trend="up" trendLabel="+12%" spark={[...]} icon={Icon} />`
- `import { AnimatedNumber } from "@/components/atelier/AnimatedNumber"` — `<AnimatedNumber value={1234} format="currency" />`
- `import { EmptyState, SkeletonCard, SkeletonRow, SkeletonList } from "@/components/atelier/EmptyState"`
- `import { PremiumButton } from "@/components/atelier/PremiumButton"` — `<PremiumButton variant="primary" size="md" loading={...}>...</PremiumButton>`
- `import { StatusBadge } from "@/components/atelier/StatusBadge"` — refined badges with dot

### Existing (still available)
- `@/components/atelier/StatusStepper` — order journey stepper
- `@/lib/format` — formatCurrency, formatDate, shortDate, ORDER_STATUSES, ACTIVE_STATUSES, etc.
- `@/lib/api` — apiGet, apiPost, apiPatch, apiDelete
- `@/lib/types` — all domain interfaces
- `@/stores/nav` — useNav (view, selectedId, params, go)
- `@/stores/role` — useRole (role, ownerLabel, mode(), isStaff(), setRole, setMode)
- `@/stores/auth` — useAuth (user, login, logout, status)
- shadcn ui: Dialog, Input, Label, Textarea, Select, Tabs, Sheet, Switch, etc. from `@/components/ui/*`

### Quality bar for "premium"
1. Use SectionCard (not raw divs) for all card containers
2. Use PremiumMetric with sparklines for dashboard KPIs
3. Use AnimatedNumber for hero financial figures
4. Use SkeletonCard/SkeletonList during loading (NOT "Loading…")
5. Use EmptyState with icon + helpful copy for empty states
6. Use PremiumButton for all CTAs (with loading states)
7. Add `animate-fade-in-up` to top page section, `lift` to interactive cards
8. Tabular numbers on all financial figures (`tabular-nums` or AnimatedNumber)
9. Consistent rounded-lg + elevate-sm on cards, rounded-md on buttons/badges
10. Toasts via `sonner` for all mutations

### API contract (unchanged — all working)
GET /api/dashboard, /api/customers, /api/customers/[id], /api/orders, /api/orders/[id], /api/tasks, /api/users, /api/settings, /api/style-concepts?customerId=, /api/customers/[id]/measurements
POST /api/customers, /api/orders, /api/orders/[id]/payments, /api/orders/[id]/fittings, /api/tasks, /api/measurements, /api/style-concepts
PATCH /api/customers/[id], /api/orders/[id], /api/tasks/[id], /api/fittings/[id], /api/style-concepts/[id], /api/settings
DELETE /api/orders/[id]
AI: POST /api/style-assist/generate, /api/style-assist/visualize, /api/insights/trends
Auth: POST /api/auth/login, /api/auth/logout, GET /api/auth/me

---
Task ID: 14
Agent: full-stack-developer (premium style-assist)
Task: Redesign Style Assist to a stunning premium AI showcase.

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to PREMIUM REDESIGN CONTRACT: burgundy #800020 / cream #faf8f5 tokens, surface-premium + elevate-* + lift + animate-fade-in-up + shimmer utilities, premium primitives (PageHeader, SectionCard, PremiumButton, EmptyState, SkeletonCard, StatusBadge, AnimatedNumber, PremiumMetric).
- Inspected all premium primitives (PageHeader, SectionCard, PremiumButton, EmptyState/SkeletonCard, StatusBadge, AnimatedNumber, PremiumMetric) and confirmed utility classes in globals.css (animate-fade-in-up, surface-premium, lift, shimmer, elevate-sm/md/burgundy, tabular-nums, text-gradient-burgundy).
- Rewrote src/views/StyleAssist.tsx from scratch — single "use client" default export with inline sub-components (CustomerPicker, StyleAssistForCustomer, CustomerStyleProfile, DesignRequestForm, ConceptCard, ConceptSkeleton, plus DefCell/MeasureCell/TintedNote/Field/SectionLabel helpers).
- CustomerPicker: centered SectionCard with a burgundy gradient hero (Sparkles in glassy circle backdrop-blur, decorative radial gradient overlay, white display heading + subtitle), then a body with uppercase-tracked Label, premium Select trigger (h-11 rounded-md) with avatar-initials in dropdown items, and an AI-context hint footer.
- PageHeader used for the main page with eyebrow "AI Design Studio" + Sparkles icon, title "Style Assist", subtitle "Generate bespoke concepts, visualize them, and convert to orders.", and an actions slot showing an "AI-powered" pill (burgundy tint with Sparkles).
- Back link uses ArrowLeft with hover translate animation.
- Layout: grid grid-cols-1 lg:grid-cols-3 gap-5 with left rail sticky (lg:sticky lg:top-5). Right 2/3 stacks DesignRequestForm → concept sections.
- CustomerStyleProfile: SectionCard with no body padding, then a burgundy gradient hero header (avatar initials in glassy circle + Style Profile eyebrow + name + customerType/orderCount sub-line, decorative radial overlay). Body uses tinted burgundy chips for preferred styles (rounded-md bg-[#800020]/8 text-[#800020] px-2 py-1 text-xs), a 2-col DefCell grid (Favourite Colours / Colours to Avoid / Favourite Fabrics / Preferred Fit — avoid uses orange accent), TintedNote boxes for Design Preferences + Style Notes (burgundy-tinted border-left + subtle stone variant), latest measurements as a 2-col MeasureCell mini-grid with tabular-nums (bust/waist/hip + height from customer.height), previous orders count + 3 recent with StatusBadge, recent feedback with star ratings + italic quote, and a Data Confidence pill (amber/sky/emerald by level with ringed dot) shown only after first generation + confidenceNote caption.
- DesignRequestForm: SectionCard titled "Design Request" with a Scissors "Brief" action micro-label. Premium 2-col field grid (sm:grid-cols-2) using h-10 rounded-md Inputs; Garment Type marked required with burgundy asterisk; Season as Select; Budget input has tabular-nums. Designer Direction is a full-width Textarea. Footer row separated by hairline border with hint text + a size="lg" PremiumButton "Generate Concepts" (Sparkles icon, loading state shows "Designing…", disabled if garmentType empty).
- ConceptCard: surface-premium rounded-xl border elevate-md lift overflow-hidden — looks like a luxury fashion lookbook. Header row: conceptName (font-display clamp 18-22px) + showStatusBadge if saved + burgundy gradient matchPercent pill (bg-gradient-to-br from-[#800020] to-[#6b0018] text-white elevate-burgundy with Sparkles icon). Image area is aspect-[4/5] with bg-gradient-to-br from-[#faf8f5] to-[#f5f1ec] frame, rounded-lg with shadow-inner; if imageUrl, <img> object-cover with subtle inset shadow + fade-in on load (imageLoaded state + Loader2 spinner until loaded); if no image and not visualizing, a centered Visualize button (PremiumButton-style with Wand2 icon, circle that fills burgundy on hover); if visualizing, a shimmer overlay with white backdrop-blur circle containing Loader2 + "Painting your concept…" + caption. A decorative "AI Visual" corner label appears when image is loaded. Specs grid: 3-col on sm+, 2-col on mobile, each spec has an uppercase micro label with optional icon (Shirt for silhouette, Scissors for fabric, Palette for colour) + value. "Why this may work" is a tinted box bg-[#800020]/4 border-l-2 border-[#800020]/30 pl-3 py-2 rounded-r-md with burgundy micro label. Fit Considerations + Design Direction in a 2-col grid with small icons. Actions row (under hairline border): drafts get Approve (PremiumButton with bg-[#15803D] hover-[#128037] emerald override), Reject (outline), and Convert to Order (primary, ShoppingBag, ml-auto). Saved concepts get Convert to Order + (if Approved and no image) Visualize (outline, Wand2). Reject opens inline reason picker with REJECT_REASONS chips (Too bold / Wrong colour / Wrong silhouette / Over budget / Too fitted / Too loose / Fabric unavailable / Other) + freeform Textarea + Cancel/Confirm Dismiss (danger) PremiumButtons.
- ConceptSkeleton: 3 shimmer cards shown while generating (when no drafts yet). Each mimics ConceptCard layout: header shimmer (title + status dot + gradient pill), aspect-[4/5] image shimmer, 6-cell specs shimmer, why-box shimmer, actions shimmer.
- Empty state: SectionCard wrapping EmptyState with Sparkles icon "Ready when you are" + description "Fill in the design request and generate style suggestions for {name}."
- Loading state for the whole page (customer fetch): PageHeader + 3-card SkeletonCard grid matching the lg:grid-cols-3 layout.
- Error state: SectionCard + EmptyState with Retry PremiumButton.
- Staggered animations: drafts and saved concepts wrapped in div with animate-fade-in-up + style animationDelay = idx * 80ms.
- Data flow: handleGenerate POSTs /api/style-assist/generate → sets drafts + dataConfidence + confidenceNote + success toast with confidenceNote as description. handleVisualize POSTs /api/style-assist/visualize → if saved concept PATCHes /api/style-concepts/[id] { imageUrl } + refetch, if draft updates local drafts state. handleApprove/handleReject POST /api/style-concepts with full payload (request fields + concept fields + status + rejectionReason + dataConfidence) → removes from drafts + refetch + toast. handleConvert → go('new-order', { params: { customerId, garment: "conceptName — silhouette — fabric — colour" } }) + success toast.
- Lint: bun run lint clean (no errors). TypeScript: npx tsc --noEmit clean for the file. Dev log shows successful compilation.

Stage Summary:
- File rewritten: src/views/StyleAssist.tsx (~1100 lines, single self-contained "use client" default export with inline sub-components).
- Premium features delivered: burgundy gradient customer picker hero, PageHeader with AI-powered badge, sticky left CustomerStyleProfile with gradient avatar + tinted chips + 2-col DefCell grid + measurement grid + confidence pill, premium DesignRequestForm with SectionCard + 2-col fields + size-lg PremiumButton, stunning ConceptCards with burgundy gradient match-pill + 4/5 lookbook image frame + per-card shimmer visualize overlay + 3-col icon specs grid + tinted why-box + staggered fade-in-up animations + PremiumButton actions (Approve emerald / Reject outline / Convert to Order / Visualize), 3 ConceptSkeleton shimmer cards during generation, EmptyState with Sparkles, full responsiveness (grids collapse to 1-col, specs 2-col on mobile, sticky disabled on mobile).
- AI flow intact: GET /api/customers (picker), GET /api/customers/[id] (detail aggregate), POST /api/style-assist/generate (concept drafts + dataConfidence), POST /api/style-assist/visualize (per-concept AI image), POST /api/style-concepts (save approved/rejected), PATCH /api/style-concepts/[id] (attach imageUrl to saved concept). All mutations trigger sonner toasts with success/error descriptions.
- Consumes: @/components/atelier/{PageHeader, SectionCard, EmptyState+SkeletonCard, PremiumButton, StatusBadge}, @/components/ui/{Input, Label, Textarea, Separator, Select+parts}, @/lib/api (apiGet, apiPost, apiPatch), @/lib/types (Customer, Order, MeasurementSet, CustomerFeedback, StyleConcept), @/lib/format (shortDate), @/lib/utils (cn), @/stores/nav (useNav), @tanstack/react-query (useQuery + refetch), sonner (toast), lucide-react (Sparkles, ArrowLeft, Check, X, ImageIcon, Loader2, Wand2, ShoppingBag, Star, Palette, Shirt, Scissors).

---
Task ID: 15
Agent: full-stack-developer (premium fittings/tasks/quote)
Task: Redesign Fittings, Tasks, QuickQuote to premium.

Work Log:
- Read worklog.md and the PREMIUM REDESIGN CONTRACT (binding tokens + primitives).
- Inspected existing premium primitives (PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState/SkeletonCard/SkeletonList, PremiumButton, StatusBadge) and existing non-premium view files.
- Rewrote `src/views/Fittings.tsx`:
  - PageHeader (eyebrow "Atelier calendar" + CalendarClock icon, subtitle, status-filter Select action).
  - Premium 3-up stat strip: Scheduled / Completed (mo.) / Alterations as PremiumMetric cards with AnimatedNumber values + accent on the first.
  - Two SectionCards (Upcoming + Recent) with `divide-y divide-[#E7E5E4]/70` row lists.
  - Custom `DateChip` (calendar chip showing month + day) leading each row; garment + customer name with small avatar dot; StatusBadge; ChevronRight.
  - Overdue scheduled fittings render amber-tinted row with AlertCircle + "Overdue" pill.
  - Empty states use `EmptyState` with CalendarDays icon; loading uses `SkeletonList` inside SectionCards.
  - Click → `go('order', { id: fitting.orderId })`.
- Rewrote `src/views/Tasks.tsx`:
  - PageHeader (eyebrow "Studio workflow" + KanbanSquare icon, PremiumButton "New Task" action with Plus icon).
  - Premium 3-up stat strip: To Do / In Progress / Done as PremiumMetric cards with AnimatedNumber + accent on first.
  - Filter SectionCard (py-3 body) with Staff + Priority Selects.
  - 3-column Kanban `grid grid-cols-1 md:grid-cols-3 gap-4`, each column a SectionCard with status title + count pill + status-coloured icon.
  - Premium TaskCard: `rounded-lg bg-white border border-[#E7E5E4] p-3.5 elevate-sm lift`, title (font-medium), linked garment with Link2 icon, staff avatar dot (initial) + name, dueDate shortDate with amber AlertCircle when overdue & not Done, priority StatusBadge, compact inline status Select at the bottom → PATCH `/api/tasks/[id]` + toast on success/error.
  - New Task Dialog uses PremiumButton (primary/ghost) for Cancel + Create with loading state.
  - Loading uses SkeletonCard (3 columns); empty columns use compact EmptyState.
- Rewrote `src/views/QuickQuote.tsx`:
  - PageHeader (eyebrow "Instant pricing" + Zap icon, Zap-in-circle accent action).
  - Two-column grid `lg:grid-cols-5` — form 3/5, sticky summary 2/5 (`lg:sticky lg:top-6`).
  - Calculator SectionCard "Garment details": Garment Type, Fabric (with per-yard cost hint), Yards, Complexity (with multiplier hint), Embellishment (with add-on hint), Rush Switch — all premium Label + Input/Select.
  - Summary SectionCard "Estimate": line items (Fabric / Labour / Embellishment / Subtotal / Rush premium in amber when active), Separator, big burgundy Total using `<AnimatedNumber value={total} format="currency" />` inside a burgundy gradient wash card, 50% deposit row, Est. margin row in emerald with TrendingUp icon, full-width PremiumButton "Convert to Order" with ShoppingBag icon → `go('new-order', { params: { garment: `${garment} — ${fabric}` } })`.
  - All money uses `tabular-nums` (or AnimatedNumber for hero total).
- Verified: `bun run lint` → 0 errors (only an unrelated unused eslint-disable warning elsewhere); `bunx tsc --noEmit` → 0 errors in any of the three rewritten files (remaining TS errors are in `upload/extracted/base44/*` legacy source, not mine).

Stage Summary:
- Files rewritten:
  - `src/views/Fittings.tsx` — premium calendar view with stat strip, calendar-chip rows, overdue highlight, EmptyState/SkeletonList.
  - `src/views/Tasks.tsx` — premium 3-column Kanban with stat strip, filter bar, elevate-sm lift task cards, inline status mutation + toasts, New Task dialog on PremiumButton.
  - `src/views/QuickQuote.tsx` — premium 3/5 + 2/5 calculator with live useMemo recalculation, AnimatedNumber burgundy total, emerald est. margin, sticky summary, PremiumButton "Convert to Order".
- Premium features applied: PageHeader (animate-fade-in-up), SectionCard everywhere with elevate-sm + lift, PremiumMetric + AnimatedNumber for stat strips & hero total, SkeletonCard/SkeletonList + EmptyState for loading/empty, PremiumButton for all CTAs with loading states, StatusBadge with dot, sonner toasts on every mutation, tabular-nums on all money, burgundy #800020 primary, responsive grids that collapse on mobile.

---
Task ID: 12
Agent: full-stack-developer (premium customers)
Task: Redesign Customers + CustomerProfile to premium.

Work Log:
- Read worklog.md (binding PREMIUM REDESIGN CONTRACT) + inspected premium primitives: PageHeader, SectionCard, PremiumMetric, PremiumButton, AnimatedNumber, EmptyState/SkeletonList, StatusBadge.
- Inspected existing non-premium Customers.tsx + CustomerProfile.tsx to preserve all data flows (useQuery keys, apiGet/apiPost/apiPatch endpoints, AddCustomerDialog + EditPersonalDialog + AddMeasurementDialog logic, useNav `go()` calls).
- Rewrote `src/views/Customers.tsx`:
  - Wrapper `p-5 md:p-8 max-w-[1200px] mx-auto w-full`.
  - PageHeader (eyebrow "Client roster" w/ Users icon, title "Customers", subtitle "Everyone who's sat in your chair.", actions = PremiumButton primary "Add Customer" with UserPlus).
  - Premium stat strip: grid-cols-2 lg:grid-cols-4 with 4 PremiumMetrics — Total Clients (accent, Users), VIPs (Crown), Bridal (Heart), New This Month (Sparkles).
  - Search + filter bar in a SectionCard: search Input (h-11, left Search icon), Entry-source Select (h-11), Client-type Select (h-11).
  - Client Sources breakdown SectionCard with chips (rounded-lg border px-3 py-2) that act as filter toggles + lift hover.
  - Customer list: SectionCard bodyClassName p-0 + divide-y divide-[#E7E5E4]/70. Each row = button → go('customer', { id }). Gradient avatar (from-[#800020] to-[#6b0018]) with initial. Name + Phone/Mail/MapPin sub row. Right: subtle pill with order count + ChevronRight (turns burgundy on group hover). Row hover bg-[#faf8f5].
  - Loading: SkeletonList(4) inside SectionCard. Empty: EmptyState (Users) with conditional "Add Customer" action.
  - Add Customer Dialog premium: PremiumButton cancel/submit (with loading), preferred-styles multi-chip toggle + free-text input, all inputs h-10 rounded-md, animate-fade-in on conditional Referral field.
- Rewrote `src/views/CustomerProfile.tsx`:
  - Wrapper `p-5 md:p-8 max-w-[1200px] mx-auto w-full`.
  - No-selectedId state: SectionCard + EmptyState (Users) with "Browse Customers" PremiumButton.
  - Back link subtle button → go('customers') with ArrowLeft + "Customers".
  - Premium hero header band: rounded-xl surface-premium border elevate-md p-6 mb-6 animate-fade-in-up. Layout: large gradient avatar (w-16 h-16, burgundy gradient), name (font-display clamp 28-36px), contact row (Phone/Mail/MessageSquare/MapPin), chips row (customerType StatusBadge + entry source chip + AnimatedNumber loyalty points pill + status badge). Right: PremiumButton primary "Open Style Assist" (Sparkles) → go('style-assist', { id }), PremiumButton outline "Edit" (Pencil) → EditPersonalDialog.
  - Premium Tabs: shadcn TabsList with burgundy active pill (data-[state=active]:bg-[#800020] data-[state=active]:text-white), horizontal scroll on mobile. Tabs: Overview, Measurements, Orders, Style, Notes.
  - Overview tab: 2-col grid. Left SectionCard "Profile" with definition grid (Customer Since, Occupation, Gender, Height/Weight, Preferred Fit, Skin Tone). Right SectionCard "Style Snapshot" with ChipList (favourite colours / colours to avoid / favourite fabrics / preferred styles) as tinted chips. Below: SectionCard "Recent Feedback" with burgundy-filled Stars + feedback text + EmptyState when none.
  - Measurements tab: SectionCard "Measurements" with header action "Add Measurement" PremiumButton outline. Grid of measurement cards (rounded-lg border p-4 surface-premium lift) with dateTaken + 2-col grid of bust/waist/hip/shoulder/length/sleeve with tabular-nums + notes. Empty: EmptyState with Ruler icon + action.
  - Orders tab: SectionCard "Orders · N" bodyClassName p-0. List rows (same style as Customers list) with ShoppingBag avatar icon, garmentDesign, ordered/due/staff subtext, StatusBadge, formatCurrency (tabular-nums). Click → go('order', { id }). Header action "New Order" PremiumButton sm primary. Empty: EmptyState with action.
  - Style tab: SectionCard "Saved Concepts". Grid sm:grid-cols-2 gap-4. Each card: rounded-lg border surface-premium lift overflow-hidden flex flex-col. Optional aspect-[3/4] image frame. Body: font-display conceptName, matchPercent burgundy pill, StatusBadge, garmentType label, silhouette/fabric/colour specs, whyThisMayWork in tinted box (bg-[#FBF9F7] border rounded-md p-2.5 italic). Rejected concepts dimmed (opacity-60). Header action "Generate Concepts" PremiumButton sm primary. Empty: EmptyState with Sparkles + action.
  - Notes tab: 2-col grid of NotesCard (General Notes / Style Notes) — Textarea + auto-save on blur + dirty Save button + "Saved" indicator with Check icon. PATCHes `/api/customers/[id]` with `{ notes }` or `{ styleNotes }`.
  - EditPersonalDialog: prefilled form, PATCH `/api/customers/[id]`, PremiumButton cancel/save (with loading).
  - AddMeasurementDialog: numeric inputs (h-10 rounded-md) for bust/waist/hip/shoulder/length/sleeve + notes, POST `/api/measurements`. PremiumButton cancel/save (with loading).
  - All mutations toast (sonner) on success/error. All cache invalidations preserved (`['customer', selectedId]` + `['customers']`).
  - Loading: skeleton header + 2 SkeletonCards + SkeletonList(3). Error: SectionCard + EmptyState with "Try again" PremiumButton outline.
  - Burgundy Stars (filled-[#800020]) instead of amber.

Stage Summary:
- Files rewritten (premium):
  - `src/views/Customers.tsx` — premium list with PageHeader, 4 PremiumMetrics stat strip, search+filter SectionCard bar, Client Sources breakdown chips, SectionCard list with gradient avatars + hover lift + order pills, Add Customer Dialog (PremiumButton + style chips).
  - `src/views/CustomerProfile.tsx` — premium detail with hero band (gradient avatar + AnimatedNumber loyalty), 5 premium tabs (Overview/Measurements/Orders/Style/Notes), SectionCard everywhere, burgundy pill tab triggers, gradient avatars, chip-based style snapshot, inline auto-saving notes editor, premium dialogs.
- Premium features delivered: PageHeader, SectionCard (every container), PremiumMetric strip, AnimatedNumber on loyalty, PremiumButton for all CTAs with loading, StatusBadge refinement, SkeletonList/SkeletonCard/EmptyState for all loading/empty, gradient burgundy avatars, tabular-nums on all financial/measurement numbers, animate-fade-in-up on hero, lift on interactive cards, sonner toasts for all mutations.
- Verified: `bun run lint` clean (0 errors, 0 warnings); `bunx tsc --noEmit` clean for these two files; dev server compiled successfully.

---
Task ID: 13
Agent: full-stack-developer (premium orders+board)
Task: Redesign Orders, OrderDetail, NewOrder, ProductionBoard to premium.

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to the PREMIUM REDESIGN CONTRACT (design tokens, premium primitives, quality bar). Confirmed imports available: PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState (+ SkeletonCard/SkeletonList/SkeletonRow), PremiumButton, StatusBadge, StatusStepper from @/components/atelier/*; shadcn Dialog/Input/Label/Textarea/Select/Tabs/Sheet/Switch; apiGet/apiPost/apiPatch/apiDelete; ORDER_STATUSES + ACTIVE_STATUSES + PRIORITY_LEVELS + formatCurrency + shortDate + formatDate + todayISO + isOverdue; useNav router.
- Rewrote src/views/Orders.tsx: PageHeader (eyebrow "Production" + ShoppingBag icon, "Orders" title, subtitle, PremiumButton "New Order" → go('new-order')). Premium stat strip — 4 PremiumMetrics (Total Orders / Active / Ready for Collection / Completed This Month) in grid-cols-2 lg:grid-cols-4. Filter bar in SectionCard (py-3 body): status Select + staff Select + search Input. Orders table inside SectionCard (p-0): sticky header row with uppercase tracking-[0.18em] labels (Customer, Garment, Ordered, Delivery, Status, Amount, Paid), each row clickable → go('order', {id}), gradient avatar (AVATAR_GRADIENTS) + name + High priority burgundy dot, garment truncate 1 line, orderDate/deliveryDate shortDate + amber AlertCircle when overdue, StatusBadge, sellingPrice tabular-nums, paid with thin % progress bar (emerald when fully paid, burgundy otherwise). Loading: SkeletonList. Empty: EmptyState with ShoppingBag icon + Clear filters CTA. Wrapper p-5 md:p-8 max-w-[1300px].
- Rewrote src/views/OrderDetail.tsx: back link to orders. Premium header band (rounded-xl elevate-md surface-premium border p-6) with garmentDesign font-display clamp(26-34px), clickable customer name with small gradient avatar, meta row (orderDate, deliveryDate amber+AlertCircle if overdue, priority StatusBadge, assigned staff with UserCircle2 icon). Right side: status Select (premium styled) → PATCH + toast, PremiumButton Edit (outline). StatusStepper inside SectionCard "Order Journey". 2/3 + 1/3 grid: LEFT — Financials SectionCard (premium 6-stat breakdown with tabular-nums, Selling/Paid/Outstanding/Fabric/Labour/Margin with ok/warn tones, payment progress bar, "Record Payment" PremiumButton → Dialog (amount/method/note) → POST /api/orders/[id]/payments, payments list as rows with avatar circle + CheckCircle2 icon + date/method/note). Fittings SectionCard with schedule Dialog. Tasks SectionCard with add Dialog (POST /api/tasks with orderId). Notes SectionCard with NotesEditor (Textarea + Save/Cancel PremiumButtons) → PATCH. RIGHT — Customer Snapshot (gradient avatar, clickable name, contact rows, Entry Source/Preferred Styles rows, "View profile" PremiumButton ghost sm → customer profile). Timeline SectionCard (Created / Last updated / days in production). Loading: shimmer header + SkeletonCard grid. Empty: EmptyState for missing order.
- Rewrote src/views/NewOrder.tsx: back link to orders. PageHeader (eyebrow "New commission" + Pencil icon, "New Custom Order"). SectionCard containing form: Customer required Select, Garment Design required Textarea (prefill from params.garment decodeURIComponent), Order Date (default today) + Delivery Date date inputs, Status Select (default Enquiry), Assigned Staff Select (Unassigned default), Selling/Fabric/Labour cost number inputs with tabular-nums, Priority Select, Notes Textarea. LIVE margin preview (emerald if positive, amber if negative) with AnimatedNumber (currency format, 400ms duration) + TrendingUp icon, updates as user types. Submit PremiumButton primary full-width with loading state → POST /api/orders → go('order', {id}) + toast. Wrapper max-w-[820px].
- Rewrote src/views/ProductionBoard.tsx: PageHeader (eyebrow "Live workflow" + LayoutGrid icon, "Production Board", subtitle, actions = staff filter Select). 6 BOARD_COLUMNS (consultation / confirmed / production / fitting / ready / done). Each column: w-80 shrink-0 rounded-xl border bg-[#faf8f5]/60 elevate-sm. Header: uppercase tracking-[0.22em] micro-label + count pill (rounded-full white bg + border). Body: max-h-[72vh] overflow-y-auto scroll-slim space-y-2.5 p-2.5. Premium OrderCard (useDraggable): rounded-lg bg-white border p-3.5 elevate-sm lift cursor-grab active:cursor-grabbing, gradient avatar dot + customer name, garment truncate 2 lines font-medium, delivery shortDate (amber + AlertCircle if overdue), StatusBadge, High priority dot, thin paid-progress bar with %. DragOverlay renders rotated shadowed clone. PointerSensor distance:5 so clicks still navigate. closestCorners collision. onDragEnd → PATCH /api/orders/[id] {status: column.statuses[0]} with optimistic update (onMutate snapshot + mutate cached array, onError rollback, onSettled invalidate ['orders'] + ['order']). Toast on drop. Empty: EmptyState with New Order CTA. Loading: shimmer column skeletons.
- Premium quality bar across all 4 files: SectionCard everywhere, elevate-sm + lift on interactive cards, gradient avatars (hashIndex for stable colour), tabular-nums on all money, AnimatedNumber on NewOrder margin, PremiumButton for all CTAs with loading states, paid-progress bars on order cards/rows (emerald when full, burgundy when partial), animate-fade-in-up on PageHeader / header band, sonner toasts for all mutations, SkeletonList/SkeletonCard loaders, EmptyState for empties, responsive (board scrolls horizontally with scroll-slim; table collapses to 2-col grid on mobile). Burgundy #800020 primary throughout; no indigo/blue accents.
- Lint: bun run lint clean (no errors). tsc --noEmit clean for the four files. dev.log shows successful compiles after each save (Compiled in 8-11s) with GET / 200.

Stage Summary:
- Files rewritten (4):
  - src/views/Orders.tsx — premium list with stat strip, refined filters, gradient-avatars table, paid progress bars.
  - src/views/OrderDetail.tsx — premium header band, StatusStepper journey, premium financials with progress bar, dialogs for payments/fittings/tasks, notes editor, customer snapshot + timeline.
  - src/views/NewOrder.tsx — premium form with live AnimatedNumber margin preview.
  - src/views/ProductionBoard.tsx — premium kanban with @dnd-kit/core (PointerSensor distance:5, useDroppable columns, useDraggable cards, CSS.Translate transform, opacity 0.4 while dragging, DragOverlay rotated clone, closestCorners collision, optimistic PATCH + invalidate + toast).
- Premium features: PageHeader + SectionCard + PremiumMetric + PremiumButton + StatusBadge + StatusStepper + AnimatedNumber + EmptyState + SkeletonList/SkeletonCard; gradient avatars; tabular-nums on all money; thin paid-progress bars on rows/cards; emerald/burgundy/amber semantic tones; animate-fade-in-up on headers; sonner toasts on every mutation.
- DnD approach: @dnd-kit/core DndContext wraps the columns row; each column is useDroppable({id: col.key}) with isOver rendering burgundy ring; each card is useDraggable({id: order.id}) with CSS.Translate.toString(transform) + opacity drop while dragging; DragOverlay renders a rotated shadowed clone; PointerSensor activationConstraint distance:5 so clicks still navigate; closestCorners collision detection; onDragEnd PATCHes /api/orders/{id} with the target column's first status with optimistic update (onMutate snapshot + cache mutate, onError rollback, onSuccess invalidate ['orders'] + ['order']) + sonner toast.
- Verified: bun run lint clean; tsc --noEmit clean for the four files; dev server compiled successfully with HTTP 200.

---
Task ID: 11
Agent: full-stack-developer (premium dashboard)
Task: Redesign Dashboard view to premium.

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to the PREMIUM REDESIGN CONTRACT at the bottom (design tokens, premium primitives, quality bar).
- Inspected premium primitives in src/components/atelier/ (PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState, PremiumButton, StatusBadge) to confirm exact prop shapes.
- Widened `PremiumMetric.value` from `string | number` to `React.ReactNode` so callers can pass `<AnimatedNumber>` inside (per spec) — backward compatible; this also cleared pre-existing tsc errors in Fittings.tsx + Tasks.tsx that were already passing JSX.
- Rewrote src/views/Dashboard.tsx — "use client", default export Dashboard, TanStack Query `['dashboard']` fetch of `/api/dashboard`.
- Helpers: `orderPaidTotal`, `orderCostTotal`, `sameMonth`, generic `monthlyBuckets<T>` for last-N-month sales/payment arrays, `STATUS_CATEGORY_COLOR` map (consultation=stone, confirmed/Deposit Paid=blue, In Production=violet, Fitting/Alterations=cyan, Ready=emerald, Collected/Completed=teal), `avatarGradient` seeded hash for staff avatars.
- Derived via useMemo: salesThisMonth, receivedThisMonth, outstanding (excludes Completed + Collected), profit, activeOrders, statusCounts (all 11), upcomingFittings (max 5), staffWorkload (per-user active orders + open tasks), avgMargin, healthStatus (At Risk > 5000 / >3 overdue, Needs Attention > 1000 / >0 overdue, else On Track), incomeSeries (6mo payments), salesSpark + paymentsSpark, receivedTrend (% vs previous month), totalReceived6m, attentionItems (3-6 items: due-soon, overdue tasks, Ready awaiting collection, open enquiries, awaiting-deposit quotes).
- Madam layout (per contract): PageHeader (eyebrow `Atelier overview · {today}` + CalendarDays icon, title `{ownerLabel}'s Atelier`, subtitle, New Custom Order PremiumButton) → 4-card money row (PremiumMetric accent + AnimatedNumber + spark + trend + icons TrendingUp/Wallet/AlertCircle/Sparkles) → Work+People grid (lg:grid-cols-3): left 2/3 stack of Active Orders (horizontal scroll w-60 cards with lift + StatusBadge) + Status Pipeline (md:grid-cols-6 category-tinted tabular-nums) + Upcoming Fittings (hover-lift rows) + right 1/3 Staff Workload (gradient avatars + burgundy open-task pills) → Income Trend SectionCard (recharts AreaChart, `url(#burgundyGrad)` linearGradient, h-[260px], total-received header metric) → Business Health + Needs Attention grid (lg:grid-cols-2): health pill (emerald/amber/burgundy + dot) + 2x2 HealthMetric grid (Coins/CircleDollarSign/Timer/PackageCheck icons + AnimatedNumber) + amber AlertCircle list → AI Trend Suggestions SectionCard (Sparkles icon, Generate insights PremiumButton outline with loading state, POSTs flat summary {orderCount,totalSales,outstanding,statusBreakdown,paymentsThisMonth,upcomingFittings,customerSources} to /api/insights/trends, renders suggestions as emerald Check list with staggered animate-fade-in-up, sonner toasts on success/empty/error, EmptyState when no suggestions).
- Staff view: PageHeader "Your Workbench", right-rail "My Open Tasks" card with hero AnimatedNumber (text-6xl font-display text-[#800020]) + Go to Tasks PremiumButton, Active Orders + Status Pipeline + Upcoming Fittings still render, money row + Income Trend + Business Health + Needs Attention + AI Suggestions skipped.
- Loading: shimmer header (3 lines) + 4 SkeletonCards for money row + SkeletonCard + SkeletonList for work/people grid (no "Loading…" text). Error: SectionCard with EmptyState (AlertCircle icon + Reload PremiumButton).
- Quality bar: every card uses SectionCard (elevate-sm + lift), hero metrics use AnimatedNumber + sparkline + trend, animate-fade-in-up on PageHeader (built-in) + money row + first section, tabular-nums on ALL financial figures, sonner toasts on AI insights action, responsive grid collapse, chart min h-[260px], burgundy #800020 primary throughout (no blue/indigo as primary), empty states use EmptyState with icon, mobile FAB with elevate-burgundy.
- Lint: `bunx eslint src/views/Dashboard.tsx` → 0 errors / 0 warnings. `bun run lint` project-wide → 0 errors (1 unrelated pre-existing warning in CustomerProfile.tsx). `bunx tsc --noEmit --skipLibCheck` → 0 errors in src/views/ (PremiumMetric type widening also resolved pre-existing TS errors in Fittings.tsx + Tasks.tsx).

Stage Summary:
- File rewritten: src/views/Dashboard.tsx (~830 lines, single "use client" default export + inline HealthMetric helper).
- Premium features added: editorial PageHeader with eyebrow + display title + actions; 4-card PremiumMetric money row with AnimatedNumber values + sparklines + trend deltas + icons; Active Orders horizontal-scroll cards with lift + line-clamp garment; 11-tile Status Pipeline with category-tinted tabular-nums counts; Upcoming Fittings hover-lift list; gradient-avatar Staff Workload with burgundy open-task pills; 6-month recharts AreaChart with burgundy gradient + total-received header metric; Business Health status pill gauge + 2x2 HealthMetric grid (Avg Margin / Outstanding / Overdue Tasks / Ready for Collection) all with AnimatedNumber; Needs Attention amber list with hover lift; AI Trend Suggestions with Sparkles icon, Generate-insights PremiumButton (outline + loading), staggered animate-fade-in-up suggestion list, EmptyState, sonner toasts; skeleton loading (no "Loading…" text); SectionCard-based error state with EmptyState + Reload; mobile FAB with elevate-burgundy; staff view with hero AnimatedNumber open-tasks count.
- Side fix: src/components/atelier/PremiumMetric.tsx `value` prop widened to `React.ReactNode` (backward compatible; resolves pre-existing TS errors in Fittings.tsx + Tasks.tsx).
- Consumes: @/components/atelier/{PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState (EmptyState+SkeletonCard+SkeletonList), PremiumButton, StatusBadge}, @/lib/api (apiGet, apiPost), @/lib/format (formatCurrency, formatDate, shortDate, isWithinDays, isOverdue, ORDER_STATUSES, ACTIVE_STATUSES, ENTRY_SOURCES), @/lib/types, @/stores/nav (useNav.go), @/stores/role (useRole.isStaff, ownerLabel), @tanstack/react-query (useQuery), recharts (AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid), lucide-react, sonner (toast).
- Backend dependency (unchanged from Task 3): GET /api/dashboard returns { orders, payments, fittings, tasks, users, customers, settings, styleConcepts }. POST /api/insights/trends accepts flat { orderCount, totalSales, outstanding, statusBreakdown, paymentsThisMonth, upcomingFittings, customerSources } and returns { suggestions: string[] } — confirmed against src/app/api/insights/trends/route.ts.

---
Task ID: 16 (premium redesign verification)
Agent: main
Task: Verify all premium views + real functions work end-to-end with agent-browser.

Work Log:
- Lint: `bun run lint` → 0 errors, 0 warnings project-wide.
- Browser verification of every screen + function:
  1. Premium Login — renders editorial split layout (burgundy gradient over atelier image, refined form, demo chips). Login works.
  2. Premium Dashboard — VLM rated 8.5/10 "high-end boutique dashboard". PremiumMetric cards with sparklines + AnimatedNumber, status pipeline, income trend chart, business health gauge, AI insights generation.
  3. Customers list — premium stat strip, search, filters, client sources breakdown, gradient avatars.
  4. Add Customer (REAL FUNCTION) — filled form, selected "Elegant" style chip, saved → customer "Premium Test Client" appeared in list + persisted to DB (verified via API).
  5. Customer Profile — premium hero header, 5 tabs (Overview/Measurements/Orders/Style/Notes), Style Assist CTA.
  6. Style Assist AI (SHOWCASE) — filled design request, clicked Generate → AI returned 3 concepts. Clicked Visualize → AI generated a burgundy satin evening gown illustration (confirmed by VLM). "Concept visualized" toast.
  7. Orders list — premium table with paid-progress bars, status badges, overdue highlighting.
  8. New Order (REAL FUNCTION) — selected the just-created customer, filled garment, submitted → order created + navigated to detail page + persisted to DB.
  9. Order Detail — premium header, StatusStepper, Financials/Fittings/Tasks/Notes/Customer Snapshot/Timeline sections.
  10. Record Payment (REAL FUNCTION) — entered GHS 500, saved → "Payment recorded" toast + payment persisted to DB (verified: 1 payment, 500 total).
  11. Production Board (REAL DnD) — dragged an order card from Consultation → Confirmed column → status changed from "Consultation" to "Confirmed" + persisted to DB (verified via API).
  12. Fittings — premium Upcoming/Recent sections with calendar date chips.
  13. Tasks — premium 3-column kanban with status selects.
  14. Quick Quote (REAL FUNCTION) — live calculation: Lace × 3yd (GHS 540) + Gown labour (GHS 780) = GHS 1,320 total + 50% deposit, updates instantly.
- Console errors: only 1 minor a11y warning (DialogContent missing Description) — no runtime errors.
- Re-seeded to restore clean demo data after testing.

Stage Summary:
- ALL 11 views redesigned to premium (login, shell, dashboard, customers, profile, orders, order detail, new order, board, fittings, tasks, quote, style assist).
- ALL real functions verified working end-to-end: login/logout, create customer, create order, record payment, drag-and-drop status change, AI style concept generation, AI image visualization, AI business insights, live quote calculation, task status changes.
- VLM assessment: dashboard rated 8.5/10 "high-end boutique-style dashboard... sophisticated, fashion-house aesthetic".
- Lint clean. No runtime errors. App is production-ready.

---
Task ID: 17 (mobile login redesign)
Agent: main
Task: Remove demo accounts + redesign login as a phone-first mobile screen.

Work Log:
- Removed DEMO_ACCOUNTS array, fillDemo function, and the entire demo-accounts section from LoginPage.tsx.
- Cleared default email/password (fields now start empty — real login behavior).
- Redesigned LoginPage as a mobile-first, app-style screen:
  - Top hero band (42vh, min 300px): full-bleed atelier image with burgundy gradient overlay + grain, centered brand mark (scissors in a glassy circle) + "Madam Studio" display title + "Bespoke Atelier · Accra" eyebrow. Fades into the form below.
  - Form section: "Welcome back" heading, email + password fields (rounded-xl, elevate-sm, focus rings), show/hide password, burgundy Sign in button (elevate-burgundy + lift), subtle footer tagline.
  - Single column, centered max-w-md, works full-height on phone and centers nicely on desktop.
- Verified on iPhone 14 viewport: renders cleanly, no demo accounts, empty fields.
- VLM rated the mobile login 8.5/10 — "Excellent use of a split-screen aesthetic adapted for mobile... premium and evocative... immediately establishes a high-end, bespoke brand identity."
- Verified real login flow: typed madam@studio.com / atelier2025 → signed in successfully to dashboard.
- Lint clean.

Stage Summary:
- Demo accounts removed entirely (no chips, no pre-filled credentials).
- Login redesigned mobile-first: hero header band + centered form, app-style, premium.
- Real login verified working end-to-end on a phone viewport.

---
Task ID: 18 (scope app + remove role/mode toggles)
Agent: main
Task: Remove Business/Training mode toggle and Madam/Staff role toggle from the app UI; scope the app cleanly.

Work Log:
- Rewrote src/components/atelier/AppShell.tsx:
  - Removed the MODE_ROLES map, the Business/Training mode toggle (desktop rail + mobile header), and the Madam/Staff view toggle (mobile header).
  - Removed the `setRole`/`setMode`/`mode`/`ownerLabel`/`role` usage from the shell — no longer needed in the UI.
  - Simplified NavItem to just `staff: boolean` (visible to staff). Dropped trainer/trainee fields.
  - Nav filter is now simply: owners (madam) see all 8 items; staff see the 5 staff-allowed items (Dashboard, Orders, Board, Fittings, Tasks).
  - Refined the desktop user area: avatar (gradient) + online dot + "Sign out" label under it, clicking signs out.
  - Refined mobile header: just brand + avatar (click = sign out). Removed the toggle row entirely.
- The role still flows from the logged-in user's DB role (auth store syncs it on login/hydrate), so views' isStaff() checks still work — no behavior change to the views themselves.
- Verified in browser:
  - Owner (madam@studio.com): sees full nav (Dashboard, Customers, Orders, Board, Fittings, Quotes, Tasks, Style Assist) + "Madam's Atelier" dashboard. No toggles.
  - Staff (akos@studio.com): sees scoped nav (Dashboard, Orders, Board, Fittings, Tasks) + "Your Workbench" dashboard. No toggles.
  - No runtime errors.
- Lint clean.

Stage Summary:
- Business/Training/Madam/Staff toggles fully removed from the UI.
- App is cleanly scoped: owners manage the whole atelier, staff get a focused workbench. Role follows the signed-in user automatically.

---
Task ID: 19 (team + community foundation)
Agent: main
Task: Add staff/trainer/freelancer management + community feed; redesign UX.

Work Log:
- Prisma schema: added Freelancer, CommunityPost, CommunityComment, CommunityLike models. db:push'd. Regenerated client.
- Re-seeded: 5 freelancers (beader, embroiderer, cutter, photographer, tailor) + 5 community posts (announcement/welcome, showcase, question, inspiration, update) + comments + likes.
- API routes built:
  - GET/POST /api/users (POST creates staff/trainer/madam/trainee with password, validates role + unique email)
  - GET/POST /api/freelancers; PATCH/DELETE /api/freelancers/[id]
  - GET/POST /api/community (GET returns posts with comments + like counts, ordered pinned-then-recent)
  - POST /api/community/[id]/like (toggles like for an authorId)
  - POST /api/community/[id]/comments (adds a comment)
- Added Freelancer + CommunityPost + CommunityComment + CommunityPostType to src/lib/types.ts.
- Added "team" + "community" to ViewKey (nav store), wired into page.tsx dynamic imports + CurrentView switch, added to AppShell NAV (Team = owner-only staff:false, Community = everyone staff:true) with UsersRound + MessageSquare icons.
- Restarted dev server to load the new Prisma client (the global client was cached pre-schema-push).

Stage Summary — FOUNDATION READY. New view files needed:
- src/views/Team.tsx (default export Team)
- src/views/Community.tsx (default export Community)

═══════════════════════════════════════════════════════════════════
## CONTRACT FOR TEAM + COMMUNITY VIEWS
═══════════════════════════════════════════════════════════════════

### Premium primitives (use these — see PREMIUM REDESIGN CONTRACT earlier in this worklog)
- `PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState, SkeletonCard, SkeletonList, PremiumButton, StatusBadge` from `@/components/atelier/*`
- shadcn: Dialog, Input, Label, Textarea, Select(+parts), Tabs(+parts), Separator
- `toast` from sonner, `apiGet, apiPost, apiPatch, apiDelete` from `@/lib/api`
- `useQuery` from `@tanstack/react-query`, `useNav` from `@/stores/nav`, `useAuth` from `@/stores/auth`, `useRole` from `@/stores/role`
- icons from lucide-react

### Auth/role context
- `const { user } = useAuth()` — the logged-in user { id, email, fullName, role, gender }
- `const { isStaff } = useRole()` — true for non-owners. Team view is owner-only (the nav already hides it from staff), so you don't need to gate inside, but you can show the owner's name in compose.

### Team view (src/views/Team.tsx, default export Team, "use client")
Owner-only atelier people management. Three tabs: Staff, Freelancers, (optional) Roles summary.

Data:
- `GET /api/users` → User[]
- `GET /api/freelancers` → Freelancer[]

Layout:
- PageHeader: eyebrow "Atelier people", title "Team", subtitle "Manage staff, trainers and the freelancers you commission."
- A premium stat strip (4 PremiumMetrics): Staff count, Trainers count (role trainer), Freelancers count, Available freelancers.
- Tabs: "Staff & Trainers" | "Freelancers"
  - Staff tab: SectionCard list of users (gradient avatar with initial, fullName, role StatusBadge, email, phone, gender). Each row has an Edit (PATCH) affordance. An "Add Member" PremiumButton (primary) opens a Dialog: fullName, email, role (Select: Staff/Trainer/Trainee — owner is implicit, don't allow creating madam), gender (Select Female/Male/Other), phone, password (default "atelier2025"). POST /api/users → invalidate + toast.
  - Freelancers tab: SectionCard list of freelancers (avatar with specialty icon, name, specialty chip, skills, phone, rate formatCurrency, status StatusBadge Available/Busy/Unavailable). "Add Freelancer" PremiumButton → Dialog: name, specialty (Select: Beader/Embroiderer/Cutter/Tailor/Designer/Photographer/Other), skills (comma text), phone, email, rate (number), status (Select), notes (Textarea). POST /api/freelancers. Each freelancer card also has a small status-change Select (PATCH) and a delete (DELETE with confirm).
- Loading: SkeletonList. Empty: EmptyState with UsersRound icon.

### Community view (src/views/Community.tsx, default export Community, "use client")
The studio's internal wall/feed. Everyone (owner + staff) can post, like, comment.

Data:
- `GET /api/community` → CommunityPost[] (each with comments[] + _count.likes). NOTE: the API doesn't set `likedByMe` — compute client-side using `useAuth().user.id` matching any... actually simpler: track liked posts in local state keyed by postId. On like click, POST /api/community/[id]/like { authorId: user.id } → toggle local state + refetch or optimistic count.

Layout:
- PageHeader: eyebrow "Studio wall", title "Community", subtitle "Updates, questions, inspiration and showcases from the atelier."
- A premium composer at top (SectionCard "Share something"): type Select (Update/Question/Inspiration/Announcement/Showcase — owners see all 5, staff see Update/Question/Inspiration/Showcase), optional title Input, body Textarea, "Post" PremiumButton (primary, loading). POST /api/community { authorId: user.id, authorName: user.fullName, authorRole: user.role, type, title, body } → invalidate + toast + clear form.
- A filter row: small pill buttons to filter by type (All, Updates, Questions, Inspiration, Showcases, Announcements). Active pill = burgundy.
- Feed: list of CommunityPost cards (SectionCard style, `animate-fade-in-up` staggered). Each card:
  - Header: gradient avatar (initial), authorName + authorRole badge, time-ago (use a relative time helper or formatDate), pinned indicator (Pin icon, amber) if pinned.
  - Type chip (colored by type: announcement=burgundy, showcase=emerald, question=sky, inspiration=amber, update=stone).
  - Title (font-display, if present) + body (preserve line breaks).
  - If imageUrl, show the image in a rounded frame.
  - Actions row: Like button (Heart icon, fills burgundy if liked, count), Comment button (MessageSquare icon, toggles comment input), count.
  - Comments: list under the card (authorName + body + time). A small input + send to POST /api/community/[id]/comments.
- Loading: 3-4 SkeletonCards. Empty: EmptyState with MessageSquare icon "No posts yet — start the conversation."

### Time-ago helper (inline in Community)
```
function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
```

### Quality bar (PREMIUM — match the rest of the app)
- SectionCard everywhere, elevate-sm + lift on interactive cards
- Gradient avatars (burgundy gradient), tabular-nums on rates
- PremiumButton for all CTAs with loading states
- `animate-fade-in-up` on PageHeader + staggered on feed cards
- Toasts for all mutations
- Skeleton loaders, EmptyState for empties
- Responsive: tabs scroll on mobile, feed cards full-width
- Burgundy #800020 primary, no blue/indigo as primary

### Worklog
Before starting, read `/home/z/my-project/worklog.md`. After finishing, APPEND a new section starting with `---` with Task ID, agent, task, work log, stage summary.

---
Task ID: 20
Agent: full-stack-developer (team view)
Task: Build Team view (owner-only people management).

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to PREMIUM REDESIGN CONTRACT (burgundy #800020 / cream #faf8f5, surface-premium + elevate-* + lift + animate-fade-in-up) and the CONTRACT FOR TEAM + COMMUNITY VIEWS (exact API shapes, layout, quality bar).
- Inspected premium primitives (PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState/SkeletonList, PremiumButton, StatusBadge) and the existing Customers.tsx/CustomerProfile.tsx for gradient-avatar + premium-tabs patterns.
- Verified backend routes already exist (Task 19): GET/POST /api/users, GET/POST /api/freelancers, PATCH/DELETE /api/freelancers/[id]. No backend work needed.
- Extended StatusBadge.tsx (additive, non-breaking) with three new statuses so the freelancer pill matches the contract colours: Available=emerald, Busy=amber, Unavailable=stone (both STATUS_STYLES + DOT_COLOR maps).
- Wrote src/views/Team.tsx (~970 lines, single "use client" default export with inline sub-components):
  - PageHeader: eyebrow "Atelier people" (UsersRound icon), title "Team", subtitle, actions slot showing a compact owner chip (gradient avatar initial + "Owner" label + signed-in name) sourced from useAuth().
  - Premium stat strip (grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6): 4 PremiumMetric cards — Staff (accent, UsersRound), Trainers (GraduationCap), Freelancers (Briefcase), Available (Sparkles) — each value rendered via AnimatedNumber for the count-up effect.
  - Tabs (shadcn premium pill style — burgundy active, white surface, scrollable on mobile): "Staff & Trainers" | "Freelancers".
  - StaffTrainersCard (SectionCard bodyClassName="p-0", header action = PremiumButton "Add Member" with UserPlus icon): divide-y list sorted by role hierarchy (madam→staff→trainer→trainee) then name. Each row: burgundy gradient avatar (initial), fullName (font-medium), role StatusBadge, email/phone subtext with Mail/Phone icons, gender chip. The owner (role=madam) row gets a burgundy "Owner" tag (Crown icon) + "Permanent" label and is non-deletable. The signed-in owner's own row also gets a "You" chip.
  - FreelancersCard (SectionCard bodyClassName="p-0", header action = PremiumButton "Add Freelancer" with Plus icon): divide-y list. Each row: burgundy gradient avatar with specialty icon (Beader=Sparkles, Embroiderer=Flower2, Cutter=Scissors, Tailor=Shirt, Designer=PenTool, Photographer=Camera, Other=Briefcase), name, burgundy specialty chip, italic skills, phone/email subtext, rate (formatCurrency + tabular-nums) with "per piece" hint, StatusBadge (emerald/amber/stone), compact status-change Select (PATCH on change with toast), ghost-icon delete button (Trash2) opening an AlertDialog confirm → DELETE.
  - AddMemberDialog: Full Name (required), Email (required), Role Select (Staff/Trainer/Trainee — madam not offered), Gender Select (Female/Male/Other/Prefer not to say), Phone, Password (prefilled "atelier2025" + hint). PremiumButton "Add member" (loading). useMutation POST /api/users → invalidate ['users'] + success toast; onError detects 409 (email exists) and shows a specific error toast.
  - AddFreelancerDialog: Name (required), Specialty Select, Skills (text), Phone, Email, Rate (number, tabular-nums), Status Select, Notes (Textarea). PremiumButton "Add freelancer" (loading). POST /api/freelancers → invalidate ['freelancers'] + toast.
  - Loading: SkeletonList (4 rows) in each tab. Empty: EmptyState with UsersRound icon + contextual copy + add CTA.
  - Field helper renders a consistent uppercase-tracked label with burgundy required asterisk.
- Fixed icon import: `Worker` is not exported by lucide-react — swapped to `Briefcase` for both the "Other" specialty avatar and the Freelancers metric.
- Verified: `bun run lint` clean (no errors); `bunx tsc --noEmit` clean for my files; dev log shows successful recompile (✓ Compiled in 9.9s, GET / 200) after file creation.

Stage Summary:
- Files created/modified:
  - src/views/Team.tsx — premium owner-only people management view (default export Team, "use client").
  - src/components/atelier/StatusBadge.tsx — additive extension with Available/Busy/Unavailable statuses (emerald/amber/stone) so freelancer pills match the contract.
- Features delivered: premium stat strip with AnimatedNumber counts, burgundy pill tabs, gradient-avatar roster (owner marked + non-deletable), gradient-avatar freelancer list with per-specialty icons + rate + status badge + inline status-change Select + AlertDialog-confirmed delete, two full premium dialogs (Add Member with 409 handling, Add Freelancer), SkeletonList loaders, EmptyState empties, sonner toasts on every mutation, fully responsive (tabs scroll, rows stack on mobile, dialogs max-w-lg), burgundy #800020 primary throughout, tabular-nums on rates, animate-fade-in-up on PageHeader.
- Consumes: @/components/atelier/{PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState, SkeletonList, PremiumButton, StatusBadge}, @/components/ui/{Tabs, Dialog, AlertDialog, Input, Label, Textarea, Select}, @/lib/api (apiGet/apiPost/apiPatch/apiDelete), @/lib/format (formatCurrency), @/lib/types (User, Freelancer), @/stores/auth (useAuth), @tanstack/react-query (useQuery + useMutation + invalidate), sonner (toast), lucide-react.

---
Task ID: 21
Agent: full-stack-developer (community view)
Task: Build Community view (studio internal wall/feed).

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to the PREMIUM REDESIGN CONTRACT + the CONTRACT FOR TEAM + COMMUNITY VIEWS (burgundy #800020 / cream #faf8f5 tokens, premium primitives PageHeader/SectionCard/PremiumButton/EmptyState/SkeletonCard, surface-premium + elevate-sm + lift + animate-fade-in-up + tabular-nums utilities, sonner toasts, TanStack Query + apiGet/apiPost, useAuth user context, CommunityPost/CommunityComment/CommunityPostType types).
- Inspected premium primitives (PageHeader, SectionCard, PremiumButton, EmptyState/SkeletonCard) + shadcn Input/Label/Textarea/Select to confirm exact prop shapes and class conventions.
- Confirmed backend already exists: GET/POST /api/community (returns posts with comments + _count.likes, ordered pinned-then-recent), POST /api/community/[id]/like { authorId } → { liked: boolean } (toggle), POST /api/community/[id]/comments { authorId, authorName, body } → CommunityComment.
- Confirmed page.tsx already routes `case "community": return <Community />` via dynamic import.
- Created src/views/Community.tsx — single "use client" default export `Community` + inline `PostCard` sub-component, ~580 lines.
- PageHeader: eyebrow "Studio wall" + MessageSquare icon, title "Community", subtitle "Updates, questions, inspiration and showcases from the atelier.", actions = burgundy MessageSquare-in-circle accent.
- Composer (SectionCard "Share something", `lg:sticky lg:top-6 z-10` on desktop, animate-fade-in-up):
  - Row 1: type Select (Update/Question/Inspiration/Showcase; Announcement gated to user.role === "madam") + optional title Input (Label with "optional" suffix).
  - Row 2: body Textarea (full width, 3 rows, placeholder).
  - Footer: char counter (`{body.length}/500`, turns burgundy when over limit) + Post PremiumButton (primary, Send icon, loading state, disabled when body empty or over 500).
  - Submit → POST /api/community { authorId: user.id, authorName: user.fullName, authorRole: user.role, type, title?, body } → invalidate ['community'] + toast "Posted to the wall." + clear form (body/title/type reset).
- Filter pills row (flex flex-wrap gap-2, animate-fade-in-up): All / Updates / Questions / Inspiration / Showcases / Announcements. Active = burgundy bg + white text + elevate-burgundy; inactive = white bg + stone text + #E7E5E4 border with hover lift. Client-side filter (pinned posts always surface first regardless of filter).
- Feed: list of PostCard articles. Each = `surface-premium border border-[#E7E5E4] rounded-xl elevate-sm lift animate-fade-in-up overflow-hidden` with staggered `style={{ animationDelay: idx*60ms }}` (capped at 8 to avoid long delays).
  - Header row: gradient avatar (initial of authorName, `bg-gradient-to-br from-[#800020] to-[#6b0018]`) + authorName (font-medium) + role chip (madam=burgundy "Owner", staff=stone "Staff", trainer=amber "Trainer", trainee=sky "Trainee") + time-ago (muted). Right side: type chip (colored per type — announcement=burgundy, showcase=emerald, question=sky, inspiration=amber, update=stone) with type icon + amber Pin badge if pinned.
  - Body: optional title (font-display text-lg) + body text (`whitespace-pre-wrap` preserves line breaks).
  - Image: rounded-lg frame, aspect-video, object-cover, shadow-inner, bg-[#FBF9F7] (subtle inner shadow per spec).
  - Actions row: Like button (Heart icon, fills burgundy when liked, count badge with tabular-nums; aria-pressed + aria-label) + Comment button (MessageSquare icon + count; toggles comment panel).
  - Comments section (shown when post has comments OR comment panel toggled open): tinted bg-[#FBF9F7]/40, separated by hairline border-top. Existing comments list (small gradient avatar dot + authorName + time-ago + body, whitespace-pre-wrap). Comment input (Input + PremiumButton sm "Send" with loading state) at bottom → POST /api/community/[id]/comments { authorId, authorName, body } → invalidate + toast "Comment posted." + clear input. Enter submits (Shift+Enter for newline).
- Like behavior: tracked in local Set<string> of liked postIds persisted per-user in localStorage (`ms_community_liked_{userId}`) so the heart stays filled across sessions even though the API doesn't expose `likedByMe`. On click → POST /api/community/[id]/like { authorId } with optimistic cache mutation (onMutate cancels in-flight queries, snapshots prev, updates _count.likes ±1, toggles local set; onError rolls back + toast; onSuccess syncs local set with response.liked; onSettled invalidates ['community']). Toast "Liked." on like. While pending, button shows opacity-60 + cursor-wait.
- Loading: 4 SkeletonCards in a grid. Error: SectionCard + EmptyState (MessageSquare icon) + Retry PremiumButton outline that invalidates the query. Empty: SectionCard + EmptyState "No posts yet" with description "Start the conversation — share an update, question, or showcase."
- Time-ago helper defined inline exactly per spec (just now / Xm ago / Xh ago / Xd ago / fallback to locale date "12 Mar").
- Quality bar: SectionCard + PremiumButton everywhere; elevate-sm + lift on feed cards; gradient burgundy avatars; burgundy Heart fill on liked; animate-fade-in-up on PageHeader (built-in) + composer + filter row + staggered feed cards; sonner toasts for all mutations (post / like / comment / errors); SkeletonCard loaders; EmptyState for empties + errors; responsive (composer grid collapses to single column on mobile, filter pills wrap, feed cards full-width); burgundy #800020 primary throughout, no blue/indigo as primary; tabular-nums on all counts.
- Accessibility: aria-pressed on toggle buttons (like, comment, filter pills), aria-labels on icon-only actions, semantic <article> + <ul>/<li> for comments, hidden decorative avatars (aria-hidden).
- Verified: `bun run lint` → 0 errors, 0 warnings project-wide. `bunx tsc --noEmit --skipLibCheck` → 0 errors in src/views/Community.tsx (remaining TS errors are in prisma/seed.ts + examples/websocket/* + upload/extracted/* legacy files, not mine). Dev server compiled successfully after save (✓ Compiled in 9.9s, GET / 200).

Stage Summary:
- File created: src/views/Community.tsx (~580 lines, single "use client" default export `Community` + inline `PostCard` sub-component).
- Features delivered: premium composer (sticky on desktop, type+title+body, char counter, Post PremiumButton with loading), 6 filter pills (All/Updates/Questions/Inspiration/Showcases/Announcements) with burgundy active state, staggered feed cards with gradient avatars + role chips + type chips + Pin indicator, body with whitespace-pre-wrap, image frame with shadow-inner, like button with optimistic count + persisted local liked-set + burgundy Heart fill, comment panel toggle with comment list + Input+Send PremiumButton, skeleton loaders, EmptyState for empty + error, sonner toasts for all mutations.
- Consumes: @/components/atelier/{PageHeader, SectionCard, PremiumButton, EmptyState, SkeletonCard}, @/components/ui/{Input, Label, Textarea, Select+parts}, @/lib/api (apiGet, apiPost), @/lib/utils (cn), @/lib/types (CommunityPost, CommunityComment, CommunityPostType), @/stores/auth (useAuth), @tanstack/react-query (useQuery, useMutation, useQueryClient), sonner (toast), lucide-react (MessageSquare, Send, Heart, Pin, Sparkles, HelpCircle, Lightbulb, Image as ImageIcon, Megaphone).
- Backend dependency (already implemented by Task 19): GET /api/community returns CommunityPost[] with comments[] + _count.likes ordered pinned-then-recent; POST /api/community creates a post; POST /api/community/[id]/like { authorId } toggles + returns { liked }; POST /api/community/[id]/comments { authorId, authorName, body } adds a comment.

---
Task ID: 22 (team + community verification)
Agent: main
Task: Verify Team + Community views + all new functions end-to-end with browser.

Work Log:
- Lint: `bun run lint` → 0 errors, 0 warnings.
- Browser verification (owner: madam@studio.com):
  1. Team view renders with stat strip (Staff/Trainers/Freelancers/Available), Staff & Trainers + Freelancers tabs.
  2. Add Member (REAL FUNCTION) — filled name "Kwabena Owusu" + email "kwabena@studio.com" + role Staff → roster went 4→5 + "added to the atelier" toast. Verified persisted to DB (role: staff).
  3. Freelancers tab shows 5 seeded freelancers with specialty icons, status badges, status-change selects, remove buttons.
  4. Add Freelancer (REAL FUNCTION) — filled name "Selina Beads" + skills + phone + rate 450 + specialty Beader → persisted to DB (specialty: Beader, rate: 450).
  5. Community view renders with premium composer (type select, title, message, char counter), filter pills, feed of posts with avatars + type chips + like/comment actions.
  6. Post to wall (REAL FUNCTION) — typed title "Testing the new community wall" + body → appeared at top of feed + "Posted to the wall." toast. Verified in DB.
  7. Like (REAL FUNCTION) — clicked heart on the new post → "Liked." toast + heart filled burgundy. Optimistic count updated.
  8. Comment (REAL FUNCTION) — toggled comment panel, typed "Looks great — this will be so useful for the team!" → comment appeared inline + persisted to DB (verified: 1 comment on the post).
- Console errors: none. Re-seeded clean demo data after testing.

Stage Summary:
- Owner can now add staff, trainers (via Team → Add Member) and freelancers (via Team → Freelancers → Add Freelancer). All persist to DB.
- Community feed fully functional: post (with type + optional title + body), like (toggle), comment, filter by type. All persist.
- Two new nav items: Team (owner-only) + Community (everyone). Both follow the premium design system.
- Lint clean, no runtime errors. App is production-ready with the new people + community features.

---
Task ID: 23 (trainees foundation)
Agent: main
Task: Make trainees a first-class part of the atelier — schema, API, nav scoping, plus a Trainees tab in Team and a Progress view.

Work Log:
- Prisma schema: added TrainingLog model (traineeId, mentorId, skill, title, note, status [Learning|Practicing|Proficient], date). Added trainingAsTrainee + trainingAsMentor relations on User. db:push'd.
- Re-seeded: added 1 trainer (Coach Afia, trainer@studio.com) + 2 trainees (Ama Trainee ama@studio.com, Kojo Trainee kojo@studio.com). Added 5 training log entries (pattern drafting, flat-felled seams, bodice boning, measurements, kente cutting) with mentor = trainer/madam. All passwords "atelier2025".
- API routes:
  - GET /api/training-logs?traineeId=ID (include trainee + mentor) / POST (create)
  - PATCH/DELETE /api/training-logs/[id]
- Types: added TrainingLog + TrainingStatus to src/lib/types.ts.
- Nav: added "progress" ViewKey. AppShell now scopes by role: owners see all 11 items; staff see their workbench subset; TRAINERS see the full app (fall through); TRAINEES see a focused subset — Dashboard, Orders, Board, Tasks, Progress (GraduationCap icon), Community. Added GraduationCap icon + Progress nav item (trainee:true).
- Wired Progress into page.tsx dynamic import + CurrentView switch.
- Restarted dev server to load new Prisma client. Verified /api/training-logs returns seeded data.

Stage Summary — FOUNDATION READY. Two view tasks now needed (dispatched in parallel):
- UPDATE src/views/Team.tsx: add a third "Trainees" tab (owner adds/manages trainees, sees mentor + a link to their progress).
- BUILD src/views/Progress.tsx: trainee = "My Progress" (their training logs + assigned tasks + orders contributed + add log); owner/trainer = "Trainee Progress" (all trainees with their logs + stats).

═══════════════════════════════════════════════════════════════════
## CONTRACT FOR TEAM UPDATE + PROGRESS VIEW
═══════════════════════════════════════════════════════════════════

### Premium primitives (use these — see PREMIUM REDESIGN CONTRACT earlier in worklog)
- `PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState, SkeletonCard, SkeletonList, PremiumButton, StatusBadge` from `@/components/atelier/*`
- shadcn: Dialog, Input, Label, Textarea, Select(+parts), Tabs(+parts), Separator
- `toast` from sonner, `apiGet, apiPost, apiPatch, apiDelete` from `@/lib/api`
- `useQuery`/`useMutation` from `@tanstack/react-query`, `useNav` from `@/stores/nav`, `useAuth` from `@/stores/auth`, `useRole` from `@/stores/role`
- icons from lucide-react

### Auth/role context
- `const { user } = useAuth()` — logged-in user { id, email, fullName, role, gender }
- `const { isTrainee, isStaff } = useRole()` — isTrainee() true for role=trainee; isStaff() true for staff OR trainee
- Trainee demo logins: ama@studio.com, kojo@studio.com (password atelier2025)
- Trainer demo login: trainer@studio.com

### Team view UPDATE (src/views/Team.tsx)
Currently has 2 tabs: "Staff & Trainers" | "Freelancers". ADD a third tab "Trainees" between them.
- Order: "Staff & Trainers" | "Trainees" | "Freelancers"
- Trainees tab: SectionCard (bodyClassName p-0). Header action: PremiumButton "Add Trainee" (primary, GraduationCap icon) → opens AddTraineeDialog (same fields as Add Member but role fixed to "trainee", plus an optional Mentor Select populated from users with role trainer or madam). POST /api/users { fullName, email, role: 'trainee', gender, phone, password } → invalidate ['users'] + toast.
- Trainees list: each row shows gradient avatar, fullName, "Trainee" StatusBadge, email/phone, mentor name (if assigned — but mentor isn't a user field; mentor is per-training-log, so just show "Mentor: {trainer.fullName}" if you can derive it, or skip). Show a small stat: count of training logs + proficiency breakdown (e.g. "2 Proficient · 1 Practicing · 1 Learning"). Compute by fetching /api/training-logs and grouping by traineeId. A "View progress" ghost button → `go('progress', { id: trainee.id })` (the Progress view reads selectedId).
- Keep the existing Staff & Trainers + Freelancers tabs as-is (just move them).
- Stat strip update: change the 4 metrics to Staff / Trainers / Trainees / Freelancers (replace Available freelancers with Trainees, or make it 5 metrics). Use AnimatedNumber.
- Add the StatusBadge statuses: "Learning" (amber), "Practicing" (sky), "Proficient" (emerald) — extend StatusBadge if not present.

### Progress view BUILD (src/views/Progress.tsx, default export Progress, "use client")
Two modes based on the logged-in user's role:

**Trainee mode** (user.role === 'trainee') — "My Progress":
- Reads `const { selectedId, go } = useNav()` — but for a trainee, always use their own user.id (ignore selectedId, OR if selectedId is set and user is trainee, only show own if selectedId === user.id else redirect to own). Simplest: trainee always sees their own progress.
- PageHeader: eyebrow "My apprenticeship", title "My Progress", subtitle "Your skill journey at the atelier."
- Premium stat strip (4): Total logs, Proficient skills, Practicing, Learning. AnimatedNumber.
- A "Skills" SectionCard: group logs by skill, show each skill with its latest status badge + count of entries. Like a skill mastery overview.
- A "Training Log" SectionCard (the timeline): list of the trainee's TrainingLog entries (date, skill chip, title, note, status StatusBadge, mentor name). Newest first. An "Log new learning" PremiumButton → Dialog (skill Input or Select of common skills, title, note Textarea, status Select Learning/Practicing/Proficient, date default today) → POST /api/training-logs { traineeId: user.id, mentorId: optional, skill, title, note, status, date } → invalidate + toast.
- A "My Tasks" SectionCard: fetch /api/tasks, filter staffId === user.id, show tasks (title, status, priority, dueDate). 
- A "Orders I've worked on" SectionCard: fetch /api/orders, filter assignedStaffId === user.id, show recent orders (garment, status, date). Click → go('order', {id}).

**Owner/Trainer mode** (user.role === 'madam' or 'trainer') — "Trainee Progress":
- Reads selectedId from useNav to pick a trainee; if none, show a trainee picker (Select of users with role trainee) at top.
- PageHeader: eyebrow "Apprenticeship", title "Trainee Progress", subtitle "Review your trainees' skill journeys."
- A trainee selector (Select or a row of trainee chips with avatars).
- Then show the selected trainee's progress (same as trainee mode but for that trainee): stat strip, skills overview, training log timeline (with ability to ADD a log as mentor — mentorId = user.id), tasks, orders. Owner/trainer can also PATCH a log's status (e.g. mark Practicing → Proficient) via a Select on each log row, and DELETE.
- A mentor "Log for trainee" PremiumButton → Dialog with trainee fixed (the selected trainee), mentor = current user.

### API shapes
- GET /api/training-logs?traineeId=ID → TrainingLog[] (with trainee + mentor)
- POST /api/training-logs { traineeId, mentorId?, skill?, title, note?, status?, date? } → TrainingLog
- PATCH /api/training-logs/[id] { skill?, title?, note?, status?, mentorId? } → TrainingLog
- DELETE /api/training-logs/[id] → { ok: true }
- GET /api/users → User[] (filter role==='trainee' client-side for the picker)
- GET /api/tasks → Task[] (filter by staffId)
- GET /api/orders → Order[] (filter by assignedStaffId)

### Quality bar (PREMIUM — match the rest of the app)
- SectionCard everywhere, elevate-sm + lift
- Gradient avatars, tabular-nums on counts
- PremiumButton for all CTAs with loading states
- `animate-fade-in-up` on PageHeader + staggered on log timeline
- Toasts for all mutations
- Skeleton loaders, EmptyState for empties
- Responsive: tabs scroll on mobile, lists full-width
- Burgundy #800020 primary
- StatusBadge needs Learning/Practicing/Proficient styles (extend if missing)

### Worklog
Before starting, read `/home/z/my-project/worklog.md`. After finishing, APPEND a new section starting with `---` with Task ID, agent, task, work log, stage summary.

---
Task ID: 25
Agent: full-stack-developer (progress view)
Task: Build Progress view (trainee + owner/trainer modes).

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to PREMIUM REDESIGN CONTRACT (burgundy #800020 / cream #faf8f5, surface-premium + elevate-sm + lift + animate-fade-in-up) and the CONTRACT FOR TEAM UPDATE + PROGRESS VIEW (exact API shapes, trainee vs owner/trainer modes, premium primitives, quality bar).
- Inspected premium primitives (PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState/SkeletonList, PremiumButton, StatusBadge) and existing views (Team.tsx, Tasks.tsx, Orders.tsx) for gradient-avatar + premium-tabs + row patterns.
- Verified backend already exists (Task 23): GET /api/training-logs?traineeId=ID (with trainee + mentor), POST /api/training-logs, PATCH/DELETE /api/training-logs/[id], GET /api/users, GET /api/tasks, GET /api/orders.
- Extended StatusBadge.tsx additively (non-breaking): added Learning=amber, Practicing=sky, Proficient=emerald entries to both STATUS_STYLES + DOT_COLOR maps so the training pills match the contract colours.
- Wrote src/views/Progress.tsx (~1170 lines, single "use client" default export `Progress` with inline sub-components):
  - Top-level `Progress` switches on role: trainees render `<TraineeProgress traineeId={user.id}>` (always their own logs); owners/trainers render `<OwnerProgress>` which uses `useNav().selectedId` to pick a trainee.
  - TraineeProgress wrapper (max-w-[1100px], p-5 md:p-8): PageHeader eyebrow "My apprenticeship" + GraduationCap icon, title "My Progress", subtitle "Your skill journey at the atelier." → renders shared ProgressBody with viewerRole="trainee".
  - OwnerProgress wrapper: PageHeader eyebrow "Apprenticeship" + GraduationCap, title "Trainee Progress", subtitle, actions slot = compact owner/trainer chip (gradient avatar + label + signed-in name). Trainee picker SectionCard: desktop = horizontal scrollable chip row (gradient avatar + name + "Trainee" label, active chip = burgundy gradient + elevate-burgundy + white text, inactive = white surface + #E7E5E4 border + lift hover); mobile = Premium Select dropdown. On pick → `go('progress', { id: trainee.id })`. Empty state with "Go to Team" outline button when no trainees.
  - SelectedTraineeHeader: premium surface-premium card with large burgundy gradient avatar, trainee name + "Trainee" StatusBadge, email (Mail) + phone (Phone), "Change trainee" ghost button. animate-fade-in-up on appear.
  - Shared ProgressBody (used by both modes, parameterised by traineeId + viewerRole + mentorId):
    - TanStack useQuery on GET /api/training-logs?traineeId={id} (key ['training-logs', traineeId]); useQuery on GET /api/tasks + GET /api/orders for the assigned-staff filter sections.
    - Premium stat strip (grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6): 4 PremiumMetric cards — Total Logs (accent, GraduationCap), Proficient (Sparkles), Practicing (Scissors), Learning (GraduationCap). AnimatedNumber on each value, tabular-nums.
    - SkillMasteryCard (SectionCard "Skill mastery" bodyClassName=p-0): groups logs by skill (deterministic), each row shows skill name (font-medium) + latest status StatusBadge + entry count ("N entries") tabular-nums + STATUS_HINT micro-copy + a slim burgundy progress bar showing % Proficient. Sorted by latest entry date desc. Empty: EmptyState with GraduationCap "No skills logged yet".
    - TrainingLog timeline (SectionCard "Training log" bodyClassName=p-0, header action = PremiumButton "Log new learning" (trainee) / "Log for trainee" (owner) primary sm + Plus icon → LogDialog):
      - Each row (animate-fade-in-up, staggered 60ms): date column (month abbreviation + day + year, font-display), vertical Separator, content column (skill chip if present — burgundy-tinted with Scissors icon, title font-medium, note with whitespace-pre-wrap, mentor line "with {mentor.fullName}" with GraduationCap icon), actions column (inline Select for status PATCH + ghost Trash2 button revealed on hover → AlertDialog confirm → DELETE). Loading: SkeletonList 4 rows. Empty: EmptyState "No log entries yet — log your first learning."
      - Inline status Select fires PATCH /api/training-logs/[id] { status } → invalidate + toast "Training log updated." Delete uses AlertDialog with "Delete entry" action and toast "Training log deleted." on success.
    - MyTasksCard (SectionCard "My tasks" bodyClassName=p-0): lists tasks filtered by staffId === traineeId, sorted (pending first then due date asc). Each row: title + priority StatusBadge, customer/garment subtext, dueDate (CalendarDays, amber + bold if overdue & not Done), StatusBadge. Empty: EmptyState with CheckSquare "No tasks assigned to you."
    - OrdersContributedCard (SectionCard "Orders I've contributed to" bodyClassName=p-0): lists orders filtered by assignedStaffId === traineeId, newest first, capped at 8. Each row is a button → go('order', { id }): garment + customer, shortDate tabular-nums, formatCurrency tabular-nums, StatusBadge, ArrowRight that turns burgundy on hover. Empty: EmptyState with ShoppingBag.
    - LogDialog (split into LogDialog wrapper + LogForm child so the form remounts fresh on each open without an effect — avoids the react-hooks/set-state-in-effect lint rule): fields = Skill Select (9 COMMON_SKILLS including Other), Status Select (Learning/Practicing/Proficient), conditional "Skill name" Input when Other is chosen, required Title Input, Note Textarea (3 rows, resize-none), Date input defaulting to todayISO. PremiumButton "Add entry" (loading state) submits POST /api/training-logs { traineeId, mentorId (owner mode only — null in trainee mode), skill, title, note, status, date } → invalidate ['training-logs', traineeId] + ['training-logs'] + toast "Training log added." + close.
  - Helper utilities: initialOf(name), gradientFor(name) — deterministic burgundy-leaning gradient palettes for avatars.
- Accessibility: aria-pressed on trainee chips, aria-label on icon-only delete button, sr-only close in AlertDialog, semantic <ul>/<li> for skill + task + order lists, decorative avatars aria-hidden.
- Verified: `bunx eslint src/views/Progress.tsx src/components/atelier/StatusBadge.tsx` → 0 errors, 0 warnings. `bunx tsc --noEmit --skipLibCheck` → 0 errors in my files. (Remaining `bun run lint` errors are in src/views/Team.tsx — TraineesCard + AddTraineeDialog not yet defined — which is Task 24's scope, not mine.) Dev server log: GET /api/training-logs 200 in 736ms after first compile.

Stage Summary:
- Files created/modified:
  - src/views/Progress.tsx — premium trainee skill-journey + mentor oversight view (default export Progress, "use client", ~1170 lines, inline sub-components TraineeProgress / OwnerProgress / SelectedTraineeHeader / ProgressBody / SkillMasteryCard / TrainingLogRow / MyTasksCard / OrdersContributedCard / LogDialog / LogForm).
  - src/components/atelier/StatusBadge.tsx — additive extension with Learning/Practicing/Proficient statuses (amber/sky/emerald) so training pills match the contract.
- Features delivered: role-based two-mode view (trainee sees own journey, owner/trainer picks a trainee via chip row or mobile Select); premium stat strip (4 AnimatedNumber metrics); skill mastery overview grouping logs by skill with progress bars + status hints; staggered training-log timeline with inline status PATCH Select + AlertDialog-confirmed DELETE; "My tasks" section filtered by staffId with overdue highlighting; "Orders I've contributed to" section filtered by assignedStaffId with navigation to order detail; premium Log dialog (Skill/Status/Title/Note/Date, conditional custom-skill input, loading state) supporting both trainee self-log and mentor "Log for trainee" mode; SkeletonList loaders; EmptyState for every empty; sonner toasts on every mutation (added / updated / deleted); animate-fade-in-up on PageHeader + SelectedTraineeHeader + staggered on skill rows + log rows; fully responsive (grids collapse 2→4 cols on stat strip, trainee chips scroll horizontally on desktop + Select on mobile, dialog max-w-lg).
- Consumes: @/components/atelier/{PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState, SkeletonList, PremiumButton, StatusBadge}, @/components/ui/{Dialog+parts, AlertDialog+parts, Input, Label, Textarea, Separator, Select+parts}, @/lib/api (apiGet, apiPost, apiPatch, apiDelete), @/lib/format (formatCurrency, formatDate, shortDate, todayISO, isOverdue), @/lib/types (Order, Task, TrainingLog, TrainingStatus, User), @/stores/auth (useAuth), @/stores/nav (useNav), @/stores/role (useRole), @tanstack/react-query (useQuery, useMutation), sonner (toast), lucide-react, @/lib/utils (cn).
- Backend dependency (already implemented by Task 23): GET /api/training-logs?traineeId=ID returns TrainingLog[] with trainee + mentor (ordered date desc); POST /api/training-logs creates a log; PATCH /api/training-logs/[id] updates fields; DELETE /api/training-logs/[id] removes a log.

---
Task ID: 24
Agent: full-stack-developer (team trainees tab)
Task: Add Trainees tab to Team view.

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to the PREMIUM REDESIGN CONTRACT (burgundy #800020 / cream #faf8f5, surface-premium + elevate-sm + lift + animate-fade-in-up + tabular-nums) and the CONTRACT FOR TEAM UPDATE + PROGRESS VIEW (exact API shapes, layout, quality bar). Re-read existing src/views/Team.tsx (~970 lines, 2 tabs) + StatusBadge + PremiumButton + PremiumMetric + EmptyState + SectionCard + nav store + auth store + types (TrainingLog, User).
- Confirmed the Learning/Practicing/Proficient StatusBadge entries already exist (added by Task 23). Additively extended src/components/atelier/StatusBadge.tsx with a new "Trainee" role chip (bg-[#800020]/8 text-[#800020] border-[#800020]/15, dot bg-[#800020]) so the new Trainees tab can render a burgundy-tinted role pill. Existing statuses untouched.
- Edited src/views/Team.tsx:
  - Imports: added ArrowRight (lucide), useNav (stores/nav), and TrainingLog to the type import.
  - Team(): added `const { go } = useNav();`, `addTraineeOpen` state, a new `trainingLogsQ` useQuery against GET /api/training-logs (key ["training-logs"]) feeding the per-trainee stats, and a `mentors` useMemo (users with role trainer or madam, sorted) for the AddTraineeDialog.
  - Stat strip: replaced the "Available freelancers" metric with "Trainees" → 4 metrics: Staff (accent, UsersRound), Trainers (GraduationCap), Trainees (GraduationCap), Freelancers (Briefcase). All AnimatedNumber.
  - Tabs: inserted a "Trainees" tab between Staff & Trainers and Freelancers (value="trainees"). TabsList already scrolls on mobile (overflow-x-auto + whitespace-nowrap).
  - Rendered <TraineesCard> for the new tab passing users + trainingLogs + handlers, and wired <AddTraineeDialog> (mentors list) with onDone invalidating both ["users"] and ["training-logs"].
- TraineesCard component (new): SectionCard titled "Apprentices · N" (bodyClassName p-0) with an "Add Trainee" PremiumButton (primary sm, GraduationCap) header action. Computes per-trainee stats via useMemo grouping the training logs by traineeId → {total, proficient, practicing, learning, mentor}. Loading → SkeletonList(3). Empty → EmptyState (GraduationCap, "No trainees yet", Add Trainee CTA). Each row: gradient burgundy avatar (initial), fullName (font-medium) + Trainee StatusBadge, email/phone subtext (Mail/Phone), a mini-summary line with color-coded tabular-nums counts ("N logs · {emerald Proficient} · {sky Practicing} · {amber Learning}") or "No logs yet", optional Mentor label (derived from latest log's mentor.fullName, hidden on mobile), and an outline-sm PremiumButton "View progress" (GraduationCap + ArrowRight with group-hover translate) → onView(trainee.id). Responsive: stacks vertically on mobile (flex-col → sm:flex-row), pl-14 alignment for the action row on mobile.
- AddTraineeDialog component (new): fields — Full Name (required, autoFocus), Email (required), Mentor (optional Select of trainers+madam, informational only — caption clarifies it's not persisted and logs are mentor-assigned from the Progress view), Gender (Select), Phone, Password (default "atelier2025"). On submit POSTs /api/users { fullName, email, role: 'trainee', gender, phone, password } (mentorId intentionally omitted from the payload per the task's "simplest" guidance). onSuccess → toast + invalidate + reset + close. onError: 409 (email exists) → friendly error toast with description; other errors → generic error toast with the message. Cancel + Add trainee PremiumButtons (outline / primary-md with loading state). Form resets on close when not pending. Reuses the shared Field helper.
- Existing Staff & Trainers + Freelancers tabs untouched — only inserted the new tab between them and added the dialog instance.
- Replaced 6 literal `\u00b7` / `\u2014` escape sequences (an artifact of the edit) with the actual middle-dot and em-dash characters via sed so the UI renders punctuation correctly.
- Ran `bun run lint 2>&1 | tail -5` → clean (only `$ eslint .`, no errors/warnings). Dev log shows GET /api/training-logs 200 (Team view compiled and fetched its new query successfully).

Stage Summary:
- src/components/atelier/StatusBadge.tsx — additive "Trainee" role chip added (Learning/Practicing/Proficient were already present from Task 23).
- src/views/Team.tsx (~1406 lines) updated: stat strip now 4 metrics (Staff / Trainers / Trainees / Freelancers with AnimatedNumber), new middle "Trainees" tab with a TraineesCard (gradient avatars, Trainee StatusBadge, color-coded proficiency mini-summary from /api/training-logs, mentor hint, View-progress PremiumButton → go('progress', { id })), and an AddTraineeDialog (POST /api/users with role='trainee', 409 handling, mentor as informational-only field). Staff & Trainers + Freelancers tabs preserved verbatim.
- Lint clean. Premium design bar met (SectionCard + elevate-sm + lift, gradient avatars, tabular-nums, PremiumButton CTAs with loading, SkeletonList + EmptyState, burgundy #800020 primary, responsive tabs/rows).

---
Task ID: 26 (trainees verification)
Agent: main
Task: Verify trainees are a first-class part of the app — end-to-end browser test.

Work Log:
- Lint: `bun run lint` → 0 errors, 0 warnings.
- Browser verification:
  1. Trainee login (ama@studio.com): scoped nav = Dashboard, Orders, Board, Tasks, Progress, Community (no owner-only items). ✅
  2. Trainee "My Progress" view: rendered stat strip (Total Logs, Proficient, Practicing, Learning), Skill Mastery card, Training Log timeline with 3 seeded entries (Learning/Proficient/Practicing), inline status-edit Selects, delete buttons. ✅
  3. Log new learning (REAL FUNCTION): opened dialog, selected skill "Pattern drafting", status Learning, typed title + note, submitted → "Training log added." toast, 4 entries now. Verified persisted to DB (Ama: 4 logs, latest "Practised princess seam bodice"). ✅
  4. Owner login (madam@studio.com): sees full nav incl. Team + Progress.
  5. Team view: 3 tabs (Staff & Trainers | Trainees | Freelancers). Trainees tab shows Ama + Kojo with per-trainee stats + "View progress" buttons. ✅
  6. Owner Trainee Progress: clicked "View progress for Ama Trainee" → navigated to Progress view in owner mode, showing trainee picker (Ama + Kojo chips), Ama's header, her skill mastery + training log, "Log for trainee" button (mentor = owner). ✅
- Console errors: none. Re-seeded clean demo data.

Stage Summary:
- Trainees are now a first-class part of the atelier:
  - Owner adds/manages trainees in Team → Trainees tab (with mentor + progress link).
  - Trainees log in to a scoped app (Dashboard, Orders, Board, Tasks, Progress, Community).
  - Trainee "My Progress" view: skill mastery, training log timeline (add/edit/delete entries), assigned tasks, orders contributed.
  - Owner/Trainer "Trainee Progress" view: pick any trainee, review their journey, log entries as mentor, edit/delete logs.
- New schema: TrainingLog model. New API: /api/training-logs (GET/POST/PATCH/DELETE). New view: Progress. Updated: Team (Trainees tab), AppShell (role-scoped nav + Progress item).
- Demo logins: madam@studio.com (owner), trainer@studio.com (trainer), ama@studio.com + kojo@studio.com (trainees) — all password atelier2025.
- Lint clean, no runtime errors.

---
Task ID: 27 (role-scoping + portfolio/certificate foundation)
Agent: main
Task: Each user gets their own view/dashboard; trainees restricted; style photos on orders; portfolio + certificate features.

Work Log:
- Prisma schema: added Certificate model (traineeId, issuedById, programName, durationWeeks, skillsAchieved, honors, certificateNo unique, issuedAt). Added relations on User (certificatesAsTrainee + certificatesAsIssuer). db:push'd.
- Re-seeded: design images (Unsplash fashion photos) attached to completed/collected orders. Seeded 1 certificate for Kojo Trainee (issued by Coach Afia, Distinction, 12 weeks, 4 skills).
- API routes:
  - GET /api/certificates?traineeId=ID / POST (issue — prevents duplicates, auto-generates certNo) / DELETE /api/certificates/[id]
  - GET /api/portfolio?staffId=ID — completed/collected orders with customer + assignedStaff (studio-wide or per-person)
- Types: added Certificate to src/lib/types.ts.
- Role store: added isOwner(), canSeeBusiness() (madam+trainer), canCreateOrders() (madam only), canSeeAllCustomers() (madam+trainer). isStaff already = staff+trainee.
- Nav: added "portfolio" + "certificate" ViewKeys. AppShell NAV: Portfolio (staff:true, trainee:true — everyone), Certificate (staff:false, trainee:true — trainees + owner). Icons: Image (Portfolio), Award (Certificate).
- Wired Portfolio + Certificate into page.tsx dynamic imports + CurrentView switch.
- Restarted dev server. Verified /api/certificates + /api/portfolio return seeded data.

Stage Summary — FOUNDATION READY. Three parallel view tasks now dispatched:
- ROLE-SCOPING existing views (Dashboard, Orders, Customers, OrderDetail, NewOrder) for trainees + style image support.
- BUILD src/views/Portfolio.tsx (studio + trainee portfolio of completed work with images).
- BUILD src/views/Certificate.tsx (printable certificate — trainee views their own; owner/trainer issues + views any).

═══════════════════════════════════════════════════════════════════
## CONTRACT FOR ROLE-SCOPING + PORTFOLIO + CERTIFICATE
═══════════════════════════════════════════════════════════════════

### Premium primitives (use these — see PREMIUM REDESIGN CONTRACT earlier in worklog)
- `PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState, SkeletonCard, SkeletonList, PremiumButton, StatusBadge` from `@/components/atelier/*`
- shadcn: Dialog, Input, Label, Textarea, Select(+parts), Tabs(+parts), Separator
- `toast` from sonner, `apiGet, apiPost, apiPatch, apiDelete` from `@/lib/api`
- `useQuery`/`useMutation` from `@tanstack/react-query`, `useNav` from `@/stores/nav`, `useAuth` from `@/stores/auth`, `useRole` from `@/stores/role`
- icons from lucide-react

### Role helpers (from @/stores/role — use these for all scoping decisions)
- `isOwner()` — true for role madam. Sees everything, can create orders, can issue certificates.
- `isStaff()` — true for staff OR trainee.
- `isTrainer()` — true for trainer. Sees business info, can see all customers, can issue certificates.
- `isTrainee()` — true for trainee. RESTRICTED.
- `canSeeBusiness()` — madam OR trainer. Gate financial metrics/sections.
- `canCreateOrders()` — madam only. Hide "New Order" buttons for everyone else.
- `canSeeAllCustomers()` — madam OR trainer. Staff/trainees see only customers of orders assigned to them.

### Auth context
- `const { user } = useAuth()` — { id, email, fullName, role, gender }
- Demo logins (password atelier2025): madam@studio.com (owner), trainer@studio.com (trainer), akos@studio.com (staff), ama@studio.com + kojo@studio.com (trainees).

### ROLE-SCOPING TASK (edit existing views)
Edit these files to enforce role-based access:

1. **src/views/Dashboard.tsx** — currently has a staff variant via isStaff(). Add a proper TRAINEE dashboard:
   - When `isTrainee()`: show a focused "My Apprenticeship" dashboard — no money metrics, no business health, no AI insights. Instead: My Open Tasks (count + link), My Training Progress (skill mastery mini-summary + link to Progress), My Assigned Orders (recent few), Recent Community posts teaser. Use useAuth().user.id to filter.
   - When staff (not trainee): keep the existing "Your Workbench" view.
   - When owner: keep the full Madam dashboard. (Trainer: show a variant — their trainees' progress summary + community, no money. Use canSeeBusiness() to gate money sections, so trainer sees no money but sees trainees.)
   - Hide the "New Custom Order" button unless canCreateOrders().

2. **src/views/Orders.tsx** — scope the list:
   - If `isTrainee()` or (isStaff() and !canSeeAllCustomers()): filter orders to those where assignedStaffId === user.id. Trainees only see orders assigned to them.
   - Hide the "New Order" button unless canCreateOrders().
   - Hide the selling price / paid columns for trainees (use canSeeBusiness()).
   - Show the design image thumbnail on each order row if present (small `w-12 h-12 rounded` image).

3. **src/views/Customers.tsx** — scope the list:
   - If !canSeeAllCustomers(): derive the visible customers from orders assigned to the current user (fetch /api/orders, filter assignedStaffId === user.id, collect customerIds, then filter customers). Trainees/staff see only their assigned customers.
   - Hide the "Add Customer" button unless canCreateOrders() (or isOwner).

4. **src/views/OrderDetail.tsx** — hide sensitive info for trainees:
   - If !canSeeBusiness(): HIDE the entire Financials SectionCard (selling price, payments, costs, margin). Replace with a simple "Production" card showing status + fittings + tasks.
   - Hide the "Record Payment" button (payments are owner-only).
   - Show the design image prominently at the top of the detail if present (a hero `aspect-video rounded-xl` image).
   - Allow editing status via the Select only if canSeeBusiness() (trainees shouldn't change order status).

5. **src/views/NewOrder.tsx** — add a design image URL field (optional Input with preview). The Order model already has designImage. Add it to the POST payload. Keep the form owner-only (the nav already hides it from trainees, but add a guard: if !canCreateOrders(), show an EmptyState "You don't have permission to create orders").

6. **Style photos on orders**: the Order.designImage field exists. In Orders list + OrderDetail, show the image when present. In NewOrder, add an optional "Design image URL" field with a live preview. In OrderDetail, allow PATCHing the designImage (an edit affordance).

### PORTFOLIO VIEW (build src/views/Portfolio.tsx, default export Portfolio, "use client")
A gallery of the studio's completed work + a trainee's own portfolio.

Data: `GET /api/portfolio` (studio-wide) or `GET /api/portfolio?staffId=ID` (per-person).

Layout:
- PageHeader: eyebrow "Our work", title "Portfolio", subtitle "A showcase of finished pieces from the atelier."
- If owner/trainer: a staff filter Select (All + each staff member) to view a person's portfolio.
- If trainee/staff: show ONLY their own portfolio (filter staffId = user.id). No filter select.
- A masonry/grid gallery of completed orders: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`. Each item: a card with the design image (aspect-[3/4] rounded-lg object-cover, elevate-sm lift), garment name overlay or below, customer name, date, StatusBadge. If no image, a tasteful placeholder with a Scissors icon + garment name. Click → go('order', {id}).
- Empty state: EmptyState with ImageIcon "No completed work yet."
- Loading: grid of SkeletonCards.

### CERTIFICATE VIEW (build src/views/Certificate.tsx, default export Certificate, "use client")
A printable certificate of apprenticeship completion.

Two modes:
- **Trainee mode** (isTrainee()): show THEIR certificate (GET /api/certificates?traineeId=user.id). If they have one, render a beautiful printable certificate (see below). If not, show an EmptyState "Your certificate will appear here once your training is complete and your mentor issues it."
- **Owner/Trainer mode** (isOwner() or isTrainer()): 
  - A trainee picker (Select or chips of users with role trainee).
  - For the selected trainee: if they have a certificate, show it. If not, show an "Issue certificate" PremiumButton → Dialog (programName default "Atelier Apprenticeship Programme", durationWeeks default 12, skillsAchieved comma text — prefilled from the trainee's Proficient skills, honors Select Distinction/Merit/Pass, issuedById = user.id) → POST /api/certificates → invalidate + toast. Also show a "Revoke" (delete) option.

Certificate design (the printable render) — make it genuinely beautiful and official-looking:
- A landscape `max-w-[900px]` card, cream/burgundy palette, ornate border (`border-4 border-[#800020]` with an inner `border border-[#800020]/30`), rounded-lg, elevate-lg, `aspect-[1.4/1]` or min-h.
- Top: studio name "Madam Studio" in font-display + a small scissors mark + "Bespoke Atelier · Accra".
- Center: "Certificate of Apprenticeship" in large font-display, "This is to certify that" (small), trainee full name (large font-display burgundy), "has successfully completed the" programName, "a {durationWeeks}-week apprenticeship programme" , "with distinction in" / "with honors: {honors}".
- Skills: "Mastered skills: {skillsAchieved}" as a row of chips.
- Bottom: signature line (issuedBy.fullName) + issuedAt date + certificateNo + a faux seal (a circular burgundy badge with "MS" + the year).
- A "Print certificate" PremiumButton (outline, Printer icon) that calls window.print() — add a print stylesheet so only the certificate prints (use a `.print-area` class + @media print to hide everything else). 

### Quality bar (PREMIUM — match the rest of the app)
- SectionCard everywhere, elevate-sm + lift
- Gradient avatars, tabular-nums on numbers
- PremiumButton for all CTAs with loading states
- `animate-fade-in-up` on PageHeader + staggered on galleries
- Toasts for all mutations
- Skeleton loaders, EmptyState for empties
- Responsive: grids collapse, certificate scales
- Burgundy #800020 primary, no blue/indigo as primary
- Print stylesheet for the certificate (@media print)

### Worklog
Before starting, read `/home/z/my-project/worklog.md`. After finishing, APPEND a new section starting with `---` with Task ID, agent, task, work log, stage summary.

---
Task ID: 29
Agent: full-stack-developer (portfolio view)
Task: Build Portfolio view (studio + personal gallery of completed work).

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to PREMIUM REDESIGN CONTRACT (burgundy #800020 / cream #faf8f5, surface-premium + elevate-sm + lift + animate-fade-in-up + shimmer + tabular-nums) and the CONTRACT FOR ROLE-SCOPING + PORTFOLIO + CERTIFICATE (exact API shapes, role helpers, layout, quality bar).
- Inspected premium primitives (PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState/SkeletonCard, StatusBadge) and verified role helpers in @/stores/role (canSeeAllCustomers, isTrainee), useAuth().user.id for self-scoping, useNav().go for routing.
- Verified API endpoints: GET /api/portfolio (studio-wide Order[] with customer + assignedStaff, status in [Completed, Collected/Delivered]), GET /api/portfolio?staffId=ID (per-person), GET /api/users (User[] for the staff filter).
- Created src/views/Portfolio.tsx — single "use client" default export Portfolio (~240 lines) with inline GalleryCard sub-component.
- Layout: wrapper p-5 md:p-8 max-w-[1300px] mx-auto w-full. PageHeader with eyebrow "Our work" + ImageIcon, title "Portfolio", subtitle that switches by mode ("A showcase of finished pieces from the atelier." for owner/trainer; "Your completed pieces from the atelier." for staff/trainee). Actions slot = staff filter Select shown only when canSeeAllCustomers() (All staff + each user from /api/users); self-scoped users get no Select.
- Stat strip: 3 PremiumMetrics with animate-fade-in-up — Total Pieces (accent, ImageIcon, AnimatedNumber), With Photos (count designImage != null, ImageIcon), This Year (count orders where orderDate year == current year, CalendarDays). All values via AnimatedNumber (tabular-nums auto-applied).
- Gallery: grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4. Each item is a <button> → go('order', { id }) with classes rounded-lg overflow-hidden border border-[#E7E5E4] surface-premium elevate-sm lift group hover:border-[#800020]/30 transition-colors focus-visible:ring-2 focus-visible:ring-[#800020]/30 animate-fade-in-up, staggered via style animationDelay = idx * 50ms.
- Card image area: aspect-[3/4] bg-[#faf8f5] relative overflow-hidden. If designImage: <img> object-cover absolute inset-0 with group-hover:scale-105 transition-transform duration-500 + a bg-gradient-to-t from-black/45 overlay that fades in on hover. If no image: centered circle with Scissors icon + garment name line-clamp-2. Floating StatusBadge absolute top-2 right-2 with bg-white/95 backdrop-blur-sm shadow-sm (keeps Completed/Collected legible against any image).
- Card info area (p-3 space-y-1): garment name (font-medium text-sm truncate, tints burgundy on hover), customer name row (text-xs stone-500 with User icon), date row (text-xs stone-400 tabular-nums with CalendarDays icon, shortDate(orderDate)).
- Loading: grid of 8 SkeletonCard items in the same gallery grid (className aspect-[3/4] flex flex-col justify-end p-4 — twMerge dedupes the default p-5). Empty: EmptyState with ImageIcon — "No completed work yet." for owner/trainer, "You haven't completed any pieces yet." for staff/trainee; description differentiates self vs studio scope; wrapped in SectionCard. Error: SectionCard + EmptyState with ImageIcon "Couldn't load the gallery" + retry hint.
- Data flow: useQuery<Order[]>(["portfolio", effectiveStaffId || "all"]) fetches /api/portfolio (studio) or /api/portfolio?staffId=ID (scoped), enabled: !selfScoped || !!user (waits for auth hydrate before self-scoping). useQuery<UserType[]>(["users"]) only enabled for owner/trainer (drives the staff filter options). effectiveStaffId: self-scoped → user.id; owner/trainer → empty when "all", else selected id. stats memoized (total / withPhotos / thisYear). No mutations — pure read view; clicks route via go('order', { id }).
- Lint: bunx eslint src/views/Portfolio.tsx → clean (no errors, no warnings). bun run lint shows 2 pre-existing errors in src/views/Dashboard.tsx (TraineeDashboard / TrainerTraineesCard not defined — another task's territory, NOT this file). Dev log: previously showed "Module not found: Can't resolve '@/views/Portfolio'" because src/app/page.tsx was already importing it dynamically; after creating the file → "✓ Compiled in 9.2s" + "GET / 200". Resolved.

Stage Summary:
- File created: src/views/Portfolio.tsx (~240 lines, single self-contained "use client" default export Portfolio with inline GalleryCard sub-component).
- Premium features delivered: PageHeader with role-aware subtitle + staff filter Select (owner/trainer only); 3-up PremiumMetric stat strip with AnimatedNumber + tabular-nums + accent; lookbook gallery grid (2/3/4 cols responsive) with 3/4 portrait image frames, group-hover:scale-105 image zoom, subtle from-black/45 gradient overlay on hover, hover burgundy border tint, floating backdrop-blur StatusBadge chip, garment + customer + date info area with User + CalendarDays icons; staggered animate-fade-in-up on every card (50ms steps); SkeletonCard grid for loading; EmptyState (role-aware copy) for empty + error states.
- Role scoping: owner/trainer (canSeeAllCustomers) → studio-wide portfolio with staff filter; staff/trainee → auto-scoped to user.id, no filter; trainee gets trainee-specific empty copy.
- Consumes: @/components/atelier/{PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState+SkeletonCard, StatusBadge}, @/components/ui/{Select+parts}, @/lib/api (apiGet), @/lib/format (shortDate), @/lib/types (Order, User), @/stores/{auth, nav, role}, @tanstack/react-query (useQuery), lucide-react (Image as ImageIcon, Scissors, CalendarDays, User).

---
Task ID: 30
Agent: full-stack-developer (certificate view)
Task: Build Certificate view (printable apprenticeship certificate).

Work Log:
- Read worklog.md completely — bound to PREMIUM REDESIGN CONTRACT (burgundy #800020 / cream #faf8f5, surface-premium + elevate-* + lift + animate-fade-in-up + tabular-nums + shimmer) and the CONTRACT FOR ROLE-SCOPING + PORTFOLIO + CERTIFICATE (two modes, exact API shapes, certificate design spec, print stylesheet requirement, premium primitives list).
- Inspected premium primitives (PageHeader, SectionCard, EmptyState + SkeletonCard, PremiumButton, StatusBadge) for exact prop shapes; inspected existing Progress.tsx + Team.tsx for the trainee-picker pattern (gradient avatar chips on desktop + Select dropdown on mobile, useNav `selectedId` + `go('view', { id })`).
- Verified backend already exists: GET /api/certificates?traineeId=ID (returns Certificate[] with trainee + issuedBy), POST /api/certificates (auto-generates certNo, prevents duplicates with 409), DELETE /api/certificates/[id], GET /api/users (returns User[]), GET /api/training-logs?traineeId=ID (returns TrainingLog[] with status Learning/Practicing/Proficient). Confirmed seeded data: Kojo Trainee has a certificate issued by Coach Afia with Distinction honors + 4 skills.
- Wrote src/views/Certificate.tsx (~1135 lines, single "use client" default export `Certificate` with inline sub-components):
  - Top-level role switch: trainees → <TraineeCertificate traineeId={user.id}>; owners/trainers → <OwnerCertificate>; fallback EmptyState for staff (not authorized).
  - **TraineeCertificate**: useQuery GET /api/certificates?traineeId=${user.id} → cert[0]. Loading → SkeletonCard (h-640). Cert → CertificateStage (card + Print button). Empty → EmptyState with Award icon "Your certificate will appear here" + description.
  - **OwnerCertificate**: PageHeader (eyebrow "Apprenticeship" + Award, title "Certificates", actions slot = owner/trainer chip with gradient avatar). Trainee picker SectionCard (no-print): desktop = horizontal scrollable chip row (gradient avatar + name + "Trainee" label, active chip = burgundy gradient + elevate-burgundy + white text, inactive = white surface + lift hover); mobile = Select dropdown with avatar-initials items. On pick → go('certificate', { id: trainee.id }). Empty state with "Go to Team" outline button. SelectedTraineeHeader (premium surface-premium card with large gradient avatar + Trainee StatusBadge + email/phone rows + "Change trainee" ghost button). CertificateForTrainee is keyed by trainee.id so the subtree remounts fresh when switching trainees (clean way to reset the IssueDialog form state without useEffect).
  - **CertificateForTrainee**: useQuery on certificates + training-logs for the selected trainee. If cert → CertificateStage (with Revoke button). If not → IssuePanel + IssueDialog. Computes training stats (total logs, proficient count) + derives prefilled skills from Proficient log entries (group by skill, take latest status per skill, keep only Proficient, sort alphabetically, join with commas).
  - **CertificateStage**: wrapper that wraps the certificate in <div className="print-area"> + renders the action bar below (Print button + optional Revoke). Action bar has `no-print` class so it's hidden when printing.
  - **CertificateCard** (the printable render — genuinely beautiful and official): outer div bg-white border-4 border-[#800020] rounded-lg elevate-lg relative overflow-hidden, max-w-[920px] mx-auto, min-height 640px, padding via clamp(28px, 4vw, 56px). Inner border ornament (absolute inset-3 border border-[#800020]/25 rounded-md). Subtle burgundy radial background flourish at 4% opacity. Four corner Scissors icons (w-4 h-4 text-[#800020]/30). Top: scissors-in-circle (w-12 h-12 rounded-full border-2 border-[#800020] + Scissors icon) + "Madam Studio" (font-display clamp 20-26px) + "Bespoke Atelier · Accra" (text-[10px] uppercase tracking-[0.24em] text-stone-500). Title block (mt-8/10): "Certificate of Apprenticeship" in font-display clamp 30-48px font-semibold text-[#800020]. "This is to certify that" (text-[11px]/xs uppercase tracking-[0.22em] text-stone-500 mt-3). Trainee name (font-display clamp 24-38px font-semibold text-[#1C1917] mt-5/6) with thin burgundy underline (w-48 h-px bg-[#800020]/40 mx-auto mt-2). Body paragraph (mt-6, max-w-640, clamp 13-15px, leading-7): "has successfully completed the" + italic burgundy programName + ", a {durationWeeks}-week apprenticeship programme in bespoke tailoring and design." + honors block (if honors and not "None": "Awarded with {honors}." in font-medium burgundy). Skills section (mt-6/7, max-w-640): "Mastered skills" label (text-[10px] uppercase tracking-[0.22em]) + flex-wrap row of chips (each rounded-md border border-[#800020]/20 bg-[#800020]/5 text-[#800020] px-2.5 py-1 text-xs with Check icon at opacity-70). Bottom row (mt-auto pt-10/12): 3-col grid — Left "Issued by" (label + line + issuedBy.fullName font-display + "Mentor" subtext), Center faux seal (w-20 h-20 rounded-full border-2 border-[#800020] rotate(-6deg) with inner inset border + "MS" font-display clamp 16-20px + year text-[8px] uppercase tracking-[0.16em]), Right "Certificate No." (label + line + certificateNo font-mono tabular-nums break-all + issuedAt formatDate + "Date issued" subtext).
  - **IssuePanel** (when no cert): SectionCard accent with "Issue certificate" PremiumButton (primary, Award icon) in the action slot. Body: trainee identity row (gradient avatar + name + "No certificate issued" micro-label) + 3 SummaryStats (Training logs total, Proficient skills count accent, Ready to issue Yes/Soon). Separator. Tinted burgundy callout box (GraduationCap in burgundy circle + ready-to-issue copy + "Issue certificate" PremiumButton). Embeds IssueDialog.
  - **IssueDialog**: Dialog (max-w-lg, no-print). Fields: Programme name Input (default "Atelier Apprenticeship Programme"), Duration (weeks) number Input (default 12, tabular-nums), Honors Select (Distinction / Merit / Pass / None), Mastered skills Textarea (prefilled from Proficient log entries, with "Reset to proficient skills" link). Footer: Cancel outline + Issue certificate primary (loading state shows "Issuing…"). onSubmit → POST /api/certificates with { traineeId, issuedById, programName, durationWeeks, skillsAchieved, honors: honors === "None" ? "" : honors } → invalidate ['certificates'] + toast.success + close. Error toast on failure (e.g. 409 duplicate).
  - **Revoke flow**: AlertDialog (max-w-md) with confirm copy mentioning trainee name + cert number, danger action button. Confirm → DELETE /api/certificates/[id] → invalidate + toast.success + close.
  - **Print stylesheet**: injected via <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }}> at the top-level Certificate component (rendered once). @media print: body * visibility hidden, .print-area + descendants visible, .print-area positioned absolute at top-left with full width, .no-print display none, .cert-card border reduced to 3px + box-shadow none, @page size landscape margin 12mm. All chrome elements (PageHeader, trainee picker, SelectedTraineeHeader, action bar, dialogs) marked `no-print`.
  - Responsive: certificate card uses clamp() for padding + all font sizes so it scales down on mobile. Bottom row uses 3-col grid that compresses on small screens (gap-4 sm:gap-6). Skills chips flex-wrap. Trainee picker uses Select on mobile + horizontal-scroll chips on desktop.
  - Helpers: initialOf(name), gradientFor(name) — deterministic burgundy-leaning gradient palettes matching Progress.tsx. deriveProficientSkills(logs) — groups logs by skill, keeps only skills whose LATEST entry is Proficient, sorts alphabetically, joins with commas.
  - Lint: `bunx eslint src/views/Certificate.tsx` → 0 errors, 0 warnings. `bunx tsc --noEmit --skipLibCheck` → 0 errors against my file (remaining tsc errors are all in the legacy upload/extracted/ folder). `bun run lint` shows only 2 pre-existing errors in Dashboard.tsx (another agent's role-scoping task) — not from my file.
  - Verified API: GET /api/certificates?traineeId={kojo's id} returns Kojo's seeded certificate (issuedBy Coach Afia, Distinction honors, 4 skills, certNo MS-2026-9066) → CertificateCard will render correctly. GET /api/users returns 5 users including 2 trainees → picker will work. Dev log shows "✓ Compiled in 8.4s" after file creation — no compile errors.

Stage Summary:
- File created: src/views/Certificate.tsx (~1135 lines, single self-contained "use client" default export with inline sub-components: Certificate, TraineeCertificate, OwnerCertificate, SelectedTraineeHeader, CertificateForTrainee, IssuePanel, SummaryStat, IssueDialog, CertificateStage, CertificateCard).
- Features delivered: role-based two-mode view (trainee sees their own certificate + Print; owner/trainer picks a trainee via desktop chips or mobile Select, then views/prints/revokes the cert or issues a new one); printable certificate card with ornate burgundy border (border-4 + inner border ornament), corner Scissors ornaments, faux MS seal with year, studio mark with scissors-in-circle, large font-display title, trainee name with burgundy underline, body paragraph with italic burgundy program name + duration + honors, mastered-skills chips with Check icons, 3-col bottom row (Issued by / Seal / Certificate No.); print stylesheet that hides everything except .print-area; Issue dialog with Programme / Duration / Honors Select (Distinction/Merit/Pass/None) / Mastered skills Textarea prefilled from Proficient log entries + reset link; Revoke via AlertDialog confirm + DELETE; toast notifications on every mutation; SkeletonCard loaders; EmptyState for no-certificate + no-trainees + no-selection + not-authorized; animate-fade-in-up on PageHeader + SelectedTraineeHeader + IssuePanel + CertificateStage; fully responsive (clamp() padding/fonts, trainee chips scroll on desktop + Select on mobile, certificate scales down on mobile); burgundy #800020 primary throughout, no blue/indigo as primary.
- Consumes: @/components/atelier/{PageHeader, SectionCard, EmptyState + SkeletonCard, PremiumButton, StatusBadge}, @/components/ui/{Dialog + parts, AlertDialog + parts, Input, Label, Textarea, Separator, Select + parts}, @/lib/api (apiGet, apiPost, apiDelete), @/lib/format (formatDate), @/lib/types (Certificate, TrainingLog, User), @/lib/utils (cn), @/stores/{auth, nav, role}, @tanstack/react-query (useQuery + useMutation + invalidate), sonner (toast), lucide-react (Award, Printer, Scissors, GraduationCap, Check, Trash2, Mail, Phone, ArrowRight, ShieldCheck).
- Backend dependency (already implemented by Task 19/23): GET /api/certificates?traineeId=ID, POST /api/certificates (auto certNo + duplicate prevention), DELETE /api/certificates/[id], GET /api/users, GET /api/training-logs?traineeId=ID — all live and returning the expected shapes.
- Verification: bunx eslint src/views/Certificate.tsx → clean. bunx tsc --noEmit --skipLibCheck → no errors in my file. Dev log: "✓ Compiled in 8.4s" after file creation. GET /api/certificates?traineeId={kojo's id} returns the seeded certificate with all fields the CertificateCard reads.

Deliverable:
- src/views/Certificate.tsx — created. Default export `Certificate`. "use client". Lint clean. TypeScript clean.
- Kojo Trainee (kojo@studio.com / atelier2025) has a seeded certificate (Distinction, 4 skills, issued by Coach Afia) → log in as Kojo to see the printable certificate render immediately. Log in as Madam (madam@studio.com) or Trainer (trainer@studio.com) to access the trainee picker + issue/revoke flows.

---
Task ID: 28
Agent: full-stack-developer (role-scoping)
Task: Role-scope Dashboard, Orders, Customers, OrderDetail, NewOrder for trainees; add style image support.

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to PREMIUM REDESIGN CONTRACT (burgundy #800020 / cream #faf8f5, surface-premium + elevate-sm + lift + animate-fade-in-up + tabular-nums) and the CONTRACT FOR ROLE-SCOPING + PORTFOLIO + CERTIFICATE (exact role-helper semantics, per-file scoping rules, style photo cross-cutting support, premium primitives, quality bar).
- Inspected the 5 existing views + useAuth + useRole + useNav + premium primitives + lib/types.ts (confirmed Order.designImage field exists) + lib/format.ts + lib/api.ts.
- Dashboard.tsx: refactored the default export into a tiny role-switching wrapper (`if (user && isTrainee()) return <TraineeDashboard userId={user.id} />; return <MainDashboard />`). MainDashboard redefines `staff = isStaff() || isTrainer()` (trainer falls into workbench view), adds `owner = isOwner()` + `trainer = isTrainer()`. Money row + Madam-only premium sections gated by `!staff` (owner-only). "New Custom Order" button (desktop header + mobile FAB) gated by `canCreateOrders()`. PageHeader title switches: owner → "{ownerLabel}'s Atelier", trainer → "Mentor's Workbench", staff → "Your Workbench". Added `TrainerTraineesCard` (right column when trainer — lists trainees + per-trainee proficiency breakdown from /api/training-logs + "View progress" → go('progress', {id})). Added `TraineeDashboard` (PageHeader eyebrow "My apprenticeship" / title "My Workbench"; hero PremiumMetric "My Open Tasks" AnimatedNumber + "Go to Tasks" PremiumButton; "My Training Progress" SectionCard grouping /api/training-logs?traineeId=me by skill with count + proficient count + latest status StatusBadge + link to progress; "My Assigned Orders" SectionCard filtering /api/orders by assignedStaffId === user.id, newest first, capped 5, NO prices, with design image thumbnail or Scissors placeholder; "Recent Community" SectionCard with latest 2 posts from /api/community + link). NO "New Custom Order" button on the trainee dashboard.
- Orders.tsx: added useAuth + useRole imports; computed scopeToMine (trainee OR staff-without-all-customers), canSeeMoney = canSeeBusiness(), canCreate = canCreateOrders(). The enriched memo filters by assignedStaffId === user.id when scopeToMine. Staff filter Select hidden when scoped. PageHeader actions only render "New Order" when canCreate. Table header grid + each row grid template switches between 8-col (Image, Customer, Garment, Ordered, Delivery, Status, Amount, Paid) when canSeeMoney and 6-col (Image, Customer, Garment, Ordered, Delivery, Status) when not. Added a design-image thumbnail cell (w-12 h-12 rounded-md) at the start of each row that renders the img when o.designImage is present, else a Scissors placeholder (desktop-only). Amount + Paid cells wrapped in {canSeeMoney && (...)}. Empty state copy adapts to scoped vs unscoped.
- Customers.tsx: added useAuth + useRole imports; computed scopeToMine = !canSeeAllCustomers(), canCreate = canCreateOrders(). Derived myCustomerIds set from /api/orders filtered by assignedStaffId === user.id (null when not scoped). orderCounts only counts visible orders. enriched filters customers to those in myCustomerIds when scoped. PageHeader eyebrow switches: scoped → "My clients", non-scoped → "Client roster". "Add Customer" PremiumButton only rendered when canCreate. Empty-state action tree adapts: scoped → description only; non-scoped + filters → "Clear filters"; non-scoped + no filters + canCreate → "Add Customer".
- OrderDetail.tsx: added useRole + ImageIcon imports; canSeeMoney = canSeeBusiness(); imageDialogOpen state + imageMut PATCH /api/orders/[id] { designImage } (toast + cache update + dialog close). Added hero design image above the header band: when order.designImage is present, a w-full aspect-video rounded-xl object-cover elevate-md image with an "Edit image" overlay button (top-right, only when canSeeMoney) that opens EditImageDialog; when no image + canSeeMoney, a dashed-border "Add a design image" placeholder button; when no image + !canSeeMoney, no hero. Status change control now `canSeeMoney ? <Select>…</Select> : <StatusBadge status={order.status} />` (trainees see read-only badge). Financials SectionCard wrapped in `canSeeMoney ? (Financials) : (Production card)` — Production card shows 6-stat grid (Current Status as StatusBadge via new Stat `valueNode` prop, Days in Production, Fittings count, Open Tasks, Priority badge, Assigned To) + tinted note. Removed no-op "Edit" PremiumButton. Added EditImageDialog sub-component (URL Input + live aspect-video rounded-md preview + "Save image" PremiumButton; input reset to current initial on open).
- NewOrder.tsx: added useRole + ImageIcon + Lock + EmptyState imports; canCreate = canCreateOrders(). Added designImage state. Added safety-net guard at top: if !canCreate, render EmptyState ("You don't have permission to create orders" with Lock icon) inside SectionCard + "Back to dashboard" PremiumButton — form not rendered. createMut body includes designImage: designImage.trim() only when non-empty. Added "Design Image URL" field after Garment Textarea: optional Input with live aspect-video rounded-lg object-cover preview when URL non-empty, or dashed "Live preview will appear here" placeholder with ImageIcon when empty.
- Verified: `bun run lint` → 0 errors, 0 warnings project-wide. `bunx tsc --noEmit --skipLibCheck` → 0 errors in my 5 files (remaining TS errors are in upload/extracted/*, examples/*, skills/*, prisma/seed.ts — outside my scope). Dev server compiles successfully after each save (only module-not-found in dev.log is for @/views/Portfolio, another agent's task).

Stage Summary:
- Files edited (all 5):
  - src/views/Dashboard.tsx — trainee apprenticeship dashboard added (TraineeDashboard sub-component: My Open Tasks hero + My Training Progress skill mastery + My Assigned Orders + Recent Community teaser; NO money, NO business health, NO AI insights, NO New Order button); MainDashboard reorganised so money sections are owner-only (staff = isStaff() || isTrainer()), trainer sees a "My Trainees" right-column card; "New Custom Order" button gated by canCreateOrders().
  - src/views/Orders.tsx — orders scoped to assignedStaffId === user.id for trainees + staff-without-all-customers; "New Order" button gated by canCreateOrders(); Amount + Paid columns hidden when !canSeeBusiness() (table grid switches 8-col ↔ 6-col); design image thumbnail cell at the start of each row (w-12 h-12 rounded-md img or Scissors placeholder); staff filter hidden when scoped.
  - src/views/Customers.tsx — customers scoped to those with orders assigned to the current user when !canSeeAllCustomers() (derives myCustomerIds from /api/orders filtered by assignedStaffId === user.id); "Add Customer" button hidden unless canCreateOrders() (header + empty state); scoped empty state copy adapted.
  - src/views/OrderDetail.tsx — hero design image added above the header band (aspect-video rounded-xl object-cover elevate-md) with "Edit image" overlay for money viewers; EditImageDialog sub-component (URL input + live preview + PATCH); Financials SectionCard hidden when !canSeeBusiness(), replaced by a "Production" SectionCard (Current Status as StatusBadge, Days in Production, Fittings, Open Tasks, Priority, Assigned To + tinted note); status-change Select replaced by a read-only StatusBadge when !canSeeBusiness(); Stat helper extended with optional valueNode prop; removed no-op "Edit" button.
  - src/views/NewOrder.tsx — safety-net canCreateOrders() guard rendering an EmptyState ("You don't have permission to create orders") instead of the form; "Design Image URL" field with live aspect-video rounded-lg object-cover preview + dashed placeholder when empty; designImage included in the POST payload when non-empty.
- Scoping rules applied (per role):
  - Owner (madam): sees everything; can create orders; sees money metrics, financial sections, AI insights, all customers; can change order status; can edit design image.
  - Trainer: workbench dashboard with "My Trainees" summary card (no money row, no income trend, no business health, no AI insights); sees all customers; sees Financials on order detail; can change order status; can edit design image; cannot create orders.
  - Staff (non-trainee, non-trainer): workbench dashboard; only orders assigned to them; only customers whose orders are assigned to them; no money (no money row on dashboard, no Amount/Paid columns, Production card on OrderDetail); read-only status; cannot create orders; no "Add Customer" button.
  - Trainee: dedicated TraineeDashboard (My Open Tasks + My Training Progress + My Assigned Orders + Recent Community; NO money, NO business health, NO AI insights, NO New Order button); scoped Orders list; scoped Customers list; Production card on OrderDetail; read-only status; NewOrder shows EmptyState guard.
- Style photo support cross-cutting: Order.designImage shown in Orders list (thumbnail), OrderDetail (hero + editable), NewOrder (URL input + live preview), OrderDetail (EditImageDialog → PATCH /api/orders/[id] { designImage }).
- Quality bar: SectionCard everywhere with elevate-sm + lift; tabular-nums on money (only shown to canSeeBusiness); PremiumButton for all CTAs with loading states; animate-fade-in-up on PageHeader + key cards; sonner toasts for all mutations; SkeletonCard/SkeletonList loaders; EmptyState for every empty (scoped + unscoped variants); responsive (grids collapse, mobile FAB only for owners); burgundy #800020 primary throughout.
- Lint clean. TypeScript clean for my 5 files.

---
Task ID: 31 (role-scoping + portfolio + certificate verification)
Agent: main
Task: Verify each user has their own view/dashboard, trainees restricted, style photos, portfolio + certificate — end-to-end.

Work Log:
- Lint: `bun run lint` → 0 errors, 0 warnings.
- Browser verification:
  1. Trainee (Ama) login: scoped nav = Dashboard, Orders, Board, Tasks, Progress, Portfolio, Certificate, Community (no Customers/Fittings/Quotes/Style/Team). ✅
  2. Trainee dashboard = "My Workbench" with My Training Progress + My Assigned Orders + Recent Community. NO money metrics, NO "New Custom Order" button. ✅
  3. Trainee Orders: scoped to assigned only, NO "New Order" button, NO price columns. ✅
  4. Trainee Portfolio: "Your completed pieces from the atelier" with stat strip + empty state (Ama has no completed orders). ✅
  5. Trainee Certificate (Ama, no cert): "Your certificate will appear here once your training is complete and your mentor issues it." ✅
  6. Trainee (Kojo, HAS cert) login: Certificate view renders a beautiful printable certificate — "Certificate of Apprenticeship", Kojo Trainee, Atelier Apprenticeship Programme, "Awarded with Distinction", Mastered Skills chips, Issued By (Coach Afia), Certificate No., Print button. VLM rated 8/10 "highly polished, official, frame-worthy". ✅
  7. Owner (Madam) login: full dashboard with Sales/Money Received/Outstanding/Profit + "New Custom Order" button. ✅
  8. Owner Portfolio: studio-wide gallery with completed pieces (some with images, some placeholders), customer names, click → order detail. ✅
  9. Owner Certificate: trainee picker (Ama + Kojo chips). Selected Ama (no cert) → "Issue certificate" button → dialog prefilled (programme, 12 weeks, Distinction, skills prefilled from Proficient logs) → issued → certificate rendered + toast "Certificate issued. Ama Trainee's certificate is ready to print." Verified persisted to DB (2 certs total). ✅
  10. Order detail: shows "Add a design image" placeholder for orders without image; completed orders with image show the hero + "Edit image" button. ✅
- Console errors: none. Re-seeded clean demo data.

Stage Summary:
- EACH USER NOW HAS THEIR OWN VIEW + DASHBOARD:
  - Owner (Madam): full business dashboard (money, health, AI insights) + all features.
  - Trainer: workbench view (no money) + trainees summary + can issue certificates.
  - Staff: workbench view (assigned orders/tasks).
  - Trainee: "My Workbench" (apprenticeship) — NO money, NO creating orders, NO all-customers; only assigned orders/tasks + their progress + portfolio + certificate.
- TRAINees CAN'T: add orders (button hidden + NewOrder guard), see sensitive business/financial info (financials card replaced with Production card), see all customers (only their assigned), change order status (read-only badge).
- STYLE PHOTOS: Order.designImage shown as thumbnail in Orders list + hero in OrderDetail; settable in NewOrder (URL + preview) + editable in OrderDetail (for owners).
- PORTFOLIO: gallery of completed work — studio-wide for owner/trainer (with staff filter), personal for staff/trainees.
- CERTIFICATE: printable apprenticeship certificate — trainee views their own, owner/trainer issues + revokes. Print stylesheet produces a clean certificate-only page.
- New schema: Certificate model. New APIs: /api/certificates (GET/POST/DELETE), /api/portfolio. New views: Portfolio, Certificate. Updated: Dashboard/Orders/Customers/OrderDetail/NewOrder (role-scoped + style images). Role store: isOwner/canSeeBusiness/canCreateOrders/canSeeAllCustomers helpers.
- Lint clean, no runtime errors.

---
Task ID: 32 (grading + school-portal foundation)
Agent: main
Task: Add task scoring/grading, trainer-set training duration, mentor assignment, school-portal-style trainer-trainee relationship.

Work Log:
- Prisma schema:
  - User: added mentorId (self-relation "TraineeMentor"), trainingDurationWeeks, trainingStartedAt.
  - Task: added maxScore, score, gradedById (relation "TaskGrader"), gradedAt, feedback.
  - db:push'd + regenerated client.
- Re-seeded: trainees get mentor=trainer, 12-week duration, startedAt (8/6 weeks ago). Added 7 graded practice assignments (Ama: 2 graded 18/20 + 15/20, 2 pending; Kojo: 2 graded 19/20 + 17/20, 1 pending) with grader=trainer + feedback.
- API:
  - PATCH /api/users/[id] — set mentorId, trainingDurationWeeks, trainingStartedAt (+ fullName/phone/generic).
  - Extended PATCH /api/tasks/[id] — accepts maxScore, score, feedback, gradedById (sets gradedAt).
  - GET /api/tasks now includes gradedBy { id, fullName }.
- Types: User + Task updated with new fields.
- Restarted dev server. Verified: 22 tasks (4 graded), trainees have mentors + durations.

Stage Summary — FOUNDATION READY. Three parallel view tasks now dispatched:
- SCOPE + ENHANCE Tasks view: trainees see only assigned tasks with their grades; trainers see all trainee tasks + can grade.
- ENHANCE Progress view: school-portal style — graded assignments table, average/GPA, training duration progress bar, mentor info; trainer grades inline.
- ENHANCE Team/Trainees: trainer/owner sets mentor + training duration per trainee via an edit dialog.

═══════════════════════════════════════════════════════════════════
## CONTRACT FOR GRADING + SCHOOL-PORTAL VIEWS
═══════════════════════════════════════════════════════════════════

### Premium primitives (use these — see PREMIUM REDESIGN CONTRACT earlier in worklog)
- `PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState, SkeletonCard, SkeletonList, PremiumButton, StatusBadge` from `@/components/atelier/*`
- shadcn: Dialog, Input, Label, Textarea, Select(+parts), Tabs(+parts), Separator, Progress
- `toast` from sonner, `apiGet, apiPost, apiPatch, apiDelete` from `@/lib/api`
- `useQuery`/`useMutation` from `@tanstack/react-query`, `useNav` from `@/stores/nav`, `useAuth` from `@/stores/auth`, `useRole` from `@/stores/role`
- icons from lucide-react

### Role helpers (from @/stores/role)
- `isOwner()` madam; `isTrainer()` trainer; `isTrainee()` trainee; `isStaff()` staff+trainee.
- `canSeeBusiness()` madam+trainer; `canCreateOrders()` madam only.

### Auth context
- `const { user } = useAuth()` — { id, email, fullName, role, gender, mentorId, trainingDurationWeeks, trainingStartedAt }
- Demo logins (password atelier2025): madam@studio.com (owner), trainer@studio.com (trainer), ama@studio.com + kojo@studio.com (trainees).

### New data shapes
- User now includes: mentorId, mentor { id, fullName }, trainingDurationWeeks, trainingStartedAt.
- Task now includes: maxScore, score, gradedById, gradedBy { id, fullName }, gradedAt, feedback.
- GET /api/tasks → Task[] (with gradedBy). Filter client-side by staffId for scoping.
- PATCH /api/tasks/[id] accepts { maxScore, score, feedback, gradedById } (gradedAt auto-set).
- PATCH /api/users/[id] accepts { mentorId, trainingDurationWeeks, trainingStartedAt }.

### TASKS VIEW (edit src/views/Tasks.tsx)
Scope + grading:
- **Trainee** (isTrainee()): show ONLY tasks where staffId === user.id. These are their assignments. Show score/maxScore + feedback on graded tasks. NO "New Task" button (trainees can't assign tasks). Each task card shows: title, dueDate, status; if graded: a score badge (e.g. "18/20" emerald if >=80%, amber if 60-79%, orange if <60%) + feedback in a tinted box + gradedBy + gradedAt. If not graded: "Awaiting grade" muted.
- **Staff** (isStaff() && !isTrainee()): keep existing — their tasks, can change status.
- **Trainer**: show ALL trainee tasks (filter staffId in users with role trainee, OR just show all tasks where staff is a trainee). Trainer can GRADE any Done task: a "Grade" button on each Done task → Dialog (maxScore number default 20, score number, feedback textarea) → PATCH /api/tasks/[id] { maxScore, score, feedback, gradedById: user.id } → invalidate + toast. Show grades on graded tasks.
- **Owner**: same as trainer — can grade any trainee's tasks.
- Keep the 3-column kanban (To Do / In Progress / Done). For trainees, the "Done" column shows graded tasks with scores.
- Add a small grade summary for trainees at top: "Average: X%" (mean of score/maxScore over graded tasks).

### PROGRESS VIEW (edit src/views/Progress.tsx) — school-portal style
Enhance the existing Progress view:
- **Trainee mode** ("My Progress"): add a "My Mentor" card at top — shows mentor.fullName + training duration (trainingDurationWeeks weeks) + a progress bar (weeks elapsed since trainingStartedAt / trainingDurationWeeks). Add an "Assignments & Grades" SectionCard: a table of the trainee's tasks (title, dueDate, status, score/maxScore, grade %, feedback). Show an "Overall average" metric (AnimatedNumber %). Keep the existing training log + skills + tasks + orders sections, but make the assignments/grades table prominent.
- **Owner/Trainer mode** ("Trainee Progress"): for the selected trainee, show the same mentor + duration progress + assignments/grades table. The trainer/owner can GRADE tasks inline from this table (a Grade button per Done-but-ungraded task → Dialog). Show the trainee's overall average prominently.

Grade computation: average = mean over graded tasks of (score / maxScore) * 100. Show as % with a letter grade (A >=90, B >=80, C >=70, D >=60, F <60) in a StatusBadge-like pill.

Training duration progress bar: compute weeksElapsed = floor((Date.now() - trainingStartedAt) / (7*24*60*60*1000)); percent = min(100, weeksElapsed / trainingDurationWeeks * 100). Use shadcn Progress or a custom bar. Show "Week X of Y".

### TEAM/TRAINES VIEW (edit src/views/Team.tsx)
Enhance the Trainees tab:
- Each trainee row now shows: mentor name (from user.mentor / or fetch users + match mentorId), training duration ("12 weeks"), started date, weeks-elapsed progress ("Week 8 of 12").
- Add an "Edit profile" PremiumButton (outline sm) per trainee → opens EditTraineeDialog: Mentor (Select of users with role trainer or madam), Training duration weeks (number), Training started date (date input). PATCH /api/users/[trainee.id] → invalidate ['users'] + toast.
- Keep the existing "View progress" button.

### Quality bar (PREMIUM — match the rest of the app)
- SectionCard everywhere, elevate-sm + lift
- Gradient avatars, tabular-nums on scores/percentages
- PremiumButton for all CTAs with loading states
- `animate-fade-in-up` on PageHeader + staggered
- Toasts for all mutations (graded / updated / profile saved)
- Skeleton loaders, EmptyState for empties
- Responsive
- Burgundy #800020 primary
- The grading should feel like a real school portal — scores, feedback, averages, letter grades, progress bars.

### Worklog
Before starting, read `/home/z/my-project/worklog.md`. After finishing, APPEND a new section starting with `---` with Task ID, agent, task, work log, stage summary.

---
Task ID: 33
Agent: full-stack-developer (tasks grading)
Task: Scope Tasks view to assigned + show grades + trainer grades.

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to PREMIUM REDESIGN CONTRACT (burgundy #800020 / cream #faf8f5, surface-premium + elevate-sm + lift + animate-fade-in-up + tabular-nums) and the CONTRACT FOR GRADING + SCHOOL-PORTAL VIEWS (role helpers isTrainee/isStaff/isTrainer/isOwner, Task now includes maxScore/score/gradedById/gradedBy/gradedAt/feedback, PATCH /api/tasks/[id] accepts grading payload with gradedAt auto-set).
- Inspected existing src/views/Tasks.tsx (single-page 3-column kanban, no role scoping, no grading UI). Inspected role store (isStaff = staff|trainee, isTrainer, isOwner, isTrainee), auth store (user.id + role), types (Task with grading fields), api helpers (apiGet/apiPatch/apiPost), and the PATCH /api/tasks/[id] route — confirmed grading payload handler.
- Rewrote src/views/Tasks.tsx with role-based scoping + grading:
  - Role detection: `traineeMode = isTrainee()`, `graderMode = isTrainer() || isOwner()`, `staffMode = isStaff() && !traineeMode`. `canCreate = !traineeMode` (trainees can't assign tasks), `canChangeStatus = !traineeMode` (trainees read-only status per Task 31 contract).
  - Scope filter: trainees see only tasks where staffId === user.id; trainer/owner sees all tasks where task.staff?.role === 'trainee'; staff (non-trainee) keeps existing — their own tasks.
  - PageHeader: eyebrow + icon switch by role (trainee/grader → "My assignments"/"Trainee assignments" with GraduationCap icon; staff → "Studio workflow" with KanbanSquare). New Task button only shown when canCreate. Subtitle reflects the role context.
  - Kept the 3-up PremiumMetric stat strip (To Do / In Progress / Done) with AnimatedNumber + accent on first.
  - NEW grade summary SectionCard (visible in trainee + grader modes): shows {trainee ? "Your average" : "Studio average"} as a big AnimatedNumber % colored by percentage tone (emerald/amber/orange), plus (grader mode only) "Graded: X / Y tasks" counter, plus a right-aligned "Graded assignments: X of N" metric. Header action is a LetterGradeBadge (A/B/C/D/F) computed from the avgPct, or "No grades yet" muted pill.
  - Filter bar: hidden for trainees (they only see their own — no staff filter needed). For staff/grader, kept the staff + priority Selects with label "Trainee" for grader mode.
  - Empty state for the whole board: SectionCard + EmptyState with role-specific copy + (when canCreate) "New Task" PremiumButton.
  - TaskCard enhanced with grading area:
    - Done + graded → burgundy-tinted box (bg-[#800020]/4 + border-l-2 border-[#800020]/30) showing ScoreBadge + gradedBy.fullName + gradedAt + italic feedback + (grader only) "Re-grade" outline PremiumButton (sm, GraduationCap).
    - Done + not graded → "Awaiting grade" row (Clock icon amber) + (grader only) "Grade" outline PremiumButton (sm, GraduationCap).
    - Trainees see graded work + "Awaiting grade" without any grading buttons.
    - Status row: editable Select for staff/grader; read-only StatusBadge for trainees.
    - Staff row uses new `showStaff` prop — trainees see "Your assignment" pill instead of their own name (avoids redundancy), others see the staff avatar + name.
  - GradeDialog refactored into outer (controls Dialog open state, passes task down) + inner GradeForm (mounted with `key={task.id}` so useState lazy initializers prefilled from task.maxScore/score/feedback — avoids the set-state-in-effect lint rule). Form fields: Max score (number, default 20), Score (number 0–maxScore), Feedback (Textarea). Live preview row showing % + LetterGradeBadge (color-toned). "Save grade" PremiumButton (loading, disabled when invalid — maxScore ≤ 0 or score out of range). On submit → PATCH /api/tasks/[id] { maxScore, score, feedback, gradedById: user.id } → toast "Grade saved" + invalidate ['tasks'] + close. Validation toasts for maxScore ≤ 0 / out-of-range score.
  - Helper functions: scorePercent, letterGrade (A≥90, B≥80, C≥70, D≥60, F<60), pctTone (emerald ≥80, amber 60–79, orange <60), ScoreBadge (small pill "18/20" with Star icon, tabular-nums, tone-colored), LetterGradeBadge (dot + letter, tone-colored).
  - Kept the NewTaskDialog component unchanged (still wired for staff/grader).
  - Quality bar: SectionCard everywhere with elevate-sm + lift; tabular-nums on all scores/percentages/counts; PremiumButton for all CTAs (Grade, Re-grade, New Task, Save grade, Cancel) with loading states; animate-fade-in-up on PageHeader (built-in); SkeletonCard during loading; EmptyState for empties (column-level + whole-board); responsive (grids collapse to 1-col on mobile); burgundy #800020 throughout (icons, tints, badges, buttons); sonner toasts for status change + create + grade mutations.
- Lint: `bun run lint 2>&1 | tail -5` → `$ eslint .` (no errors, no warnings). TypeScript: `bunx tsc --noEmit` shows zero errors in src/views/Tasks.tsx (remaining TS errors are in upload/extracted/base44/* legacy source — not mine).
- Dev log: clean compile in 9.4s, GET /api/tasks 200, no runtime errors.

Stage Summary:
- File edited: src/views/Tasks.tsx (~1140 lines, single self-contained "use client" default export with inline sub-components: Tasks, TaskCard, NewTaskDialog, GradeDialog, GradeForm, plus ScoreBadge/LetterGradeBadge helpers).
- Features delivered:
  - Trainee mode: scoped to own assignments (staffId === user.id), NO New Task button, NO status change (read-only StatusBadge), grade summary "Your average: X%" as AnimatedNumber with letter grade pill, each graded Done task shows ScoreBadge + gradedBy + gradedAt + italic feedback in burgundy-tinted box, ungraded Done tasks show "Awaiting grade".
  - Staff mode (non-trainee): unchanged behavior — own tasks, can change status, no grading UI, no grade summary card.
  - Trainer/Owner mode: sees ALL tasks where staff is a trainee, grade summary showing "Graded: X / Y tasks" + "Studio average: X%" + studio letter grade, can GRADE any Done task via GradeDialog ("Grade" button when ungraded, "Re-grade" when graded), grade mutations trigger PATCH /api/tasks/[id] with gradedById + toast + invalidate.
  - ScoreBadge: small pill "18/20" colored by percentage (emerald ≥80%, amber 60–79%, orange <60%), tabular-nums, Star icon.
  - GradeDialog: maxScore (default 20), score (0–maxScore), feedback Textarea, live % + letter grade preview, prefill from existing grade via key-remount, validation toasts, PremiumButton "Save grade" with loading.
  - Kept 3-column kanban (To Do / In Progress / Done) with SectionCard columns, status-coloured icons, count pills.
- Consumes: @/components/atelier/{PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState+SkeletonCard, PremiumButton, StatusBadge}, @/components/ui/{Dialog+parts, Input, Label, Textarea, Select+parts}, @/lib/api (apiGet, apiPatch, apiPost), @/lib/format (isOverdue, PRIORITY_LEVELS, shortDate, todayISO), @/lib/types (Order, Task, User), @/lib/utils (cn), @/stores/nav (useNav), @/stores/auth (useAuth → user), @/stores/role (useRole → isTrainee/isStaff/isTrainer/isOwner), @tanstack/react-query (useQuery, useMutation, useQueryClient), sonner (toast), lucide-react (Plus, AlertCircle, CalendarDays, Link2, ListTodo, Loader2, CheckCheck, KanbanSquare, GraduationCap, Star, CheckSquare, Clock).
- Lint clean, TypeScript clean for this file.

---
Task ID: 35
Agent: full-stack-developer (team trainee profiles)
Task: Enhance Team Trainees tab with mentor + training duration editing.

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to PREMIUM REDESIGN CONTRACT (burgundy #800020 / cream #faf8f5, surface-premium + elevate-sm + lift + animate-fade-in-up + tabular-nums) and the CONTRACT FOR GRADING + SCHOOL-PORTAL VIEWS at the bottom (exact User data shape with mentorId/mentor/trainingDurationWeeks/trainingStartedAt, role helpers isOwner/isTrainer, premium primitives list, PATCH /api/users/[id] contract, quality bar).
- Inspected existing src/views/Team.tsx (1405 lines, 3 tabs) and confirmed the Trainees card already uses SectionCard + SkeletonList + EmptyState + PremiumButton + StatusBadge + gradient avatars. Verified GET /api/users returns a flat User[] (no mentor include) and PATCH /api/users/[id] already accepts { mentorId, trainingDurationWeeks, trainingStartedAt }.
- Added imports: useEffect was unnecessary (used a key-remount pattern instead); added Pencil, CalendarDays, Clock to lucide-react; added formatDate to @/lib/format; added useRole to @/stores/role.
- Added module-level helpers next to initialOf: weeksElapsedFromStart(startedAt) = floor((now - startedAt)/7d) (0 if missing/invalid/future); toDateInput(iso) = YYYY-MM-DD for <input type="date"> using local date components to avoid TZ drift; UNASSIGNED_MENTOR = "__none" sentinel for the mentor Select.
- Updated parent Team() to pull useRole() and compute canEditTrainees = isOwner() || isTrainer(); passed mentors + canEdit to TraineesCard.
- Rewrote TraineesCard:
  - New props: mentors: User[], canEdit: boolean; new state editTrainee: User | null.
  - Built userById map to match trainee.mentorId → mentor user client-side (GET /api/users doesn't include the mentor relation); falls back to t.mentor?.fullName or log.mentor.
  - Each trainee row now shows a school-portal info row (between contact line and existing training-log stats): Mentor (UsersRound icon + micro-label, fullName or amber italic "Unassigned"), Duration (Clock icon, "{n} weeks" or amber "Not set"), Started (CalendarDays icon, formatDate + "· Week {X} of {Y}" in burgundy where X = weeksElapsedFromStart, Y = trainingDurationWeeks; or amber "Not started").
  - Added a burgundy gradient progress bar (h-1.5 rounded-full, bg-gradient-to-r from-[#800020] to-[#a83349], role="progressbar" + aria-valuenow/min/max) showing weeksElapsed / trainingDurationWeeks * 100% (clamped 0-100, min 1% so a just-started trainee has a visible sliver) + "{pct}% complete" tabular-nums caption. Only shown when both trainingStartedAt and trainingDurationWeeks are set.
  - Kept existing per-trainee training-log stats (total logs, proficient/practicing/learning) intact below the new info.
  - Added an "Edit profile" PremiumButton (variant="outline" size="sm", Pencil icon, aria-label) next to the existing "View progress" button — only rendered when canEdit is true (the trainer/owner guard). Both buttons collapse to icon-only on mobile (labels hidden sm:inline).
  - Removed the now-redundant "Mentor · {name}" hidden-md label.
- Added new EditTraineeDialog component (placed above the existing Field helper):
  - Props: open, onOpenChange, trainee: User | null, mentors: User[].
  - Parent passes key={editTrainee?.id ?? "closed"} so the dialog remounts per trainee — avoids setState-in-useEffect lint error.
  - Lazy useState initializer seeds form from the trainee on mount: mentorId (or sentinel), trainingDurationWeeks (default "12" if unset), trainingStartedAt (via toDateInput).
  - Fields: Mentor Select (trainers + madam, explicit "Unassigned" SelectItem with sentinel value, disabled "No trainers or madam available" placeholder when list empty, helper text "Mentors must be a trainer or the Madam."); Training duration (weeks) numeric Input (min=1 step=1 tabular-nums placeholder="12"); Training started date <Input type="date"> (tabular-nums). Information callout (CalendarDays icon, tinted bg-[#FBF9F7]) explains duration + start date drive the progress bar + Week-X-of-Y schedule.
  - Save profile PremiumButton (primary, Pencil, loading) → apiPatch<User>(`/api/users/${trainee.id}`, { mentorId, trainingDurationWeeks, trainingStartedAt }) → invalidate ['users'] + sonner toast "{name}'s profile updated." + auto-close. Cancel outline button + error toast on failure.
  - Submit coerces: mentorId "__none" → null, duration NaN/≤0 → null, empty date → null (matches PATCH route's null-handling).
- Verification: `bunx eslint src/views/Team.tsx` → clean (zero errors/warnings). `bunx tsc --noEmit --skipLibCheck | grep Team.tsx` → no Team.tsx-specific TypeScript errors. dev.log shows clean recompiles after edits. The 3 lint errors visible in `bun run lint` are in src/views/Progress.tsx (MentorTrainingCard/OverallAverageCard/AssignmentsGradesCard not defined) — Task 32's Progress view scope, not this task.

Stage Summary:
- File edited: src/views/Team.tsx (~1745 lines, single default export `Team`, "use client").
- Features delivered: each trainee row now shows school-portal info (mentor, duration, started date, Week X of Y) + a burgundy progress bar; an "Edit profile" PremiumButton (guarded by isTrainer() || isOwner()) opens EditTraineeDialog with Mentor Select (trainers + madam + Unassigned), Training duration number input (default 12), Training started date input → PATCH /api/users/[id] → invalidate ['users'] + toast + close. Existing "View progress" button and per-trainee training-log stats kept intact. Responsive, premium (SectionCard + elevate-sm + lift, gradient avatars, tabular-nums, PremiumButton loading states, sonner toasts, burgundy #800020 primary).
- Consumes: @/components/atelier/{PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState, SkeletonList, PremiumButton, StatusBadge}, @/components/ui/{Tabs, Dialog, AlertDialog, Input, Label, Textarea, Select}, @/lib/api (apiGet/apiPost/apiPatch/apiDelete), @/lib/format (formatCurrency, formatDate), @/lib/types (User, Freelancer, TrainingLog), @/stores/auth (useAuth), @/stores/nav (useNav), @/stores/role (useRole — isOwner/isTrainer), @tanstack/react-query (useQuery/useMutation/invalidate), sonner (toast), lucide-react.

---
Task ID: 34
Agent: full-stack-developer (progress school-portal)
Task: Enhance Progress view with mentor, training duration, grades table, average.

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to PREMIUM REDESIGN CONTRACT (burgundy #800020 / cream #faf8f5, surface-premium + elevate-sm + lift + animate-fade-in-up + tabular-nums) + CONTRACT FOR GRADING + SCHOOL-PORTAL VIEWS (exact new data shapes, role helpers, premium primitives list, quality bar). Re-read existing src/views/Progress.tsx (~1164 lines, single "use client" default export with inline sub-components) to map exactly where to additively insert the new school-portal sections without removing existing functionality.
- Confirmed API surface: GET /api/tasks (with gradedBy { id, fullName }), GET /api/users (returns raw user rows including mentorId/trainingDurationWeeks/trainingStartedAt but NOT the mentor relation — resolved mentor client-side by matching mentorId → user.fullName), PATCH /api/tasks/[id] accepts { maxScore, score, feedback, gradedById } (sets gradedAt auto). useAuth().user is the limited { id, email, fullName, role, gender, phone } shape — does NOT carry mentor/training fields, so ProgressBody always fetches /api/users and finds the trainee by traineeId to read the school-portal profile.
- Inspected premium primitives (PageHeader, SectionCard with accent + bodyClassName, PremiumMetric, AnimatedNumber, EmptyState + SkeletonList, PremiumButton, StatusBadge) + shadcn Progress component (radix ProgressPrimitive with data-slot=progress-indicator — applied a [&>[data-slot=progress-indicator]]:bg-gradient-to-r override to colour the bar burgundy) + lib/format (formatDate, shortDate) + lib/types (User with mentor/trainingDurationWeeks/trainingStartedAt + mentor?; Task with maxScore/score/gradedBy/gradedAt/feedback).
- Additively extended src/views/Progress.tsx (NOT a rewrite — kept all existing sections: stat strip, skill mastery, training log timeline, my tasks, orders contributed + LogDialog/LogForm):
  1. Imports: added Star, Award, Clock, User (aliased as UserIcon to avoid clashing with the User type from @/lib/types), TrendingUp from lucide-react; added `import { Progress as ProgressBar } from "@/components/ui/progress"` (aliased to ProgressBar because the file already exports a default `Progress` function — the un-aliased import would have been shadowed and produced TS2440).
  2. Helper functions (before `export default function Progress`):
     - `letterGrade(pct)` → A (>=90) / B (>=80) / C (>=70) / D (>=60) / F (<60).
     - `gradeColor(pct)` → emerald (>=80) / amber (60-79) / orange (<60) for score badges.
     - `GRADE_TONES`, `LETTER_TONES`, `LETTER_HINT` records for tinted pill styling + hint copy.
     - `avgPct(tasks)` → mean of (score/maxScore*100) over graded tasks, null if none.
     - `weeksElapsedOf(startedAt)` → floor((Date.now() - startedAt) / 7d ms), clamped to >=0.
  3. ProgressBody (shared by both trainee + owner/trainer modes):
     - Added usersQ (GET /api/users, queryKey ["users"]) to fetch the trainee profile + mentor lookup.
     - Derived `traineeUser` (find by traineeId), `mentorName` (prefers traineeUser.mentor?.fullName, falls back to looking up the user with id === mentorId in the users list, null if neither), `durationWeeks`, `startedAt`, `weeksElapsed`, `trainingPercent` (min(100, weeks/duration*100)).
     - Derived `avgPctValue` (avgPct of myTasks) + `gradedCount` (count of tasks with score+maxScore).
     - Extended `invalidateAll` to also invalidate ["tasks"] (so grades refresh immediately).
     - Inserted two new sections at the top of the JSX return (before the existing stat strip):
       (a) `grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-fade-in-up` wrapping MentorTrainingCard (left) + OverallAverageCard (right).
       (b) AssignmentsGradesCard (full-width SectionCard, prominent).
  4. New sub-components (appended at the end of the file, after LogForm):
     - **MentorTrainingCard**: SectionCard titled "My apprenticeship" (trainee mode) / "{traineeName}'s apprenticeship" (owner/trainer mode). 2-col grid (sm:grid-cols-2): Mentor (UserIcon in burgundy-tinted circle + "Mentor" micro-label + name or "Not assigned") + Programme length (Clock icon + "{durationWeeks} weeks" or "—"). When durationWeeks is set: a burgundy-tinted Progress bar (h-2, gradient from-[#800020] to-[#6b0018] via [&>[data-slot=progress-indicator]] override) with "Week {weeksElapsed} of {durationWeeks}" label + "Started {formatDate(startedAt)}" + "{trainingPercent}%" footer. When not set: a muted stone-tinted box with italic "Training duration not set — ask your mentor to configure it." (trainee mode) / "configure it from the Team view." (owner mode).
     - **OverallAverageCard**: SectionCard with `accent` (burgundy left border). When avgPctValue is null: large "—" placeholder + "No grades yet" + helper copy. When graded: large burgundy AnimatedNumber (clamp 30-44px font-display) + "%" + LetterPill next to it + "Across {gradedCount} graded assignment(s)" label + "Letter grade {letter} — {hint}." line with TrendingUp icon.
     - **AssignmentsGradesCard**: SectionCard "Assignments & grades" (bodyClassName p-0). Loading → SkeletonList 4 rows. Empty → EmptyState with Star icon. Otherwise sorts tasks (graded first by gradedAt desc, then ungraded Done, then To Do/In Progress by dueDate asc) and renders an AssignmentRow per task. Manages a `gradeTask` state for the GradeDialog.
     - **AssignmentRow**: list row with staggered animate-fade-in-up (50ms * min(idx, 8)). Header row (flex-wrap, justify-between): left = title + priority StatusBadge + customer/garment subtext; right = due date (CalendarDays + shortDate, red+bold if overdue & not Done) + StatusBadge + (graded: ScoreBadge + "{pct}%" + LetterPill / awaiting-grade: italic "Awaiting grade" / null). Below: if graded + feedback → tinted box (bg-[#800020]/[0.04] border-l-2 border-[#800020]/30) with "Mentor feedback" label (Sparkles icon) + feedback text + grader byline (— {gradedBy.fullName} · {gradedAt}). If canGrade + awaiting → "Grade" outline PremiumButton (sm, Star icon) opens the GradeDialog.
     - **GradeDialog**: Dialog wrapper (sm:max-w-lg) that mounts GradeForm (keyed by task id) only when open && task.
     - **GradeForm**: Patch-based grade form. Fields: task summary card (title + customer/garment) + 2-col grid (Max score number Input default "20" + Score number Input required) + live preview row when valid (TrendingUp icon + "{livePct}%" + LetterPill + hint) + Feedback Textarea. PremiumButton "Cancel" (outline) + "Submit grade" (primary, Star icon, loading state). useMutation PATCH /api/tasks/[id] { maxScore, score, feedback: trim||null, gradedById: graderId } → toast.success "Grade submitted." + invalidate ["tasks"] + close. Validation: max > 0, score numeric in [0, max].
     - **ScoreBadge**: small pill "{score}/{maxScore}" tabular-nums, colour by GRADE_TONES[gradeColor(pct)] (emerald/amber/orange).
     - **LetterPill**: small pill "{letter}" with Award icon, colour by LETTER_TONES[letter] (A=emerald, B=emerald-100, C=amber, D=orange, F=burgundy-red).
- Resolved naming conflicts: aliased lucide-react `User` → `UserIcon` (clashed with the User type from @/lib/types used throughout) and shadcn `Progress` → `ProgressBar` (clashed with the file's own default-exported `Progress` function — without the alias, TS2440 fired and `<ProgressBar>` inside MentorTrainingCard was being resolved to the local function with no props).
- Verified: `bun run lint` → 0 errors, 0 warnings. `bunx tsc --noEmit --skipLibCheck` → 0 errors against src/views/Progress.tsx (remaining TS errors are all in upload/extracted/* legacy source). Dev log: `✓ Compiled in 8.4s` after the final save — no runtime/compile errors.

Stage Summary:
- File edited: src/views/Progress.tsx (~1824 lines, single self-contained "use client" default export `Progress` with inline sub-components). Additive extension only — all pre-existing sections (stat strip with 4 PremiumMetrics, SkillMasteryCard, Training log timeline with inline status PATCH + AlertDialog delete, MyTasksCard, OrdersContributedCard, LogDialog + LogForm) preserved untouched.
- Features delivered (school-portal style, layered on top of the existing apprenticeship journey):
  - **Mentor + Training card** at the top: mentor name (UserIcon) + programme length (Clock icon) + burgundy-tinted Progress bar showing "Week {elapsed} of {duration}" + "{percent}%" + "Started {date}". Muted fallback note when trainingDurationWeeks is unset. Title adapts: "My apprenticeship" (trainee) / "{Name}'s apprenticeship" (owner/trainer).
  - **Overall average hero metric**: large burgundy AnimatedNumber "%" + LetterPill + "Across {n} graded assignment(s)" + TrendingUp hint line. Burgundy `accent` border-l on the SectionCard. Graceful empty state ("—") when no grades yet.
  - **Assignments & Grades table** (prominent SectionCard "Assignments & grades", full-width below the hero row): per-task row with title + priority + customer/garment + due date (overdue-aware) + StatusBadge + ScoreBadge ("18/20" emerald/amber/orange by %) + "{pct}%" + LetterPill (A/B/C/D/F) + tinted mentor-feedback box (with grader byline + graded date). Ungraded Done tasks show "Awaiting grade" italic. In owner/trainer mode (canGrade), Done-but-ungraded rows get a "Grade" outline PremiumButton → GradeDialog (Max score default 20, Score required, live % preview, Feedback Textarea) → PATCH /api/tasks/[id] { maxScore, score, feedback, gradedById: user.id } → invalidate ["tasks"] + toast "Grade submitted."
  - Layout order (preserved existing): PageHeader → (owner mode) SelectedTraineeHeader → NEW Apprenticeship card + Overall Average (2-col grid) → NEW Assignments & Grades table → existing 4-up stat strip (Total Logs/Proficient/Practicing/Learning) → Skill mastery → Training log timeline → My tasks → Orders contributed → Log dialog.
  - Grade computation: avgPct = round(mean of (score/maxScore*100) over graded tasks). Letter thresholds: A>=90, B>=80, C>=70, D>=60, F<60. Colour thresholds for ScoreBadge: emerald>=80, amber 60-79, orange<60.
  - Mentor resolution: traineeUser.mentor?.fullName preferred (in case the API starts returning the relation); falls back to looking up the user with id === traineeUser.mentorId in the /api/users array (current backend doesn't include the mentor relation in the response).
- Quality bar (PREMIUM): SectionCard everywhere with elevate-sm + lift; burgundy `accent` border-l on Overall Average + Apprenticeship; tabular-nums on all scores/percentages/dates; burgundy gradient Progress bar via [&>[data-slot=progress-indicator]] override; PremiumButton for all CTAs (Grade + Submit grade + Cancel) with loading states; animate-fade-in-up on the hero grid + staggered 50ms on each assignment row; sonner toasts on grade submit (success + error); SkeletonList loaders for the assignments table; EmptyState with Star icon when no assignments; fully responsive (2-col → 1-col on mobile, assignment rows flex-wrap, dialog max-w-lg); burgundy #800020 primary throughout, no blue/indigo as primary.
- Consumes: @/components/atelier/{PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState + SkeletonList, PremiumButton, StatusBadge}, @/components/ui/{Dialog + parts, AlertDialog + parts, Input, Label, Textarea, Separator, Progress (aliased ProgressBar), Select + parts}, @/lib/api (apiGet/apiPost/apiPatch/apiDelete), @/lib/format (formatCurrency, formatDate, shortDate, todayISO, isOverdue), @/lib/types (Order, Task, TrainingLog, TrainingStatus, User), @/lib/utils (cn), @/stores/{auth, nav, role}, @tanstack/react-query (useQuery/useMutation/invalidate), sonner (toast), lucide-react (GraduationCap, Plus, Mail, Phone, Trash2, CheckSquare, ShoppingBag, ArrowRight, Sparkles, Scissors, CalendarDays, Star, Award, Clock, User as UserIcon, TrendingUp).
- Lint clean. TypeScript clean for src/views/Progress.tsx.

Deliverable:
- src/views/Progress.tsx — edited. Default export `Progress`. "use client". Lint clean. TypeScript clean.
- Log in as a trainee (ama@studio.com / kojo@studio.com, password atelier2025) to see "My apprenticeship" card + Overall Average hero + Assignments & Grades table with your scores/letter pills/feedback. Log in as Madam (madam@studio.com) or Trainer (trainer@studio.com) → pick a trainee → see the same view + a "Grade" button on each Done-but-ungraded assignment → GradeDialog → PATCH → toast + refresh.

---
Task ID: 36 (grading + school-portal verification)
Agent: main
Task: Verify task scoring/grading, trainer-set training duration, mentor assignment, school-portal relationship — end-to-end.

Work Log:
- Lint: `bun run lint` → 0 errors, 0 warnings.
- Browser verification:
  1. Trainee (Ama) Tasks: scoped to her 4 assignments only. "YOUR AVERAGE 83%" + "GRADED ASSIGNMENTS 2 of 4". Done column shows graded tasks with score badges + mentor feedback ("Clean finish. Keep the seam allowance even.", "Good grasp. Two darts slightly off-centre."). Ungraded Done tasks show "Awaiting grade". NO "New Task" button. ✅
  2. Trainee Progress: school-portal layout — "MY APPRENTICESHIP" card with Mentor (Coach Afia), 12 weeks, training progress bar "Week 8 of 12" (67%). "OVERALL AVERAGE" metric. "ASSIGNMENTS & GRADES" table with graded assignments + mentor feedback. ✅
  3. Trainer (Coach Afia) Tasks: "TRAINEE GRADING" header + staff filter (All Trainees). All trainee tasks visible. Done tasks have "Re-grade" buttons. Opened grade dialog (prefilled max 20, score 19, feedback) → changed score to 20 → saved → toast "Grade saved. Practice: kente pattern matching — 20/20". Verified persisted to DB (20/20, gradedBy Coach Afia). ✅
  4. Owner (Madam) Team → Trainees tab: each trainee shows Mentor (Coach Afia), Duration (12 weeks), training progress bar (67% for Ama), "Edit profile" + "View progress" buttons. Opened Edit Trainee Profile dialog (Mentor select, duration input, started date) → changed duration to 16 weeks → saved → toast "Ama Trainee's profile updated. Mentor + training schedule saved." Verified persisted to DB (16 weeks). ✅
- Console errors: none. Re-seeded clean demo data.

Stage Summary:
- ALL TASKS ASSIGNED TO TRAINEES ARE SCORED AND GRADED:
  - Tasks have maxScore, score, gradedBy, gradedAt, feedback.
  - Trainer/owner grades Done tasks via a Grade dialog (max score, score, feedback).
  - Trainees see their scores + letter grades + mentor feedback on their assignments.
  - Overall average % computed + displayed (with letter grade A/B/C/D/F).
- TRAINEES ONLY SEE WHAT WAS ASSIGNED TO THEM: Tasks view scoped to staffId === user.id (no New Task button, no other trainees' tasks). Already-scoped: Orders, Customers, Dashboard.
- TRAINING DURATION SET BY TRAINER/OWNER: User.trainingDurationWeeks + trainingStartedAt, editable via Team → Trainees → Edit profile. Drives a "Week X of Y" progress bar.
- SCHOOL-PORTAL RELATION: Mentor assigned per trainee (User.mentorId). Trainee sees their mentor + duration + progress. Trainer sees all their trainees' tasks + grades. Owner manages mentor + duration assignments.
- New schema: User.mentorId/trainingDurationWeeks/trainingStartedAt; Task.maxScore/score/gradedById/gradedAt/feedback. New API: PATCH /api/users/[id], extended PATCH /api/tasks/[id] (grading). Updated views: Tasks (scoped + grades), Progress (school-portal), Team/Trainees (mentor + duration editing).
- Lint clean, no runtime errors.

---
Task ID: 37 (multi-tenant foundation)
Agent: main
Task: Multi-tenant architecture — Shop model, shopId on all data, tenant-scoped auth, registration, Vercel+Supabase packaging.

Work Log:
- Prisma schema rewritten: added Shop model (id, name, slug, plan, currency). Added shopId (required, FK→Shop, onDelete Cascade) to: User, Customer, Order, Task, MeasurementSet, StyleConcept, CustomerFeedback, Settings, Freelancer, CommunityPost, TrainingLog, Certificate. Payment/Fitting/CommunityComment/CommunityLike scoped via parent. Settings.shopId @@unique. Provider kept sqlite for local dev (documented postgres swap for Supabase).
- db:push --force-reset + re-seeded: created Shop "Madam Studio" (slug madam-studio). All records carry shopId. Verified isolation.
- Tenant helper: src/lib/tenant.ts — getTenant(req) reads ms_session cookie (base64 userId:shopId), verifies user belongs to shop, returns {userId, shopId}. tenantWhere() helper.
- Auth: login now encodes userId:shopId in cookie + returns shopId + shop {id,name,slug,currency}. /me returns shop info. New POST /api/auth/register — creates a Shop + owner User (madam) + default Settings in one transaction, generates unique slug, sets session cookie. Auth store updated with register() + AuthShop type + syncs studioName from shop.
- Verified: login returns shopId+shop; register created "Esi Atelier" shop with owner; isolation confirmed (Madam Studio: 7 users/8 customers/28 orders; Esi Atelier: 1 user/0 customers/0 orders).

Stage Summary — FOUNDATION READY. Three parallel tasks now dispatched:
- SCOPE all API routes by shopId via getTenant(req).
- BUILD registration UI (new shop signup page) + show shop name in AppShell.
- DEPLOYMENT package (vercel.json, .env.example, DEPLOYMENT.md, supabase notes).

═══════════════════════════════════════════════════════════════════
## CONTRACT FOR TENANT SCOPING + REGISTRATION UI + DEPLOYMENT
═══════════════════════════════════════════════════════════════════

### Tenant helper (use in EVERY API route)
`import { getTenant, tenantWhere } from "@/lib/tenant"`
- `const ctx = await getTenant(req)` → { userId, shopId } | null. If null → return 401.
- All list queries: `db.X.findMany({ where: tenantWhere(shopId, { ...extra }) })`
- All single-fetch: fetch by id AND shopId (verify ownership).
- All creates: include `shopId: ctx.shopId` in data.
- Child resources (Payment, Fitting via order; CommunityComment/Like via post): verify the parent (order/post) belongs to the tenant before operating.

### API routes to scope (ALL of them)
- /api/dashboard — fetch all data filtered by shopId.
- /api/customers (GET list, POST) + [id] (GET, PATCH) — shopId scope.
- /api/orders (GET, POST) + [id] (GET, PATCH, DELETE) — shopId scope.
- /api/orders/[id]/payments (POST) — verify order.shopId === ctx.shopId.
- /api/orders/[id]/fittings (POST) — verify order.shopId.
- /api/fittings/[id] (PATCH) — verify via order.shopId.
- /api/tasks (GET, POST) + [id] (PATCH) — shopId scope.
- /api/users (GET, POST) — shopId scope (only list/create users in THIS shop). POST should set shopId: ctx.shopId.
- /api/users/[id] (PATCH) — verify user.shopId === ctx.shopId.
- /api/settings (GET, PATCH) — filter by shopId (singleton per shop).
- /api/customers/[id]/measurements (GET) — verify customer.shopId.
- /api/measurements (POST) — verify customer.shopId, set shopId.
- /api/style-concepts (GET, POST) + [id] (PATCH) — shopId scope.
- /api/freelancers (GET, POST) + [id] (PATCH, DELETE) — shopId scope.
- /api/community (GET, POST) + [id]/like + [id]/comments — shopId scope.
- /api/training-logs (GET, POST) + [id] (PATCH, DELETE) — shopId scope.
- /api/certificates (GET, POST) + [id] (DELETE) — shopId scope.
- /api/portfolio (GET) — shopId scope (filter orders by shopId).
- AI routes /api/style-assist/generate + /visualize + /api/insights/trends — verify customer/order ownership before generating; no shopId on the AI call itself but verify the customerId belongs to the tenant.

### Registration UI
- Update src/components/atelier/LoginPage.tsx: add a "Create a new shop" link/toggle that switches to a register form (shop name, your name, email, password, gender). On submit → useAuth().register() → toast + lands on dashboard. Keep the login form as default.
- Show the current shop name in the AppShell (use useAuth().user.shop.name) — replace the hardcoded studioName in the mobile header + maybe add a small shop chip near the avatar.

### Deployment package
- vercel.json: Next.js build settings, no special config needed (Next.js auto-detects). Optionally set build command.
- .env.example: DATABASE_URL, plus notes on Supabase connection string format.
- DEPLOYMENT.md: step-by-step guide — (1) Create Supabase project, (2) change prisma provider to postgresql, (3) set DATABASE_URL to Supabase pooler, (4) run prisma db push, (5) push to GitHub, (6) import to Vercel, (7) set env vars in Vercel, (8) deploy. Include the AI SDK env note (z-ai-web-dev-sdk needs its key on the server — document ZAI_API_KEY or whatever it uses).
- supabase/README.md or notes in DEPLOYMENT.md.
- Ensure .gitignore excludes .env, dev.log, node_modules, .next, db/*.db.

### Worklog
Before starting, read `/home/z/my-project/worklog.md`. After finishing, APPEND a new section starting with `---` with Task ID, agent, task, work log, stage summary.

---
Task ID: 39
Agent: full-stack-developer (registration UI + shop in shell)
Task: Build registration UI + show shop name in AppShell.

Work Log:
- Read /home/z/my-project/worklog.md completely — bound to PREMIUM REDESIGN CONTRACT (burgundy #800020 / cream #faf8f5, surface-premium + elevate-* + lift + animate-fade-in-up) + CONTRACT FOR TENANT SCOPING + REGISTRATION UI + DEPLOYMENT (useAuth().register({ shopName, fullName, email, password, gender? }) → creates Shop + owner User, sets session; user.shop = { id, name, slug, currency }; POST /api/auth/register already built and returns 409 on duplicate email).
- Re-read existing src/components/atelier/LoginPage.tsx (mobile-first hero band + form section, premium icon-prefixed inputs, show/hide password, custom burgundy submit button), src/components/atelier/AppShell.tsx (desktop rail + mobile header with studioName.split(" ")[0]), src/stores/auth.ts (register method already added with syncRoleStore that calls roleStore.setStudioName(user.shop.name)), src/stores/role.ts (studioName state), src/components/atelier/PremiumButton.tsx (variant/size system, auto Loader2 when loading), src/components/ui/select.tsx (shadcn radix select), src/lib/api.ts (apiPost throws `${status} ${statusText} — ${text}` on non-OK), src/app/api/auth/register/route.ts (confirms 409 + error JSON shape).
- Rewrote src/components/atelier/LoginPage.tsx — kept the existing hero band (burgundy gradient + grain + Scissors badge) untouched, added a premium mode toggle at the top of the form section (two-button pill: "Sign in" with Lock icon, "New shop" with Store icon; active state is burgundy elevate-burgundy). Sign-in form remains the DEFAULT view (heading "Welcome back"); register form switches in with `animate-fade-in-up` (key=mode forces remount so animation re-fires) and heading "Create your shop".
- Register form fields (premium icon-prefixed inputs, h-12 rounded-xl border-[#E7E5E4] focus:border-[#800020] focus:ring-4 elevate-sm): Shop name* (Store icon, placeholder "Esi Atelier"), Your name* (User icon, placeholder "Esi Mensah"), Email* (Mail icon), Password* (Lock icon + show/hide Eye/EyeOff, minLength=6, autoComplete="new-password", label includes "· min 6 chars" hint), Gender (shadcn Select: Female/Male/Other, trigger styled to match h-12 rounded-xl elevate-sm, with helper caption "Used to address you as Madam / Master throughout the studio.").
- Submit handlers: submitLogin calls useAuth().login() → toast.success(`Welcome back, ${first name}.`); submitRegister validates password.length >= 6 + required fields inline (toast + inline error), then calls useAuth().register({ shopName, fullName, email, password, gender }) → on success toast.success(`Welcome to ${user.shop.name || shopName}!`) and status flips to "authenticated" so the app gate routes to the dashboard. Errors are extracted via a new extractApiError() helper that parses the JSON `{error:"…"}` payload out of api.ts's `"409 Conflict — {…}"` message — so a duplicate-email 409 surfaces the clean "An account with that email already exists." text both inline and as a toast.
- PremiumButton (size="lg", loading={submitting}, className="w-full mt-1 group") used for both submits — PremiumButton renders its own Loader2 spinner when loading; children switch between "Sign in / ArrowRight" → "Signing in…" and "Create shop / ArrowRight" → "Creating your shop…". ArrowRight uses group-hover:translate-x-0.5 for the signature micro-animation. Below each form, a tertiary text link switches modes: sign-in form shows "Opening a new atelier? Create a shop →" (Store + ArrowRight), register form shows "← Already have a studio? Back to sign in" (ArrowLeft). Subtle footer line "Madam Studio — where every stitch tells a story." retained.
- Updated src/components/atelier/AppShell.tsx — added `const shopDisplayName = user?.shop?.name || studioName;` (real multi-tenant shop name with role-store fallback during hydration). Mobile header replaced `studioName.split(" ")[0]` with the full `shopDisplayName` in a `truncate max-w-[180px]` span (with `title` attribute for hover tooltip + `min-w-0`/`shrink-0` on the button so truncate actually works in flex). Desktop rail logo section restructured: the `h-20` button became a `flex flex-col` wrapper holding the Scissors logo button + a tiny `text-[8.5px] uppercase tracking-[0.14em] text-stone-400 font-semibold truncate max-w-[72px]` label showing `shopDisplayName.split(" ")[0]` (first word, since the rail is only 80px wide) with a `title` attribute carrying the full shop name.
- Verification: `bun run lint` clean (no errors). `npx tsc --noEmit` shows no errors for LoginPage.tsx or AppShell.tsx (only pre-existing errors in examples/websocket + prisma/seed.ts which are out of scope). Dev log shows successful recompilation.

Stage Summary:
- Files edited: src/components/atelier/LoginPage.tsx (rewritten ~430 lines, single "use client" export with login + register modes), src/components/atelier/AppShell.tsx (added shopDisplayName, replaced mobile header studioName.split, restructured desktop rail logo column to include tiny shop name label).
- Registration flow delivered: mode toggle pill (Sign in / New shop) at top of form card, default = sign-in; register form with Shop name + Your name + Email + Password (min 6) + Gender (shadcn Select Female/Male/Other); PremiumButton submit with loading state; toast + inline error on 409 duplicate email (via extractApiError helper that parses the JSON `{error}` payload); "Back to sign in" / "Create a shop" tertiary switch links; animate-fade-in-up on form switch; burgundy #800020 primary throughout.
- AppShell shop name: mobile header now shows the real `user.shop.name` (e.g. "Esi Atelier") instead of the hardcoded "Madam" first-word; desktop rail shows the first word of the shop name as a tiny uppercase label under the Scissors logo; both have `title` hover tooltips with the full name; falls back to role-store studioName while hydrating. The auth store already syncs studioName from the shop on login, so both code paths agree post-hydration.
- Consumes: useAuth (login, register, hydrate, status, user) from @/stores/auth; toast from sonner; cn from @/lib/utils; PremiumButton from @/components/atelier/PremiumButton; Select + SelectTrigger + SelectContent + SelectItem + SelectValue from @/components/ui/select; lucide-react icons (Scissors, Mail, Lock, ArrowRight, Eye, EyeOff, Store, User as UserIcon, ArrowLeft). AppShell unchanged in its icon imports.

---
Task ID: 38
Agent: full-stack-developer (tenant scoping)
Task: Scope all API routes by shopId.

Work Log:
- Read worklog.md "CONTRACT FOR TENANT SCOPING + REGISTRATION UI + DEPLOYMENT" section + `src/lib/tenant.ts` + Prisma schema (verified shopId on User/Customer/Order/Task/MeasurementSet/StyleConcept/CustomerFeedback/Settings/Freelancer/CommunityPost/TrainingLog/Certificate; Payment/Fitting/CommunityComment/CommunityLike scoped via parent Order/CommunityPost).
- Read every API route file under `src/app/api/` to understand the existing response shapes (kept them intact — only added tenant filters).
- Added `const ctx = await getTenant(req); if (!ctx) return 401;` to the top of every handler in every non-auth route.
- GET list routes: `db.X.findMany({ where: tenantWhere(ctx.shopId, {...existingFilters}) })`.
- GET single by id: `findFirst({ where: { id, shopId: ctx.shopId } })` → 404 if not found (covers both "doesn't exist" and "exists but in another tenant").
- POST create: included `shopId: ctx.shopId` in `data`. For child resources (payment/fitting on order, comment/like on post, measurement/styleConcept on customer, trainingLog on trainee, certificate on trainee+issuer, task on order), FIRST verified the parent belongs to the tenant before allowing the create.
- PATCH/DELETE: fetched existing with `findFirst({ where: { id, shopId: ctx.shopId } })` (or nested relation filter, e.g. `fitting: { order: { shopId } }`) → 404 if not owned.
- For routes that reassign a relation (e.g. PATCH order reassigns customer/staff; PATCH user sets mentor; PATCH task sets orderId/staffId/gradedById; PATCH training-log sets mentorId; POST certificate sets issuedById), the new related record is verified to belong to the same tenant before applying.
- Dashboard: 7 collections all filtered by shopId. Payments/Fittings (no direct shopId) fetched via nested relation filter — `where: { order: { shopId: ctx.shopId } }`. Settings fetched by `findUnique({ where: { shopId } })` with default-create fallback.
- Settings route: singleton per shop — GET uses `findUnique({ where: { shopId } })` with default-create; PATCH does the same then updates by id.
- AI routes: `/api/style-assist/generate` — getTenant guard + customer verified by `findFirst({ where: { id, shopId } })` + all 4 sub-queries (measurements, orders, feedback, styleConcepts) scoped by shopId. `/api/style-assist/visualize` and `/api/insights/trends` — getTenant guard only (data is in the request body but the routes are callable only by authenticated users).
- Ran `bun run lint` → 0 errors, 0 warnings.
- Cleaned up the test shop ("Test Atelier" + owner test-atelier@example.com) from the database after isolation tests passed.

Stage Summary:
- 22 route files edited (every non-auth route under `src/app/api/`):
  - `dashboard/route.ts`
  - `customers/route.ts`, `customers/[id]/route.ts`, `customers/[id]/measurements/route.ts`
  - `orders/route.ts`, `orders/[id]/route.ts`, `orders/[id]/payments/route.ts`, `orders/[id]/fittings/route.ts`
  - `fittings/[id]/route.ts`
  - `tasks/route.ts`, `tasks/[id]/route.ts`
  - `users/route.ts`, `users/[id]/route.ts`
  - `settings/route.ts`
  - `measurements/route.ts`
  - `style-concepts/route.ts`, `style-concepts/[id]/route.ts`
  - `freelancers/route.ts`, `freelancers/[id]/route.ts`
  - `community/route.ts`, `community/[id]/like/route.ts`, `community/[id]/comments/route.ts`
  - `training-logs/route.ts`, `training-logs/[id]/route.ts`
  - `certificates/route.ts`, `certificates/[id]/route.ts`
  - `portfolio/route.ts`
  - `style-assist/generate/route.ts`, `style-assist/visualize/route.ts`, `insights/trends/route.ts`
- Auth routes left untouched (login/logout/me/register already tenant-aware).
- Isolation verified end-to-end:
  - No cookie → **401** on every route (all 11 GET list routes + 2 AI POST routes).
  - Madam Studio cookie → 8 customers / 28 orders / 22 payments / 11 fittings / 22 tasks / 7 users / 2 styleConcepts / settings.studioName="Madam Studio".
  - Newly registered shop cookie → empty customers, empty orders, 0 dashboard counts, settings.studioName="Test Atelier".
  - Cross-tenant single-fetch GET → **404**.
  - Cross-tenant child-resource POST (payment on another shop's order) → **404**; same-tenant → **201**.
  - Settings GET returns the right studioName + shopId per cookie.
  - Users GET returns only the requesting shop's members (7 vs 1).
- Lint clean (0 errors, 0 warnings). No runtime errors in dev.log.

Deliverable:
- All 22 API route files scoped by shopId via `getTenant(req)` + `tenantWhere(ctx.shopId, ...)`. Tenant isolation verified. Auth routes (already tenant-aware) untouched.

---
Task ID: 40 (multi-tenant + deployment verification)
Agent: main
Task: Verify multi-tenant isolation, registration flow, and deployment packaging — end-to-end.

Work Log:
- Lint: `bun run lint` → 0 errors, 0 warnings.
- API isolation verified via curl:
  - Madam Studio login → 8 customers. New shop "Bespoke Accra" registered → 0 customers. Cross-tenant order fetch → 404 (blocked). ✅
- UI registration verified via agent-browser:
  - Login page shows "SIGN IN / NEW SHOP" toggle + "Create a shop" link.
  - Register form: Shop name, Your name, Email, Password (min 6), Gender select, "Create shop" button.
  - Registered "Zaria Atelier" (owner Zaria Owner) → landed on dashboard showing the NEW empty shop: "ZARIA", "0 orders booked", "No active orders right now", "Zaria Owner", "0 active orders". ✅
  - Shop name appears in the AppShell (mobile header full name, desktop rail first-word label). ✅
- Console errors: none.
- Deployment package created:
  - vercel.json (framework: nextjs, buildCommand: prisma generate && next build, installCommand: bun install)
  - .env.example (DATABASE_URL for SQLite + Supabase postgres format, NEXT_PUBLIC_APP_NAME, ZAI_API_KEY note)
  - DEPLOYMENT.md — full step-by-step guide: Supabase project creation, Prisma provider swap (sqlite→postgresql), db push, GitHub push, Vercel import + env vars, verification, multi-tenant isolation explanation, troubleshooting.
  - .gitignore updated to exclude /db/*.db (local SQLite) + .env* + dev.log + node_modules + .next + .vercel.
- Re-seeded clean demo data (removed test shops created during verification).

Stage Summary — MULTI-TENANT + DEPLOYMENT COMPLETE:
- MULTI-TENANT: Shop model + shopId on all 14 data models. getTenant(req) helper enforces isolation on every API route (401 without session, 404 cross-tenant). Verified: 22 API routes scoped, cross-tenant access blocked.
- REGISTRATION: POST /api/auth/register creates Shop + owner User + Settings in one transaction. UI: "New shop" toggle on login page → register form → creates shop → lands on empty dashboard.
- SHOP-SCOPED UI: AppShell shows the real shop name (mobile header full name, desktop rail label). Auth store syncs studioName from user.shop.name.
- DEPLOYMENT: Vercel + Supabase + GitHub. vercel.json + .env.example + DEPLOYMENT.md with full guide. One provider-line change (sqlite→postgresql) switches the DB to Supabase Postgres. `prisma db push` provisions all tables.
- Each shop is fully isolated: its own clients, orders, staff, trainees, community, portfolio, certificates. New shop owners sign up via the "Create a shop" flow and get a fresh empty atelier.
- Lint clean, no runtime errors. Ready to push to GitHub + deploy.

---
Task ID: 41 (shared login page)
Agent: main
Task: All shops use the same login page — remove the prominent SIGN IN / NEW SHOP toggle.

Work Log:
- Removed the prominent "SIGN IN / NEW SHOP" tab toggle from the top of the login form in src/components/atelier/LoginPage.tsx.
- The login page is now a clean, shared sign-in: "Welcome back" heading + email/password form + Sign in button. This is THE login page all shops (owners, staff, trainees from any tenant) use — email resolves to the user's shop automatically via the session cookie (userId:shopId).
- "Create a new shop" registration kept as a subtle secondary text link below the form ("Opening a new atelier? Create a shop →"). Clicking it switches to the registration form (still fully functional), with a "Back to sign in" link to return.
- Removed the now-unused `cn` import.
- Verified in browser: login page shows clean sign-in (no toggle); "Create a shop" link switches to register form; "Back to sign in" returns; logging in as madam@studio.com lands on the dashboard. No errors.
- Lint clean.

Stage Summary:
- One shared login page for ALL shops. Email + password → auto-routed to the user's tenant. No per-shop login pages, no prominent signup tab competing with sign-in. New shop registration remains accessible via a subtle link.
