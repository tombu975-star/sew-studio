-- Railway-owned authentication tables.
-- Lives in a `private` schema that the request roles (anon / authenticated /
-- service_role) have no access to, so nothing sent through the query layer
-- can ever read password hashes or session tokens.
-- Passwords are Argon2id hashes made by the app. Session and reset tokens are
-- random values; only their SHA-256 digest is stored.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.credentials (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  password_hash text not null,
  updated_at    timestamptz not null default now()
);

create table if not exists private.sessions (
  token_hash   text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_seen_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index if not exists sessions_user_idx on private.sessions (user_id);
create index if not exists sessions_expiry_idx on private.sessions (expires_at);

create table if not exists private.password_resets (
  token_hash text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz,
  check (expires_at > created_at)
);
create index if not exists password_resets_user_idx on private.password_resets (user_id);

-- Uploaded pictures (avatars, designs). Stored in Postgres so the whole app
-- lives on Railway; served through /api/files/<id>.
create table if not exists public.uploads (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops (id) on delete cascade,
  kind         text not null default 'general',
  content_type text not null,
  bytes        bytea not null,
  created_at   timestamptz not null default now()
);
create index if not exists uploads_shop_idx on public.uploads (shop_id);
-- Only the server reads/writes this table (service path); no direct policies.
alter table public.uploads enable row level security;
revoke all on public.uploads from anon, authenticated;

commit;
