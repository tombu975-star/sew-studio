# Deploying Madam Studio — Vercel + Supabase (via GitHub)

> **Status (2026-09-21):** the old "Sewsiness" Supabase project (`tombu975-star's Project`, ref `bgdvhxcgobolcdvieeuf`) has been **paused**. A new project, **`madam-studio`** (ref `bhjihkodfepbskmobszk`, eu-west-1), is live with the schema below already pushed and the old project's demo data migrated in as the "Adom Couture" shop, with Row Level Security enabled on every table. Get the DB password/connection string from the Supabase dashboard → this project → Project Settings → Database (not retrievable via API). This copy of the repo has `provider = "postgresql"` already set and `.github/workflows/` already added — see the CI/CD section below.

Madam Studio is a multi-tenant atelier management platform. Each "shop" is an isolated tenant with its own clients, orders, staff, trainees, and community. This guide deploys it to **Vercel** (frontend + API) with **Supabase** (Postgres database), continuously deployed from a **GitHub** repository.

---

## Architecture

```
GitHub repo ──push──▶ Vercel (Next.js 16 app) ──▶ Supabase (Postgres)
                              │
                              └─▶ z-ai-web-dev-sdk (AI: Style Assist, Trend Insights)
```

- **Vercel**: hosts the Next.js app (App Router, API routes, SSR). Auto-deploys on every push to `main`.
- **Supabase**: managed Postgres database. One database, many shops — every row is scoped by `shopId` (tenant isolation enforced in every API route via `getTenant()`).
- **GitHub**: source of truth. Vercel builds from your repo.
- **AI**: the `z-ai-web-dev-sdk` powers Style Assist (concept generation + image visualization) and Trend Insights. It runs server-side only.

---

## Step 1 — Create a Supabase project

1. Go to **https://supabase.com** → sign in → **New project**.
2. Name it (e.g. `madam-studio`), set a strong database password, choose a region close to your users.
3. Wait for the project to provision (~2 min).
4. Go to **Project Settings → Database → Connection string**.
5. Copy the **Transaction** pooler URL (port `6543`). It looks like:
   ```
   postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
   Replace `[YOUR-PASSWORD]` with the password you set. **Save this string** — it's your `DATABASE_URL`.

---

## Step 2 — Switch Prisma to Postgres

The committed schema uses SQLite for local dev. For Supabase, make two changes:

1. Edit `prisma/schema.prisma` — change the provider:
   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. Set your `DATABASE_URL` locally (or in a `.env` file):
   ```bash
   export DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"
   ```
3. Push the schema to Supabase:
   ```bash
   bun run db:push
   ```
   This creates all tables (Shop, User, Customer, Order, …) in your Supabase Postgres.

> **Note**: the schema is identical between SQLite and Postgres — only the `provider` line changes. All `cuid()` IDs, relations, and `@@unique` constraints work on both.

---

## Step 3 — (Optional) Seed demo data

To load the demo atelier (Madam Studio + 8 clients + 28 orders + trainees + community posts):

```bash
bun run prisma/seed.ts
```

This creates one tenant ("Madam Studio") you can sign into with `madam@studio.com` / `atelier2025`. Skip this for a clean production deploy — new shops are created via the in-app **"Create a shop"** registration flow.

---

## Step 4 — Push to GitHub

1. Create a new GitHub repository (e.g. `madam-studio`).
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Multi-tenant atelier platform — Vercel + Supabase ready"
   git branch -M main
   git remote add origin https://github.com/<you>/madam-studio.git
   git push -u origin main
   ```
   > `.env`, `dev.log`, `node_modules`, `.next`, and the local `db/*.db` are gitignored — they won't be pushed.

---

## Step 5 — Deploy to Vercel

1. Go to **https://vercel.com** → sign in with GitHub → **Add New → Project**.
2. **Import** your `madam-studio` repository.
3. Vercel auto-detects Next.js. In the project settings, set the **Environment Variables**:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | your Supabase pooler connection string (Step 1) |
   | `NEXT_PUBLIC_APP_NAME` | `Madam Studio` (optional) |

4. The build command (`prisma generate && next build`) is set in `vercel.json` — Vercel picks it up automatically.
5. Click **Deploy**. The first build takes ~2 min.
6. On every future `git push` to `main`, Vercel auto-redeploys.

> **Important**: make sure the `provider = "postgresql"` change from Step 2 is committed to GitHub before deploying, so Vercel builds against Postgres.

---

## Step 6 — Verify

