# Task 4 — full-stack-developer (customers)

## Task
Build Customers list + CustomerProfile views for Madam Studio (Next.js 16 atelier app).

## Work Log
- Read `/home/z/my-project/worklog.md` to absorb the BINDING design system (burgundy `#800020`, cream `#FBF9F7`, `border-[#E7E5E4]`, `rounded-sm`, font-display headings with `clamp()`), API contract (`/api/customers`, `/api/customers/[id]`, `/api/measurements`), and shared imports (`@/lib/api`, `@/lib/format`, `@/lib/types`, `@/stores/nav`, `@/components/atelier/*`).
- Inspected existing foundation: `useNav` (Zustand view router), `useRole`, `AtelierCard`, `StatusBadge`, `AppShell`, shadcn UI primitives (`Dialog`, `Select`, `Tabs`, `Input`, `Label`, `Textarea`, `Button`), `Providers` (TanStack Query), Prisma schema for `Customer`/`Order`/`MeasurementSet`/`StyleConcept`/`CustomerFeedback`.
- Built `src/views/Customers.tsx` (default export `Customers`):
  - Page wrapper `p-5 md:p-8 max-w-[1100px] mx-auto w-full`.
  - Header: H1 "Customers" with `clamp(28px, 4vw, 36px)`, subtitle showing count, burgundy "Add Customer" button.
  - Search bar: `Input` with absolute-left `Search` icon, filters client-side by name/phone/email.
  - Client Sources breakdown: horizontal flex of `border rounded-sm px-3 py-2` chips with source name + count (driven by `entrySource`).
  - Customer list: `border border-[#E7E5E4] rounded-sm bg-white divide-y divide-[#E7E5E4]` container. Each row is a `<button onClick={() => go('customer', { id: c.id })}>` with avatar circle (initial letter, burgundy text on cream bg), name + phone/email subtext with Phone/Mail icons, right-aligned order count.
  - Loading skeletons + empty states.
  - `AddCustomerDialog`: shadcn Dialog with Name (required), Phone, Email, Gender select, City, Entry Source select, Referred By (conditionally shown when Entry Source = Referral), Customer Type select, Preferred Styles comma text, Notes textarea. POSTs to `/api/customers`, invalidates `customers` query, shows sonner toast on success.
  - Order count: primary from server `_orderCount`; safe fallback fetches `/api/orders` and counts client-side.
- Built `src/views/CustomerProfile.tsx` (default export `CustomerProfile`):
  - Reads `selectedId` from `useNav`; if null, shows "Select a customer" prompt with browse button.
  - Page wrapper `p-5 md:p-8 max-w-[1200px] mx-auto w-full`.
  - Back link: `<button onClick={() => go('customers')}>` with `ArrowLeft` icon + "Back to Customers".
  - CustomerHeader: 64px avatar, font-display large name, contact row (phone/mail/whatsapp/city with icons), customer type badge, entry source, loyalty points. Edit button (opens `EditPersonalDialog`).
  - Style Assist CTA: prominent burgundy button with `Sparkles` icon → `go('style-assist', { id: selectedId })`.
  - Tabs: Overview / Measurements / Orders / Style / Notes. TabsList scrolls horizontally on mobile (`overflow-x-auto scroll-slim`).
    - **Overview**: AtelierCard "Profile" with 6-cell facts grid (Customer Since, Occupation, Gender, Height/Weight, Preferred Fit, Skin Tone) + AtelierCard "Style Snapshot" (favourite colours, colours to avoid, favourite fabrics, preferred styles) + recent feedback card with `Stars` rating.
    - **Measurements**: list of measurement-set cards (date, unit, bust/waist/hip/shoulder/length/sleeve grid, optional notes). "Add Measurement" button → `AddMeasurementDialog` with numeric inputs + notes, POSTs to `/api/measurements`. Empty state with Scissors icon.
    - **Orders**: list of this customer's orders. Each row: garmentDesign, orderDate (shortDate), assigned staff, StatusBadge, formatCurrency(sellingPrice). Click → `go('order', { id })`. "New Order for {firstName}" button → `go('new-order', { params: { customerId } })`. Empty state with ShoppingBag icon.
    - **Style**: grid of style concept cards (conceptName, matchPercent badge, status badge, silhouette/fabric/colour, whyThisMayWork italic blockquote, optional imageUrl). Rejected concepts dimmed via `opacity-60`. Empty state pointing to Style Assist.
    - **Notes**: two AtelierCards (General Notes / Style Notes) with Edit affordances that open EditPersonalDialog.
  - `useQuery(['customer', selectedId], …)` so refetch happens when id changes; `enabled: !!selectedId`. After edit, invalidates query → refetch.
  - `EditPersonalDialog`: reuses same form fields as Add, prefilled from customer, PATCHes `/api/customers/[id]`. Re-syncs form on dialog open.
  - `AddMeasurementDialog`: numeric inputs (bust/waist/hip/shoulder/length/sleeve) + notes, POSTs to `/api/measurements`.
  - Loading skeleton, error state with retry button.
- Built backend API routes so the views function end-to-end (these were empty directories):
  - `src/app/api/customers/route.ts`: `GET` returns customers with computed `_orderCount` (via `_count`); `POST` validates name and creates with all Customer fields, including numeric coercion for height/weight/loyaltyPoints.
  - `src/app/api/customers/[id]/route.ts`: `GET` returns `{ customer, orders (with assignedStaff), measurements, feedback, styleConcepts }`; `PATCH` updates whitelisted string + numeric fields with proper null/number coercion.
  - `src/app/api/measurements/route.ts`: `POST` validates customerId + existence, creates MeasurementSet with numeric coercion for all measurement fields.
- All routes use `Prisma` namespace for strict typing (`CustomerUncheckedCreateInput`, `CustomerUncheckedUpdateInput`, `MeasurementSetUncheckedCreateInput`).
- Verified: `bunx tsc --noEmit` passes cleanly for my files. `bun run lint` clean for my files (no warnings/errors).
- Dev log shows `GET /api/customers 200` — backend is responding.

## Stage Summary
- Files created:
  - `src/views/Customers.tsx` (default export `Customers`)
  - `src/views/CustomerProfile.tsx` (default export `CustomerProfile`)
  - `src/app/api/customers/route.ts` (GET list with `_orderCount`, POST create)
  - `src/app/api/customers/[id]/route.ts` (GET detail aggregate, PATCH update)
  - `src/app/api/measurements/route.ts` (POST create)
- Features:
  - Customers list with search, source breakdown, add-customer dialog (POST), order counts.
  - Customer profile with header (contact info, type badge, entry source, loyalty, Edit + Style Assist CTA), 5 tabs (Overview facts + style snapshot + feedback; Measurements with add dialog; Orders with navigation; Style concepts with images; Notes), loading/empty/error states throughout.
  - Full burgundy/cream/stone design system compliance; `rounded-sm`, `border-[#E7E5E4]`, `formatCurrency`/`formatDate`/`shortDate` everywhere.
  - Responsive: grid collapses on mobile; tabs scroll horizontally; header stacks.
  - Sonner toasts for create/update actions.
- Backend ensures the two views are fully functional end-to-end at `/` → Customers → CustomerProfile. Other agents can layer additional fields/endpoints on top.
