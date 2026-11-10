# Railway migration — history

**Status: complete.** The application runs fully on Railway PostgreSQL with
app-owned authentication (`src/lib/db/auth.ts`: Argon2id passwords, HttpOnly
session cookies, DB-backed login throttling) and uploads stored in the
`public.uploads` table. Supabase is no longer used at runtime. See
[`RAILWAY.md`](./RAILWAY.md) for deployment, variables, migrations and tests.

Notes for anyone reading older history:

- Migrations live in `db/migrations/` and are applied by `scripts/migrate.mjs`
  (the Railway pre-deploy command). `railway/migrations/` and
  `scripts/bootstrap-railway-db.sh` are legacy bootstrap helpers for an empty
  database and are not part of the normal deploy.
- `src/lib/db/database.types.ts` and `scripts/ensure-prisma-schema.js` still
  mention Supabase in names/comments only; they contain no Supabase calls.
- Existing data from a former Supabase deployment must be imported separately;
  the bootstrap scripts do not migrate records.
