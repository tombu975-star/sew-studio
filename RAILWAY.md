# Deploying Madam Studio on Railway

> **Migration status:** the production application still uses Supabase for its
> data access, authentication, and uploads. The branch includes an initial
> Railway database bootstrap, but the app has not yet been converted and data
> has not been copied. Do not remove Supabase configuration or switch
> production traffic until the migration is complete and verified. See
> `RAILWAY_MIGRATION.md`.

## Target architecture

Run the Next.js app and PostgreSQL services in one Railway project. The app
will use the private, server-only `DATABASE_URL`; never expose it to browser
code or use a `NEXT_PUBLIC_` prefix.

## Database bootstrap (new empty database only)

1. Add a Railway PostgreSQL service to the project.
2. Make its private `DATABASE_URL` available to a trusted shell with `psql`.
3. For a **new, empty database only**, run `bash scripts/bootstrap-railway-db.sh`.
4. Back up the database and verify the schema before deploying app code that
   uses it.

The bootstrap refuses to run if the `public` schema already contains tables.
It does not copy production data or migrate Supabase accounts. The current app
still needs its existing Supabase variables, so this database is not yet a
replacement backend.

## App service

Deploy the GitHub repository as a Railway service. `railway.json` configures the
start command and health endpoint. Do not remove Supabase variables until the
application code, data, auth, uploads, and all integrations have been migrated
and smoke-tested.
