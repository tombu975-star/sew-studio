# Deploying Madam Studio — Vercel + Supabase (native, no Prisma)

> **Status:** the app now talks to Supabase directly via `@supabase/supabase-js`
> (PostgREST) and uses **Supabase Auth** for every login — the owner's shop
> account, staff/trainer/trainee accounts, and the separate freelancer
> identity space. There is no Prisma, no `DATABASE_URL`, and no ORM
> migration step; the schema lives in `supabase/schema/*.sql` and Row Level
> Security enforces the multi-tenant boundary inside Postgres itself. See
> `MIGRATION.md` for how this came to be, if useful context.

Madam Studio is a multi-tenant atelier management platform. Each "shop" is
an isolated tenant with its own clients, orders, staff, trainees, and
community — enforced by Postgres RLS, not application code. This guide
deploys it to **Vercel** (frontend + API) with **Supabase** (Postgres +
Auth), continuously deployed from a **GitHub** repository.

---

## Architecture

```
GitHub repo ──push──▶ Vercel (Next.js 16 app) ──▶ Supabase (Postgres + Auth, via PostgREST)
                              │
                              └─▶ z-ai-web-dev-sdk (AI: Style Assist, Trend Insights)
```

- **Vercel**: hosts the Next.js app (App Router, API routes, SSR). Auto-deploys on every push to `main`.
- **Supabase**: Postgres database + Auth. Every table has Row Level Security — a signed-in user's queries are scoped to their own shop by Postgres itself, not by trusting application code (see `supabase/schema/0003_rls.sql`).
- **GitHub**: source of truth. Vercel builds from your repo.
- **AI**: the `z-ai-web-dev-sdk` powers Style Assist (concept generation + image visualization) and Trend Insights. It runs server-side only.

---

## Step 1 — Create a Supabase project

1. Go to **https://supabase.com** → sign in → **New project**.
2. Name it (e.g. `madam-studio`), set a strong database password, choose a region close to your users.
3. Wait for the project to provision (~2 min).

## Step 2 — Run the schema

In the Supabase dashboard, open **SQL Editor** and run the four files in
`supabase/schema/` **in order** (paste each one's contents, run, then move
to the next):

1. `0001_tables.sql` — every table
2. `0002_functions.sql` — RLS helper functions
3. `0003_rls.sql` — Row Level Security policies
4. `0004_triggers.sql` — `updated_at` auto-touch triggers

This is a one-time step, not something to wire into CI: these files use
plain `create table`/`create policy`, not `if not exists` guards, so
re-running them as-is on an already-provisioned database will error on
duplicate objects. If you need repeatable, versioned schema changes going
forward, the natural next step is converting `supabase/schema/*.sql` into
proper [Supabase CLI migrations](https://supabase.com/docs/guides/deployment/database-migrations)
(`supabase migration new <name>`, then `supabase db push`), which track
what's already been applied — this repo doesn't set that up yet.

## Step 3 — Get your API keys

Go to **Project Settings → API**. You need three values:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ never expose this to the client — it bypasses Row Level Security entirely)

## Step 4 — Deploy to Vercel

1. Push this repo to GitHub, then **Import Project** in Vercel from that repo.
2. In **Vercel → Project → Settings → Environment Variables**, add the three keys from Step 3 (Production + Preview).
3. Deploy. `vercel.json` already points the build at `next build` — no Prisma step needed.

## Step 5 — Create your first account

Open the deployed app and use **"Create a shop"** on the login screen — this
calls `/api/auth/register`, which creates your Supabase Auth user and your
shop in one step. You're signed in immediately after.

### Optional: seed demo data

To populate a full demo shop (owner, staff, trainer, two trainees, a
freelancer, a training program) directly in your Supabase project:

```bash
# .env (local, not committed) needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm run db:init-essential
```

This is idempotent — safe to run again. It prints the demo accounts and
their password (`atelier2025`) when done.

---

## How auth works now

- **Shop members** (madam/staff/trainer/trainee): a Supabase Auth user, plus
  a `profiles` row (same `id`) carrying role, shop_id, and the
  trainee-specific fields. Register/login/logout/me are all thin wrappers
  around `supabase.auth.*` — see `src/app/api/auth/*`.
- **Freelancers**: a *separate* identity space — `freelancer_profiles`
  instead of `profiles`, no `shop_id` (a freelancer can work with several
  shops). Their own login lives at `/freelancer`, backed by
  `src/app/api/freelancer-auth/*`.
- **The customer portal** (`/portal/[token]`): customers never get a
  Supabase account at all — the secret link token is the credential,
  checked in route code against the `customers.portal_token` column, using
  the service-role client (RLS doesn't apply — the token check *is* the
  authorization).
- **Session cookies** are managed entirely by `@supabase/ssr` +
  `src/middleware.ts` (refreshes expiring access tokens automatically).
  There's nothing to configure here beyond the three env vars above.

## Multi-tenancy, the new way

Previously every route manually filtered `WHERE shopId = ctx.shopId`. That
still happens (defense in depth), but the *real* boundary is now Row Level
Security: even a route with a bug that forgets the filter cannot return
another shop's data, because Postgres itself checks
`shop_id = current_shop_id()` (a `security definer` function reading the
caller's own `profiles` row) on every single query. See
`supabase/schema/0003_rls.sql` for the full policy set, and its header
comment for the reasoning on what's enforced by RLS vs. left to route code
(business rules like "a trainer can only grade their own mentees" aren't
just about *which shop* — those stay in the route handlers).

---

## Customer notifications — Google Apps Script

Order status changes, payments, and fittings all call `notifyCustomer()`
(`src/lib/notify.ts`), which always logs an audit row to
`customer_notifications`, and — if configured — also attempts real delivery
via a **Google Apps Script Web App** you deploy from your own Google
account. No Twilio/SendGrid account needed; Apps Script runs your Gmail
sending for free and can fan out to WhatsApp/SMS providers too if you wire
those in.

**Setup:**
1. Go to [script.google.com](https://script.google.com) → New project.
2. Paste the script from `docs/google-apps-script-notifications.md` in.
3. **Deploy → New deployment → Web app.** Execute as: *Me*. Who has access: *Anyone*.
4. Copy the deployment URL.
5. Set these on Vercel (and your local `.env.local`):
   ```
   GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXXX/exec
   GOOGLE_APPS_SCRIPT_SECRET=choose-a-random-string
   ```
   (Put the same secret string in the `SHARED_SECRET` constant at the top of the script.)

Without `GOOGLE_APPS_SCRIPT_URL` set, nothing breaks — notifications are
still logged (shown in Messages as "Logged only") but nothing is actually
sent, exactly like before this was wired up.



- **"Invalid email or password" but the account exists in Supabase**: make
  sure it was created via this app's own register/invite flow (or
  `db:init-essential`), not by adding a user directly through Supabase's
  **Authentication** tab — that alone doesn't create the matching
  `profiles`/`freelancer_profiles` row this app needs.
- **A query returns empty when you expect rows**: check RLS first. Test the
  same query as the `service_role` key (bypasses RLS) to see if it's a data
  problem or a policy problem.
- **Regenerating types**: `src/lib/supabase/database.types.ts` is
  hand-written to match the SQL schema. Once your project is live, get an
  exact version with:
  ```bash
  npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
  ```
