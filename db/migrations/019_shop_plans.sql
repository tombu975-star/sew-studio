alter table public.shops
  add column if not exists trial_started_at timestamptz not null default now(),
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '14 days');

create table if not exists public.shop_plan_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  requested_plan text not null check (requested_plan in ('pro', 'enterprise')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  message text not null default '',
  reviewed_by uuid references public.system_admins (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists shop_plan_requests_one_pending_per_shop
  on public.shop_plan_requests (shop_id)
  where status = 'pending';
create index if not exists shop_plan_requests_created_idx
  on public.shop_plan_requests (created_at desc);

alter table public.shop_plan_requests enable row level security;

drop trigger if exists set_updated_at on public.shop_plan_requests;
create trigger set_updated_at
  before update on public.shop_plan_requests
  for each row execute function public.set_updated_at();
