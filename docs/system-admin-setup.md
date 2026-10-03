# Setting up the platform admin (/admin)

The platform admin is separate from studio owners, staff and freelancers. It
can see every studio and suspend or reinstate one.

1. **Database (once).** In the Supabase SQL editor, run `supabase/0014_system_admin.sql`.
   It is safe to run again.
2. **Create the admin.** On a computer with the project and its `.env.local`
   (which needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`):

   ```
   npm run create-admin -- admin@yourdomain.com "a-strong-password" "Your Name"
   ```

   Running it again for the same email just resets that admin's password.
3. **Sign in** at `/admin` with that email and password.

**Doing it by hand instead:** in Supabase go to Authentication → Users → Add user
(tick *Auto Confirm User*), then run:

```sql
insert into public.system_admins (id, email, full_name)
select id, email, 'Your Name' from auth.users where email = 'admin@yourdomain.com';
```

**First stop if you see "Could not reach the sign-in service":** open
`https://YOUR-SITE/api/admin-auth/status` in a browser. It reports, in plain
English, whether the site's Supabase address and key are set and match, whether
Supabase is reachable (or paused), and whether email sign-in is switched on. It
never shows a key. Fix what it lists, **redeploy** (changes to `NEXT_PUBLIC_`
settings only take effect after a new build), and try again. You can delete
`src/app/api/admin-auth/status/route.ts` once sign-in works.

**Can't sign in? Find out why.** Run:

```
npm run create-admin -- --check admin@yourdomain.com "the-password-you-typed"
```

It checks, in order, that the sign-in exists, the email is confirmed, the
password is accepted and the account is marked as an admin, and tells you the
first thing that fails and exactly what to run. It also prints the Supabase
project it is talking to. **That project must be the same one your live site
uses** (compare with `NEXT_PUBLIC_SUPABASE_URL` in your host's environment
settings, e.g. Vercel). Creating the admin in one project while the site points
at another is the most common cause of "Invalid email or password".

**What the messages on the sign-in page mean:**
- "Invalid email or password." — Supabase has no sign-in matching that email and
  password (never created in that project, or a different password).
- "This account's email isn't confirmed yet." — run `npm run create-admin` again
  for that email; it confirms it.
- "Too many attempts." — wait a minute; Supabase rate-limits repeated tries.
- "Couldn't connect to Supabase" / "Supabase rejected the API key" / "Email sign-in is
  switched off" — the site's connection to Supabase is the problem, not the
  password. The bracketed text at the end is Supabase's own error code; open
  `/api/admin-auth/status` for the fix.
- "No system admin account found for that email." — the sign-in works but isn't
  marked as an admin yet (step 2 or the SQL above).

The exact reason for every failed attempt is also written to your host's server
logs, on a line starting with `[admin-auth/login]`.

Use an email that isn't already a studio owner, team member or freelancer.
