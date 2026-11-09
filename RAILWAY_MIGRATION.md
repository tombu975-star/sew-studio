# Railway-owned PostgreSQL migration

## Safety/status

The active application still uses Supabase for route-level PostgREST queries,
Auth, and file uploads. This branch is a migration work-in-progress, not a
production cutover. The bootstrap below creates the PostgreSQL table schema on
a **new, empty** Railway database; it does not migrate existing records or
convert the app's query/auth implementation. Keep the existing Supabase service
and secrets active until code conversion and data verification are complete.

## Bootstrap an empty Railway database

Take no action against a database containing production data. Create a new
Railway PostgreSQL service, make its private `DATABASE_URL` available to a
trusted shell, install `psql`, then run:

```bash
DATABASE_URL='postgresql://…' bash scripts/bootstrap-railway-db.sh
```

The script refuses to run when the `public` schema already contains tables. It
uses the current base table SQL, changing the two Supabase `auth.users` identity
foreign keys to ordinary UUID primary keys, then installs app credential and
session/reset-token tables and the schema extensions used by later migrations.
It does not apply Supabase RLS/functions or create Supabase Storage objects.

## Not yet implemented

- Supabase records and existing auth users are not transferred. Existing users
  will need a planned credential migration or password reset; never export or
  expose plaintext passwords.
- API route database queries, login/register/logout, invitations, freelancer
  auth, system-admin auth, password recovery, uploads, email/edge functions,
  and tenant authorization are still Supabase-dependent in the application.
- The new auth tables are schema only; the app does not yet read or write them.
- No production build or integration test has been run for this migration.

Before any cutover, convert all server routes to parameterized PostgreSQL
queries, implement Argon2id password hashing and secure rotating/revocable
sessions, preserve tenant/role checks, replace storage/email dependencies,
write a tested data-transfer process, run cross-tenant security tests, and
verify backups/restores and production smoke tests.
