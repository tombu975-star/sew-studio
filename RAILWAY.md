# Deploying Madam Studio on Railway

This project is configured to run the app and its PostgreSQL database on Railway itself.

The database is not outsourced to a separate service like Supabase. Railway owns the
Postgres instance, and the app connects to it via `DATABASE_URL`.

## 1. Push the code to GitHub

Never commit `.env*` files (the repo's `.gitignore` already blocks them).

## 2. Create the Railway service

Railway → New Project → Deploy from GitHub repo → pick this repo.
`railway.json` supplies the start command, health check and restart policy; the build
(`npm run build`) is detected automatically.

## 3. Add the Postgres database

In the Railway project dashboard:

1. Click New → Database → PostgreSQL
2. Wait for the database to provision
3. Copy the generated `DATABASE_URL`
4. Add it to the app service as a variable

The app service should use the database created in the same Railway project so the
backend is not dependent on another hosted application.

## 4. Set variables — before the first deploy

Service → Variables. See `.env.example` for the full list.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Railway PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | recommended | Public Railway/custom domain |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | recommended | Session signing secret |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | optional | Style Assist (AI) |
| `GOOGLE_APPS_SCRIPT_URL` / `_SECRET` | optional | Customer notification relay |

`NEXT_PUBLIC_*` values are baked into the browser bundle at build time — if you change
one, trigger a redeploy, not just a restart.

## 5. Public domain

Service → Settings → Networking → Generate Domain (or add a custom domain).
Then set `NEXT_PUBLIC_APP_URL` to that URL and redeploy.

## 6. Verify

1. `https://<domain>/api/health` → `{"ok":true,...}` (the app is up)
2. Confirm the app can read/write from the Railway Postgres database
3. Sign in at `/`, `/freelancer` and `/admin`

## Good to know

- Railway owns the database instance, so the app has one deployment boundary instead of
  depending on a separate external backend.
- Keep the app and Postgres in the same Railway project to minimize latency and simplify
  networking.
- Everyone signs in again on a new domain — session cookies do not carry across domains.
- Once Railway is working, any old Vercel project or Supabase dependency can be removed
  if it was only being used for the database.
