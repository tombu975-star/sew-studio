# Security fixes — summary

- Default staff password removed; random temporary password generated, forced change at first sign-in (migration 021)
- Login throttling moved to Postgres, per account and per IP (migration 020)
- Uploaded images require shop membership or a matching customer portal token
- Minimum password length is 8 everywhere
- Portal tokens are crypto-random; weak old tokens cleared (migration 022); rotate (PUT) / revoke (DELETE) endpoints added
- Order create/update/payment/fitting routes enforce roles server-side
- RAILWAY_MIGRATION.md reconciled with RAILWAY.md

Deploy notes: run migrations 020-022; existing shared portal links stop working;
prisma/seed.ts still uses a demo password, never run it against production.
SECURITY_FIXES.patch holds the full diff against the original upload.
