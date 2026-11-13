-- 035: Saved quotes (additive; no existing table is changed).
-- Roll back with:  drop table if exists public.quotes;
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  customer_name text,
  garment text not null,
  inputs jsonb not null default '{}'::jsonb,
  total numeric(12, 2) not null default 0 check (total >= 0),
  deposit numeric(12, 2) not null default 0 check (deposit >= 0),
  status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Accepted', 'Declined')),
  valid_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quotes_shop_created_idx on public.quotes (shop_id, created_at desc);

alter table public.quotes enable row level security;
drop policy if exists "shop members read" on public.quotes;
drop policy if exists "shop members insert" on public.quotes;
drop policy if exists "shop members update" on public.quotes;
drop policy if exists "shop members delete" on public.quotes;
create policy "shop members read" on public.quotes for select using (shop_id = public.current_shop_id());
create policy "shop members insert" on public.quotes for insert with check (shop_id = public.current_shop_id());
create policy "shop members update" on public.quotes for update using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy "shop members delete" on public.quotes for delete using (shop_id = public.current_shop_id());

drop trigger if exists set_updated_at on public.quotes;
create trigger set_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();
