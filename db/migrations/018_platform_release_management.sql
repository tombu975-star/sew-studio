create table if not exists public.system_platform_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  release_notes text not null default '',
  settings_snapshot jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid references public.system_admins (id) on delete set null,
  published_by uuid references public.system_admins (id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists system_platform_releases_created_idx
  on public.system_platform_releases (created_at desc);
create unique index if not exists system_platform_one_published_release_idx
  on public.system_platform_releases (status) where status = 'published';
alter table public.system_platform_releases enable row level security;

create table if not exists public.system_platform_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.system_admins (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists system_platform_audit_log_created_idx
  on public.system_platform_audit_log (created_at desc);
alter table public.system_platform_audit_log enable row level security;
