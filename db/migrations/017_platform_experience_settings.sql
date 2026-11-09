create table if not exists public.system_platform_settings (
  singleton boolean primary key default true check (singleton),
  app_version text not null default '0.2.1',
  release_notes text not null default '',
  brand_name text not null default 'Madam Studio',
  login_heading text not null default 'Welcome back',
  login_description text not null default 'Sign in to manage your studio’s customers, orders and daily work.',
  login_footer text not null default 'Madam Studio · Atelier management system',
  primary_color text not null default '#1D4ED8' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#2563EB' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_color text not null default '#F4F6F8' check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.system_admins (id) on delete set null
);

alter table public.system_platform_settings enable row level security;

insert into public.system_platform_settings (singleton)
values (true)
on conflict (singleton) do nothing;
