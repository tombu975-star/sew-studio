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

---
# Freelancer marketplace (added after security fixes)

Problem: shops could only see freelancers they had already linked (and only
non-owner members with freelancer access could link anyone), and freelancers
could only see jobs already assigned to them. Self-registered freelancers were
invisible to every shop and there was no way to apply for work.

Added (migration 023):
- Shop Team > Freelancers tab: "Find freelancers" directory (name/specialty/skills only;
  email/phone stay hidden until linked), "Add to roster", "Post an open job",
  applicants list with Hire / Decline / Close. Hiring creates the freelance job and roster link.
- Freelancer portal: "Open jobs" tab listing open posts from active shops (shop name only),
  with Apply (message + optional price) and Withdraw.
- Routes: /api/freelancers/directory, /api/freelance-job-posts(/[id]),
  /api/freelancer/open-jobs(/[id]/apply). Owner or freelancer-access members manage; all server-checked.

---
# Freelancer portal redesign

- Sign-in/sign-up now uses the studio login's split layout, photo and form components
  (PlatformLogin/LoginPage pieces are exported and reused): remember-me, show/hide password,
  forgot-password link, mobile tabs, consistent errors and toasts.
- Portal rebuilt with the app's own components: sticky header + mobile bottom nav,
  metric cards (active, overdue, awaiting payment, earned), filters, status badges,
  skeleton loaders, empty states, overdue highlighting, GHS formatting.
- New Profile tab (edit name/phone/specialty/skills, change password, sign out) backed by
  PATCH /api/freelancer-auth/me; idle sign-out after 20 minutes and session-expiry handling,
  matching the studio app.

---
# Migrations on dev + clearer marketplace errors

`npm run dev` did not apply migrations (only `npm start` did), so locally the new tables
(020-023) were missing and the freelancer directory / job posts failed silently.
- `predev` now runs `scripts/migrate.mjs` (idempotent) before the dev server starts.
- Marketplace routes return a clear "run npm run db:migrate" message when tables are missing.
- The Team > Freelancers screen shows load errors instead of an empty list.

---
# Freelancers apply without being on a roster

Freelancers can browse open jobs from every active studio and apply without a roster
invitation (hiring adds them to the studio's roster automatically). Added a "My requests"
view so applications stay visible after a job is filled or closed, with the studio's decision.

---
# Verified freelancers (migration 024)

- New freelancers get a one-time email link (24h, single use) at sign-up; confirming it sets
  `verified_at` and shows a "Verified" badge (portal header/profile, studio directory,
  applicants, roster).
- Until verified: not listed in the studio directory, cannot be added from it, cannot apply
  to open jobs. A banner in the portal offers "Resend email" (1/minute) and "I've verified".
- Existing freelancers are unverified after the migration and verify on next sign-in.
- Email uses the existing mailer (GOOGLE_APPS_SCRIPT_URL). With no mail channel configured,
  the link is printed in the server log in development.

---
# Sewsiness branding

- Browser tab title is now "Sewsiness" (layout metadata, platform settings, manifest, offline page,
  emails, login/forgot/reset pages, admin header). Migration 025 updates existing platform settings
  that were still on the old "Madam Studio" defaults.
- Icons: save the official logo as public/brand/sewsiness-logo.svg (or .png) and run `npm run icons`
  to regenerate all favicons/app icons. Until then the old icon files remain.

---
# Sewsiness visual redesign (inspired by the dashboard showcase)

Purely visual: no routes, data, permissions or behaviour changed.
- Palette: deep plum sidebar, brand purple (#6A1FA0) for actions/links, gold accent, plum-tinted
  neutrals. The Tailwind blue/indigo/sky/slate/stone scales are re-pointed in globals.css, and every
  hard-coded blue/slate hex in src was migrated, so all pages follow the brand.
- Sidebar: Sewsiness emblem, filled violet active item. Metric cards: tinted tone + icon tile.
  Cards, buttons and tables share one radius/shadow/header style. Status colours re-spaced into
  distinct families (progress = plum, active = green, financial = gold, info = blue).
- Login, forgot/reset password and freelancer sign-in moved from burgundy to the plum theme.
- Migration 027 moves the platform login backdrop default to the new tint.
- Contrast checked: body/muted text, buttons, nav and status colours meet WCAG AA.

---
# Unassigned tasks become open jobs; shops can't edit freelancer profiles (migration 028)

- A database trigger turns every studio task that is unassigned, not done and not a graded
  training exercise into an open job freelancers can request (shown as "Studio task"). It
  pauses the job when the task is assigned or completed, and reopens it if unassigned again.
  Only the task title and due date are shared; no order or customer details.
- Hiring a freelancer from a task-based job creates their freelance job, notes the hand-over
  on the task and moves it to In Progress.
- Studios (including owners) can no longer change a freelancer's name, phone, specialty or
  skills: the API rejects it (403) and the dialog is now "Working terms" (rate notes + status).
  Freelancers edit their own profile from their portal.
