-- 031: Payments, Business Projection, Accra Runs and Inventory tools.

-- 1. Menu keys for the new tools (admin can switch each on/off).
alter table public.system_menu_settings
  drop constraint if exists system_menu_settings_menu_key_check;
alter table public.system_menu_settings
  add constraint system_menu_settings_menu_key_check check (menu_key in (
    'dashboard', 'customers', 'orders', 'board', 'fittings', 'tasks',
    'quote', 'costing', 'payments', 'projection', 'accra-runs', 'assets',
    'style-assist', 'team', 'community', 'curriculum',
    'progress', 'portfolio', 'certificate', 'messages', 'my-jobs', 'settings'
  ));
insert into public.system_menu_settings (menu_key)
values ('payments'), ('projection'), ('accra-runs'), ('assets')
on conflict (menu_key) do nothing;

-- 2. Accra Runs (procurement trips) and their shopping lists.
create table if not exists public.accra_run_trips (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  trip_date date not null default current_date,
  shopper_id uuid references public.profiles (id) on delete set null,
  status text not null default 'Planned' check (status in ('Planned', 'Logged')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.accra_run_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  trip_id uuid not null references public.accra_run_trips (id) on delete cascade,
  description text not null,
  planned_before boolean not null default true,
  obtained boolean not null default false,
  planned_cost numeric(12, 2) not null default 0,
  actual_cost numeric(12, 2) not null default 0,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists accra_run_items_trip_idx on public.accra_run_items (trip_id);

-- 3. Inventory of the studio itself (machines, mannequins, irons, furniture).
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  category text not null default 'Machine',
  purchase_date date,
  purchase_cost numeric(12, 2),
  condition text not null default 'Good',
  status text not null default 'In Use',
  location text,
  last_service_date date,
  next_service_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Row-level security: a studio only ever sees its own rows.
do $$
declare t text;
begin
  foreach t in array array['accra_run_trips', 'accra_run_items', 'assets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "shop members read" on public.%I', t);
    execute format('drop policy if exists "shop members insert" on public.%I', t);
    execute format('drop policy if exists "shop members update" on public.%I', t);
    execute format('drop policy if exists "shop members delete" on public.%I', t);
    execute format('create policy "shop members read" on public.%I for select using (shop_id = public.current_shop_id())', t);
    execute format('create policy "shop members insert" on public.%I for insert with check (shop_id = public.current_shop_id())', t);
    execute format('create policy "shop members update" on public.%I for update using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id())', t);
    execute format('create policy "shop members delete" on public.%I for delete using (shop_id = public.current_shop_id())', t);
  end loop;
end $$;

drop trigger if exists set_updated_at on public.accra_run_trips;
create trigger set_updated_at before update on public.accra_run_trips
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.assets;
create trigger set_updated_at before update on public.assets
  for each row execute function public.set_updated_at();
