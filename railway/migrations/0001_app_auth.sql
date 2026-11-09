-- Railway-owned authentication foundation.
-- Prerequisite: the application schema (profiles, freelancer_profiles,
-- system_admins) must already exist in this PostgreSQL database.
-- Passwords are stored only as Argon2id hashes produced by the application.

begin;

create extension if not exists pgcrypto;

create table if not exists public.app_credentials (
  id uuid primary key default gen_random_uuid(),
  identity_type text not null check (identity_type in ('shop', 'freelancer', 'system_admin')),
  identity_id uuid not null,
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identity_type, identity_id),
  unique (email)
);

create index if not exists app_credentials_email_lower_idx
  on public.app_credentials (lower(email));

-- Store only a SHA-256 digest of the random cookie token in the database.
-- The raw token is returned once and remains in an HttpOnly cookie.
create table if not exists public.app_sessions (
  token_hash text primary key,
  identity_type text not null check (identity_type in ('shop', 'freelancer', 'system_admin')),
  identity_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists app_sessions_identity_idx
  on public.app_sessions (identity_type, identity_id);
create index if not exists app_sessions_expiry_idx
  on public.app_sessions (expires_at);

create table if not exists public.app_password_reset_tokens (
  token_hash text primary key,
  identity_type text not null check (identity_type in ('shop', 'freelancer', 'system_admin')),
  identity_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  check (expires_at > created_at)
);

create index if not exists app_password_reset_expiry_idx
  on public.app_password_reset_tokens (expires_at);

commit;
