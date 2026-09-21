# Task ID: 38 — Tenant Scoping of all API routes by shopId

## Agent: full-stack-developer (tenant scoping)

## Task
Scope ALL backend API routes by shopId for "Madam Studio" multi-tenant atelier (Next.js 16 App Router) using the tenant helper at `src/lib/tenant.ts`.

## Files edited (all under `src/app/api/`)
- `dashboard/route.ts` — all 7 collections (orders, payments via order, fittings via order, tasks, users, customers, styleConcepts) scoped by shopId; settings singleton fetched via `findUnique({ where: { shopId } })` with default-create fallback.
- `customers/route.ts` — GET list + POST create (shopId set in data).
- `customers/[id]/route.ts` — GET single + PATCH (ownership via `findFirst({ where: { id, shopId } })`).
- `customers/[id]/measurements/route.ts` — GET (verify customer.shopId).
- `orders/route.ts` — GET list + POST create (verify customer.shopId before connect; shopId set; verify assignedStaff.shopId).
- `orders/[id]/route.ts` — GET single + PATCH (ownership; verify customer/staff shopId on reassign).
- `orders/[id]/payments/route.ts` — POST (verify parent order.shopId).
- `orders/[id]/fittings/route.ts` — POST (verify parent order.shopId).
- `fittings/[id]/route.ts` — PATCH (ownership via `order: { shopId }` nested filter).
- `tasks/route.ts` — GET list + POST create (shopId set; verify parent order.shopId; verify staff.shopId).
- `tasks/[id]/route.ts` — PATCH (ownership; verify orderId/staffId/gradedById shopId).
- `users/route.ts` — GET list + POST create (shopId set in data — new members join current shop).
- `users/[id]/route.ts` — PATCH (ownership; verify mentor.shopId).
- `settings/route.ts` — GET singleton + PATCH (findUnique by shopId, default-create fallback).
- `measurements/route.ts` — POST (verify customer.shopId, set shopId).
- `style-concepts/route.ts` — GET list (tenantWhere) + POST create (verify customer.shopId, set shopId).
- `style-concepts/[id]/route.ts` — PATCH (ownership; verify new customerId shopId).
- `freelancers/route.ts` — GET list + POST create (shopId set).
- `freelancers/[id]/route.ts` — PATCH + DELETE (ownership via findFirst).
- `community/route.ts` — GET list + POST create (shopId set).
- `community/[id]/like/route.ts` — POST (verify parent post.shopId).
- `community/[id]/comments/route.ts` — POST (verify parent post.shopId).
- `training-logs/route.ts` — GET list + POST create (verify trainee.shopId, verify mentor.shopId, set shopId).
- `training-logs/[id]/route.ts` — PATCH + DELETE (ownership; verify mentor.shopId).
- `certificates/route.ts` — GET list + POST create (verify trainee.shopId + issuedBy.shopId, set shopId).
- `certificates/[id]/route.ts` — DELETE (ownership).
- `portfolio/route.ts` — GET list (shopId in where clause, status filter, optional staffId filter).
- `style-assist/generate/route.ts` — getTenant guard + verify customer.shopId before building profile (and all 4 sub-queries scoped by shopId).
- `style-assist/visualize/route.ts` — getTenant guard (data from request body).
- `insights/trends/route.ts` — getTenant guard (data from request body).

## Auth routes left untouched (already tenant-aware)
- `auth/login`, `auth/logout`, `auth/me`, `auth/register` (register creates the Shop + owner + default Settings in a transaction).

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- `curl http://localhost:3000/api/dashboard` (no cookie) → **401 Unauthorized**.
- All 11 GET list routes (customers, orders, tasks, users, settings, portfolio, community, freelancers, style-concepts, training-logs, certificates) return **401** without cookie.
- Both AI POST routes (`/api/style-assist/visualize`, `/api/insights/trends`) return **401** without cookie.
- Logged in as madam@studio.com → `/api/customers` returns **8 customers** (Madam Studio's only).
- `/api/dashboard` with madam cookie → 28 orders, 22 payments, 11 fittings, 22 tasks, 7 users, 8 customers, 2 styleConcepts. Settings.shopId matches the Madam Studio shopId.
- Registered a fresh shop "Test Atelier" via `/api/auth/register` → `/api/customers` returns **`[]`**, `/api/orders` returns **`[]`**, `/api/dashboard` shows 0 orders / 0 customers, and `settings.studioName` is "Test Atelier" with the new shop's shopId.
- Single-fetch isolation: Madam Studio cookie GET `/api/orders/{madamOrderId}` → **200**; new shop cookie GET same order id → **404**.
- Cross-tenant POST payment: new shop cookie POST to Madam's order `/api/orders/{madamOrderId}/payments` → **404**; same-tenant POST → **201**.
- Settings GET isolation: Madam cookie → `studioName=Madam Studio, shopId=<madam_shop_id>`; new shop cookie → `studioName=Test Atelier, shopId=<new_shop_id>`.
- Users list isolation: Madam cookie → 7 users; new shop cookie → 1 user (the new owner only).
- Test shop + test owner were cleaned up after testing (DELETE FROM User WHERE email='test-atelier@example.com'; DELETE FROM Shop WHERE slug='test-atelier').
- Dev server log shows no runtime errors; all routes compiled cleanly with 200/201/401/404 status codes as expected.
