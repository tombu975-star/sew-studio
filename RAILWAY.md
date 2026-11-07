# Deploying Madam Studio on Railway

Only the Next.js app moves to Railway. **Supabase stays exactly as it is** —
database, auth, storage and all your data are untouched.

## 1. Push the code to GitHub
Never commit `.env*` files (the repo's `.gitignore` already blocks them).

## 2. Create the Railway service
Railway → **New Project → Deploy from GitHub repo** → pick this repo.
`railway.json` supplies the start command, health check and restart policy;
the build (`npm run build`) is detected automatically.

## 3. Set variables — *before* the first deploy
Service → **Variables**. See `.env.example` for the full list.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only secret. Never `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_APP_URL` | recommended | The public Railway/custom domain (builds password-reset links) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | optional | Style Assist (AI) |
| `GOOGLE_APPS_SCRIPT_URL` / `_SECRET` | optional | Customer notification relay |

`NEXT_PUBLIC_*` values are baked into the browser bundle **at build time** —
if you change one, trigger a **redeploy**, not just a restart.

## 4. Public domain
Service → **Settings → Networking → Generate Domain** (or add a custom domain).
Then set `NEXT_PUBLIC_APP_URL` to that URL and redeploy.

## 5. Tell Supabase about the new domain
Supabase → **Authentication → URL Configuration**
- **Site URL**: your Railway/custom domain
- **Redirect URLs**: add `https://<your-domain>/**`

Without this, password-reset emails will not redirect back to the app.

## 6. Verify
1. `https://<domain>/api/health` → `{"ok":true,…}` (the app is up)
2. `https://<domain>/api/admin-auth/status` → `"ok": true` (Supabase reachable, keys valid)
3. Sign in at `/`, `/freelancer` and `/admin`.

## Good to know
- **Region:** the Supabase project is in eu-west-1 (Ireland). Choose Railway's
  **EU West (Amsterdam)** region for the lowest latency.
- **Everyone signs in again** on the new domain — session cookies don't carry
  across domains. Anyone who installed the PWA from the old URL must re-install it.
- **Vercel:** once Railway works, disconnect/delete the Vercel project so two
  deployments aren't serving the same app. `vercel.json` is harmless and can be removed.
- The health check intentionally makes no database call, so a Supabase hiccup
  can't cause Railway to restart a healthy app.
