-- Pictures uploaded by a platform admin for the public website
-- (/admin/website). Served publicly at /api/site-images/<id>.
create table if not exists public.system_site_images (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  bytes bytea not null,
  size_bytes integer not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.system_admins (id) on delete set null
);
create index if not exists system_site_images_created_idx on public.system_site_images (created_at desc);
alter table public.system_site_images enable row level security;
revoke all on public.system_site_images from anon, authenticated, service_role;
