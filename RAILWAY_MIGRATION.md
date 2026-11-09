# Railway-owned PostgreSQL migration

## Safety/status

The production application still uses Supabase for route-level PostgREST
queries, auth outside the shop login/me/logout endpoints, and file uploads.
This branch is migration work in progress, not a production cutover. The
bootstrap creates the app schema on a **new, empty** Railway database; it does
not migrate existing records. Keep Supabase services and secrets active until
all routes and tenant checks are converted and verified.

The shop `login`, `me`, and `logout` endpoints have an opt-in Railway auth path
when `USE_RAILWAY_AUTH=1` and a populated Railway database is available. This
is not sufficient to run the authenticated application on Railway: protected
API routes still use Supabase session/RLS, while the Railway cookie is not a
Supabase session. Keep the flag unset in production until the application data
access layer and every authenticated route have been migrated together.

## Bootstrap an empty Railway database

Never run the bootstrap against a database containing production data. Create
a new Railway PostgreSQL service, make its private `DATABASE_URL` available to
a trusted shell, install `psql`, then run:

```bash
DATABASE_URL='postgresql://…' bash scripts/bootstrap-railway-db.sh
```

The script refuses to run when the `public` schema already contains tables. It
uses the current base table SQL, changing the Supabase `auth.users` foreign-key
dependencies to standalone UUID identities, then installs app credential and
session/reset-token tables and schema extensions used by later migrations. It
does not apply Supabase RLS/functions or create Supabase Storage objects.

## Still required before cutover

- Transfer and verify existing app data; existing users need a planned
  credential import or password-reset process.
- Migrate registration, invites, freelancer/system-admin auth, profile updates,
  password recovery, uploads, notifications, and every authenticated data API.
- Replace Supabase query/RLS behavior with parameterized PostgreSQL access and
  explicit, tested tenant/role authorization.
- Add login rate limiting and CSRF protections for state-changing endpoints.
- Run build, integration tests, cross-tenant authorization tests, backup/restore
  tests, and production smoke tests before removing Supabase.
