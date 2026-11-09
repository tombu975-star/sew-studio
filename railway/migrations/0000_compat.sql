-- Railway Postgres bootstrap. Recreates the few Supabase pieces the existing
-- schema depends on (roles, auth.uid(), a minimal auth.users identity table)
-- so the row-level-security policies in supabase/*.sql keep working unchanged.
-- Run this BEFORE the supabase/*.sql schema files.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

-- The connecting role must be able to switch into the three roles above.
do $$
begin
  execute format('grant anon, authenticated, service_role to %I', current_user);
end $$;

create schema if not exists auth;

-- Identity root. profiles / freelancer_profiles / system_admins reference it.
-- Passwords live in public.app_credentials, never here.
create table if not exists auth.users (
  id           uuid primary key default gen_random_uuid(),
  email        text unique,
  banned_until timestamptz,
  created_at   timestamptz not null default now()
);

-- The app sets app.user_id (transaction-local) for every request it runs as
-- a signed-in user; RLS policies read it through auth.uid().
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
