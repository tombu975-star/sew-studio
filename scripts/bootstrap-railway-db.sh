#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to a fresh Railway PostgreSQL database}"
command -v psql >/dev/null 2>&1 || { echo "psql is required" >&2; exit 1; }

# This bootstrap is only for a NEW, EMPTY database. It imports the existing
# app's table definitions but removes Supabase Auth's auth.users foreign-key
# dependency. Existing Supabase data is NOT copied by this script.
existing_tables="$(psql "$DATABASE_URL" --tuples-only --no-align --set ON_ERROR_STOP=1 \
  --command="select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")"
if [[ "$existing_tables" != "0" ]]; then
  echo "Refusing to bootstrap: public schema already has tables. Use an empty database or take a backup and plan a data migration." >&2
  exit 1
fi

schema_file="$(mktemp)"
trap 'rm -f "$schema_file"' EXIT

# The source schema's two auth.users-backed identities become ordinary UUID
# identities; IDs may be preserved by a separately written/verified data copy.
sed 's/id[[:space:]]\+uuid primary key references auth\.users (id) on delete cascade/id uuid primary key default gen_random_uuid()/g' \
  supabase/schema/0001_tables.sql > "$schema_file"

if grep -Eq 'references auth\.users|auth\.uid\(\)' "$schema_file"; then
  echo "Supabase Auth dependency remains in transformed schema; refusing to apply." >&2
  exit 1
fi

psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --file "$schema_file"
psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --file railway/migrations/0001_app_auth.sql

# These columns existed in later Supabase migrations and are required by the
# current app's data model. Storage bucket setup is intentionally omitted:
# Railway Postgres does not provide Supabase Storage.
psql "$DATABASE_URL" --set ON_ERROR_STOP=1 <<'SQL'
begin;

alter table public.settings
  add column if not exists overhead_items jsonb not null default '[]',
  add column if not exists outstanding_balance_alert_threshold numeric(12,2) not null default 2000,
  add column if not exists typical_active_orders_per_staff integer not null default 4,
  add column if not exists contact_phone text not null default '',
  add column if not exists contact_email text not null default '',
  add column if not exists address text not null default '',
  add column if not exists tax_id text not null default '',
  add column if not exists invoice_prefix text not null default 'INV',
  add column if not exists overhead_recovery_basis numeric(12,2) not null default 0;

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists is_active boolean not null default true,
  add column if not exists removed_at timestamptz,
  add column if not exists email_key text,
  add column if not exists phone_key text;

alter table public.freelancer_profiles
  add column if not exists avatar_url text,
  add column if not exists email_key text,
  add column if not exists phone_key text;

alter table public.shops
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text;

alter table public.measurement_sets
  add column if not exists height double precision,
  add column if not exists weight double precision,
  add column if not exists across_back double precision,
  add column if not exists bust_point double precision,
  add column if not exists shoulder_to_bust double precision,
  add column if not exists underbust double precision,
  add column if not exists back_length double precision,
  add column if not exists front_length double precision,
  add column if not exists upper_arm double precision,
  add column if not exists wrist double precision,
  add column if not exists waist_to_hip double precision,
  add column if not exists crotch_depth double precision,
  add column if not exists thigh double precision,
  add column if not exists knee double precision,
  add column if not exists ankle double precision,
  add column if not exists outseam double precision,
  add column if not exists posture text;

create index if not exists profiles_shop_active_idx on public.profiles (shop_id, is_active);
create index if not exists measurement_sets_customer_date_idx on public.measurement_sets (customer_id, date_taken desc);

create table if not exists public.system_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  created_at timestamptz not null default now()
);

commit;
SQL

echo "Railway schema bootstrap complete. No Supabase data or auth accounts were copied."
