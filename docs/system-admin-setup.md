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

**Reading the sign-in error:**
- "Invalid email or password." means no sign-in exists for that email/password
  (never created, or wrong password).
- "No system admin account found for that email." means the sign-in works but
  it hasn't been made an admin (step 2 or the SQL above).

Use an email that isn't already a studio owner, team member or freelancer.
