create table if not exists public.system_menu_settings (
  menu_key text primary key check (menu_key in (
    'dashboard', 'customers', 'orders', 'board', 'fittings', 'tasks',
    'quote', 'style-assist', 'team', 'community', 'curriculum', 'progress',
    'portfolio', 'certificate', 'messages', 'my-jobs', 'settings'
  )),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.system_admins (id) on delete set null
);

alter table public.system_menu_settings enable row level security;

insert into public.system_menu_settings (menu_key)
values
  ('dashboard'), ('customers'), ('orders'), ('board'), ('fittings'),
  ('tasks'), ('quote'), ('style-assist'), ('team'), ('community'),
  ('curriculum'), ('progress'), ('portfolio'), ('certificate'),
  ('messages'), ('my-jobs'), ('settings')
on conflict (menu_key) do nothing;