1. Open your Vercel URL (e.g. `madam-studio.vercel.app`).
2. You'll see the login page. Click **"New shop"** to register your first atelier (shop name, your name, email, password).
3. After registering, you land on the dashboard — a fresh, empty shop ready for business.
4. Add customers, create orders, invite staff — everything is scoped to your shop.

To load the demo shop instead, run `bun run prisma/seed.ts` against your Supabase database, then sign in with `madam@studio.com` / `atelier2025`.

---

## Multi-tenant isolation

Every data model carries a `shopId`. The session cookie encodes `userId:shopId`. Every API route calls `getTenant(req)` which:

1. Decodes the cookie → `{ userId, shopId }`.
2. Verifies the user exists and belongs to that shop.
3. Returns 401 if not authenticated.

All Prisma queries filter by `shopId`:

```ts
const ctx = await getTenant(req);
if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
const customers = await db.customer.findMany({ where: { shopId: ctx.shopId } });
```

Child resources (payments on orders, comments on posts) verify the parent's `shopId` before any write. **A shop can never read or write another shop's data.**

---

## Environment variables reference

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | Vercel + local | Postgres connection string (Supabase pooler) |
| `NEXT_PUBLIC_APP_NAME` | Vercel (optional) | App display name |
| `ZAI_API_KEY` | Vercel (if needed) | z-ai-web-dev-sdk key (usually auto-configured) |

See `.env.example` for the full template.

---

## Local development

```bash
bun install
bun run db:push     # creates the SQLite db (or Supabase if DATABASE_URL set to postgres)
bun run seed        # optional — loads demo data
bun run dev         # starts on http://localhost:3000
```

The dev server uses SQLite by default (`DATABASE_URL=file:./db/custom.db`). To develop against Supabase locally, set `DATABASE_URL` to your Supabase string and switch the provider to `postgresql`.

---

## CI/CD — auto-deploy on every push to GitHub

Two things auto-deploy from this repo; they're independent and use different mechanisms:

**1. The Next.js app (server + API routes) → Vercel.** This is Vercel's own GitHub integration, not a GitHub Action — it needs no workflow file. One-time setup: import the repo at vercel.com (Step 5 above); every push to `main` after that redeploys automatically.

**2. Supabase (DB schema + Edge Functions) → GitHub Actions.** Two workflows in `.github/workflows/`:
  - `deploy-db.yml` — on any push to `main` that touches `prisma/schema.prisma` or `prisma/migrations/`, runs `prisma db push` against Supabase.
  - `deploy-edge-functions.yml` — on any push to `main` that touches `supabase/functions/`, deploys every function in that folder with the Supabase CLI. A starter `supabase/functions/health` is included — drop new functions in as sibling folders and they deploy automatically, no workflow edits needed.

Add these repo secrets (GitHub repo → **Settings → Secrets and variables → Actions**):

| Secret | Value |
|---|---|
| `DATABASE_URL` | madam-studio's Supabase pooler connection string (Project Settings → Database) |
| `SUPABASE_ACCESS_TOKEN` | personal access token from https://supabase.com/dashboard/account/tokens |
| `SUPABASE_PROJECT_ID` | `bhjihkodfepbskmobszk` |

---

## Tech stack

- **Next.js 16** (App Router, API routes, Turbopack)
- **TypeScript 5**
- **Prisma 6** (Postgres on Supabase / SQLite locally)
- **Tailwind CSS 4** + shadcn/ui (New York)
- **TanStack Query** (server state) + **Zustand** (client state: auth, role, nav)
- **z-ai-web-dev-sdk** (LLM + image generation for Style Assist + Trend Insights)
- **Recharts** (dashboard charts), **@dnd-kit** (kanban board)
- **sonner** (toasts), **lucide-react** (icons)

---

## Troubleshooting

**Build fails with "Prisma can't reach database":** ensure `DATABASE_URL` is set in Vercel Environment Variables (not just local) and the provider is `postgresql`.

**"Unauthorized" on every API call after deploy:** the cookie is domain-scoped — clear cookies on your Vercel URL and re-login.

**AI features (Style Assist) return errors:** the `z-ai-web-dev-sdk` needs its credentials in the server environment. Confirm the SDK is configured on Vercel (it usually reads from the runtime automatically; if not, set `ZAI_API_KEY`).

**`prisma db push` against Supabase hangs:** use the **Transaction pooler** URL (port 6543), not the direct connection (port 5432). The Session pooler also works but Transaction is recommended for serverless.
