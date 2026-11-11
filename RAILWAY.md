# Madam Studio on Railway

Everything runs in one Railway project: the Next.js app and a PostgreSQL
service. There is no other hosted backend.

## How it fits together

- **Database:** Railway Postgres. The app connects over Railway's private
  network with `DATABASE_URL` (a reference to the Postgres service, never
  exposed to the browser).
- **Tenant isolation:** unchanged. Row-level-security policies in the database
  decide what each signed-in user can see. For every query the app switches to
  the `authenticated` role and sets the caller's id, which the policies read
  through `auth.uid()` (`db/migrations/001_compat.sql`).
- **Sign-in:** the app owns it. Passwords are Argon2id hashes in
  `private.credentials`; sessions are random HttpOnly cookies and only a
  SHA-256 digest is stored (`private.sessions`). The `private` schema is not
  reachable by the request roles. Failed logins are rate-limited per email+IP.
- **Pictures:** stored in the `uploads` table and served from `/api/files/<id>`.
- **Email** (password resets, freelancer verification) is sent by the app itself.
  Set up ONE provider below. If none is set, the app logs
  `[mailer] No email provider is configured` and no email goes out.

## Variables on the app service

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | the public https address of the app (used in reset links) |
| `GOOGLE_APPS_SCRIPT_URL`, `GOOGLE_APPS_SCRIPT_SECRET` | optional, customer WhatsApp/SMS/email notifications (and an email fallback) |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | optional, for Style Assist |

## Deploys

`railway.json` runs `npm run db:migrate` as the pre-deploy command. It applies
any new files in `db/migrations/` once each (recorded in
`private.schema_migrations`) and does nothing when the database is current.
The startup command also runs migrations before serving requests. Migration
`016_system_menu_settings.sql` initializes the platform-wide menu controls.

Platform admins can open **System menus** in `/admin` to enable or disable
features for every studio. Disabled features are removed from app navigation,
their API routes are blocked, and the freelancer portal is unavailable when
its menu is disabled.

## First-time setup

1. Deploy. The migration creates the schema.
2. Create the platform admin from your machine:
   `railway run npm run create-admin -- you@example.com "a-strong-password" "Your Name"`
   (check it with `--check`).
3. Open `/api/admin-auth/status` to confirm the app reaches the database.

## Adding a migration

Add the next numbered file to `db/migrations/` (plain SQL). Never edit one
that has already been applied.

## Tests

With a throwaway migrated database:

```bash
DATABASE_URL=postgresql://... npx tsx tests/db-layer.test.ts
```

## Email setup

Choose one. Both are tested; the app tries Resend first, then SMTP.

**A. Gmail or any SMTP mailbox** (works straight away, sends to anyone)

| Variable | Value |
| --- | --- |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | the mailbox, e.g. `you@gmail.com` |
| `SMTP_PASS` | a Gmail *App password* (Google account > Security > 2-Step Verification > App passwords), not your normal password |
| `EMAIL_FROM` | `Sewiness <you@gmail.com>` |

**B. Resend** (best for a custom domain)

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | from resend.com |
| `EMAIL_FROM` | `Sewiness <no-reply@your-verified-domain>` (the domain must be verified in Resend) |

Check it from your machine, which prints the provider used and any exact error:

```bash
railway run npm run email:test -- you@example.com
```
