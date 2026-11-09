# Supabase → Railway migration status

## Current status: foundation only — do not switch production traffic yet

The production code still uses Supabase PostgREST and Supabase Auth. This branch
adds an initial database-owned auth schema, but does not yet convert the route
handlers or move existing user/data records. Do not remove Supabase environment
variables or shut down the existing Supabase project until the application
conversion and data verification are complete.

## Target architecture

- Next.js app and PostgreSQL are hosted in the same Railway project.
- API routes connect to PostgreSQL using a server-only `DATABASE_URL`.
- Passwords are stored as Argon2id hashes; session cookies are random,
  HttpOnly, Secure in production, and SameSite=Lax. Only a SHA-256 token digest
  is stored in the database.
- Shop members, freelancers, and platform admins remain separate identity
  spaces. Every data operation must retain the existing tenant and role checks.
- Supabase Auth, PostgREST, Storage, Edge Functions, and Supabase environment
  variables are removed only after all replacement paths are verified.

## Work in this branch

`railway/migrations/0001_app_auth.sql` creates credential, session, and
password-reset token tables. It expects the application tables (`profiles`,
`freelancer_profiles`, and `system_admins`) to be present. It deliberately
avoids Supabase's `auth.users` dependency and does not store raw session tokens.

Apply SQL manually from a trusted environment after taking a database backup:

```bash
export DATABASE_URL='(Railway PostgreSQL connection string)'
bash scripts/migrate-railway-db.sh
```

The repository's existing Supabase schema scripts are not a ready-made Railway
bootstrap: several migrations rely on Supabase Auth, `auth.uid()`, Supabase
roles, and RLS behavior. They must be converted before they can initialize a
standalone Railway database. Do not run them blindly against production.

## Remaining required phases

1. Convert the complete database schema and all subsequent SQL migrations to
   provider-neutral PostgreSQL migrations; create the schema on Railway and
   migrate data with counts/checksums and a tested rollback/backup plan.
2. Add server-side PostgreSQL access and replace every `ctx.supabase` query in
   API routes with parameterized SQL/ORM operations. Preserve tenant scoping in
   every query and add integration tests for cross-tenant access.
3. Implement app-owned authentication: password hashing, login/register,
   session creation/rotation/revocation, freelancer and system-admin flows,
   invitation flows, change/reset password, and rate limits. Wire every auth
   endpoint and `getTenant()`/other session helpers to these services.
4. Replace Supabase storage and edge-function use (uploads/email/notifications)
   with Railway-compatible storage and services, or document which external
   services remain intentionally in use.
5. Update health checks, seed/admin scripts, Railway variables, and deployment
   guides; remove Supabase packages and code only after repository-wide search,
   build, tests, and a production smoke test pass.

## Security checklist before launch

- Use Railway's private service connection for the app's `DATABASE_URL`; never
  expose it as a `NEXT_PUBLIC_*` variable.
- Require TLS for any connection made outside Railway's private network.
- Use a dedicated least-privilege app DB role; do not run the app as the
  database superuser/owner.
- Keep auth and tenant authorization server-side; never trust a user/shop ID
  supplied by the browser.
- Verify password hashing, session expiry/revocation, CSRF protections for
  state-changing routes, and rate limits before enabling registration/login.
- Back up Supabase and Railway databases and verify restore procedures before
  any cutover. Existing Supabase users will need a password reset unless their
  credentials can be securely imported through an approved process.
