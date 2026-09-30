-- "Remove from studio": a removed team member keeps their history (orders
-- they worked on, grades, certificates) but can no longer sign in or appear
-- in the team list. Nothing is deleted.
alter table public.profiles
  add column if not exists is_active  boolean not null default true,
  add column if not exists removed_at timestamptz;

create index if not exists profiles_shop_active_idx
  on public.profiles (shop_id, is_active);
