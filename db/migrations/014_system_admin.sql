-- Platform ("system") admin: a separate identity from shop members and
-- freelancers, who can see every studio and suspend or reinstate one.
-- Safe to run more than once, and safe if you already created any of this by hand.

-- 1. Studios can be suspended (their members are signed out on the next request).
alter table public.shops
  add column if not exists suspended_at     timestamptz,
  add column if not exists suspended_reason text;

-- 2. Who the platform admins are. One row per admin, same id as their sign-in.
create table if not exists public.system_admins (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  full_name  text not null,
  created_at timestamptz not null default now()
);

alter table public.system_admins enable row level security;

-- An admin may read ONLY their own row (that is how the app confirms who they
-- are right after sign-in). There are deliberately no insert/update/delete
-- policies: nobody can make themselves an admin from the app. Admins are
-- created with `npm run create-admin` or in the Supabase SQL editor.
drop policy if exists "system admins read own row" on public.system_admins;
create policy "system admins read own row"
  on public.system_admins for select
  to authenticated
  using (id = auth.uid());
