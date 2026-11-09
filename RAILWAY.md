# Deploying Madam Studio on Railway

> **Migration status:** the app still depends on Supabase for its data-access
> and authentication code. Railway Postgres has an initial auth schema under
> `railway/migrations/`, but the application has not been fully converted and
> this guide is not a production cutover recipe yet. See `RAILWAY_MIGRATION.md`.
> Keep the current Supabase project and variables until the full migration,
> data copy, and verification are complete.

## Target setup

The target is a Next.js app service and a PostgreSQL service in the same Railway
project. The app will connect to Postgres through a private, server-only
`DATABASE_URL`. Do not expose database credentials in browser variables.

## Railway project setup (when app conversion is ready)

1. Create a Railway project and deploy this repository as a service.
2. Add a PostgreSQL service to the same Railway project.
3. Configure the app's private `DATABASE_URL` from the Railway Postgres
   connection reference.
4. Take a database backup before applying schema migrations.
5. Apply only the reviewed Railway migrations from a trusted environment.
6. Configure `NEXT_PUBLIC_APP_URL` to the public Railway/custom domain and
   redeploy.
7. Complete the login, registration, data-integrity, tenant-isolation, uploads,
   and recovery smoke tests before any production cutover.

The current `npm run start` deployment still requires the existing Supabase
variables because production routes have not yet been converted.
