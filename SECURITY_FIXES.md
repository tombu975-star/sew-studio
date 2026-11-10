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
