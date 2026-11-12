-- 033: Webinars & Training: live webinars, classes and training sessions.

alter table public.system_menu_settings
  drop constraint if exists system_menu_settings_menu_key_check;
alter table public.system_menu_settings
  add constraint system_menu_settings_menu_key_check check (menu_key in (
    'dashboard', 'customers', 'orders', 'board', 'fittings', 'tasks',
    'quote', 'costing', 'payments', 'projection', 'accra-runs', 'assets',
    'style-assist', 'team', 'community', 'curriculum', 'webinars',
    'progress', 'portfolio', 'certificate', 'messages', 'my-jobs', 'settings'
  ));
insert into public.system_menu_settings (menu_key)
values ('webinars')
on conflict (menu_key) do nothing;

create table if not exists public.webinars (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  title text not null,
  description text,
  presenter text,
  kind text not null default 'Webinar' check (kind in ('Webinar', 'Class', 'Training')),
  starts_at timestamptz,
  duration_minutes integer not null default 60 check (duration_minutes between 5 and 1440),
  meeting_url text,
  registration_url text,
  status text not null default 'Scheduled' check (status in ('Scheduled', 'Live', 'Completed', 'Cancelled')),
  audience text not null default 'Everyone' check (audience in ('Everyone', 'Staff', 'Trainers', 'Trainees')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists webinars_shop_starts_idx on public.webinars (shop_id, starts_at desc);

alter table public.webinars enable row level security;
drop policy if exists "shop members read" on public.webinars;
drop policy if exists "shop members insert" on public.webinars;
drop policy if exists "shop members update" on public.webinars;
drop policy if exists "shop members delete" on public.webinars;
create policy "shop members read" on public.webinars for select using (shop_id = public.current_shop_id());
create policy "shop members insert" on public.webinars for insert with check (shop_id = public.current_shop_id());
create policy "shop members update" on public.webinars for update using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy "shop members delete" on public.webinars for delete using (shop_id = public.current_shop_id());

drop trigger if exists set_updated_at on public.webinars;
create trigger set_updated_at before update on public.webinars
  for each row execute function public.set_updated_at();
