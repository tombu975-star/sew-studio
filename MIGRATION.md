# Prisma → Supabase migration — complete

The app no longer uses Prisma anywhere. All data access goes through
`@supabase/supabase-js` (PostgREST), and auth is entirely on **Supabase
Auth** — for shop members and for the separate freelancer identity space.

`prisma/`, `src/lib/db.ts`, `src/lib/tenant.ts`, `src/lib/freelancerAuth.ts`,
and `scripts/ensure-prisma-schema.js` have all been removed. `@prisma/client`
and `prisma` are no longer dependencies.

## What replaced what

**Schema** (`supabase/000*.sql`, run in this order in the Supabase SQL
editor — see `DEPLOYMENT.md`):
- `0001_tables.sql` — every table from the old `prisma/schema.prisma`,
  translated to snake_case with `uuid` ids. `User` → `profiles` (id =
  `auth.users.id`); `FreelancerAccount` → `freelancer_profiles` (same idea,
  a separate identity space — freelancers aren't shop tenants).
- `0002_functions.sql` — `current_shop_id()`, `current_role()`,
  `is_shop_member()`, `is_freelancer()`, `is_shop_manager()`. All
  `security definer` so RLS policies that call them don't recurse.
- `0003_rls.sql` — Row Level Security on every table. The tenant boundary
  that used to live in `getTenant()`/`tenantWhere()` application code is
  now enforced by Postgres itself. Business-rule authorization that isn't
  just "which shop" (e.g. "only madam/trainer can grade a trainee they
  mentor") still lives in route code, same as before — RLS is the coarse,
  unconditional backstop, not a replacement for it.
- `0004_triggers.sql` — `updated_at` auto-touch on every table that has it.
- `0005_rls_write_permissions.sql` — makes destructive-write permissions
  consistent with the manager-only delete rule.

**Supabase client layer** (`src/lib/supabase/`):
- `browserClient.ts` — for client components that need Supabase directly.
- `serverClient.ts` — the one every API route uses. Bound to the request's
  cookies via `@supabase/ssr`, so RLS applies as the signed-in user.
- `adminClient.ts` — service-role client. **Bypasses RLS.** Only for
  legitimately-privileged operations: shop registration, staff/trainee/
  freelancer invites (Supabase Auth's admin API is required to create
  *someone else's* account), and the token-authenticated customer portal
  (the customer has no Supabase session — the secret link token itself is
  the credential, checked in route code).
- `session.ts` — replaces `src/lib/tenant.ts`. `getTenant()` resolves the
  signed-in shop member: `{ supabase, userId, shopId, role, email,
  canManageFreelancers }` — reuse `ctx.supabase` for the rest of the route.
  `getFreelancerSession()` is the freelancer-space equivalent.
  `canManageFreelancers(ctx)` is the permission-check helper.
- `serializers.ts` — shared snake_case → camelCase row mappers (one per
  resource type), so every route returns the same JSON shape the frontend
  already expected — no frontend changes were needed anywhere.
- `database.types.ts` — hand-written to match the SQL schema. Regenerate
  for perfect accuracy once the project is live:
  ```bash
  npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
  ```
- `src/middleware.ts` — refreshes the Supabase session cookie on every
  request (required by `@supabase/ssr`; without it, long-open tabs start
  getting 401s from expired access tokens).

**Every route** in `src/app/api/**/route.ts` was converted from Prisma to
this pattern. Example — old:

```ts
import { db } from "@/lib/db";
import { getTenant, tenantWhere } from "@/lib/tenant";

const ctx = await getTenant(req);
const customers = await db.customer.findMany({
  where: tenantWhere(ctx.shopId),
  include: { orders: true },
});
```

New:

```ts
import { getTenant } from "@/lib/supabase/session";

const ctx = await getTenant();
const { data: customers, error } = await ctx.supabase
  .from("customers")
  .select("*, orders(*)")
  .eq("shop_id", ctx.shopId); // RLS already scopes this; explicit filter is defense in depth
if (error) throw error;
```

Notes that apply everywhere in the codebase now:
- `getTenant()` takes no argument (cookies come from `next/headers`
  automatically inside a Route Handler).
- Prisma's `include: { x: true }` → PostgREST embedding: `.select('*, x(*)')`.
  A disambiguating foreign-key hint is used wherever a table has more than
  one FK to the same target, e.g.
  `assigned_staff:profiles!orders_assigned_staff_id_fkey(*)`.
- There is **no client-side multi-table transaction** in PostgREST. The two
  routes that create related rows together (`register`, invite flows) do
  it as sequential awaited calls with best-effort cleanup on failure if an
  early step succeeds but a later one doesn't (delete the auth user that
  was just created, etc.).
- Routes serving the **customer portal** and **freelancer/jobs** use
  `getFreelancerSession()` or the admin client, per the identity-space
  rules above — never a shop member's RLS-scoped client.

## Seeding demo data

`scripts/init-supabase-essential.ts` was rewritten on the Supabase admin
client (was Prisma). Run with `npm run db:init-essential` — creates/updates
the same essential demo accounts (madam/staff/trainer/trainees/freelancer)
directly in your Supabase project, idempotently.
