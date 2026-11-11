-- Editable public website content, managed from the platform admin portal.
-- A single row; `content` holds the validated JSON document. An empty object
-- means "use the built-in defaults" (see src/lib/website-content.ts).
create table if not exists public.system_website_content (
  singleton boolean primary key default true check (singleton),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.system_admins (id) on delete set null
);

alter table public.system_website_content enable row level security;

insert into public.system_website_content (singleton)
values (true)
on conflict (singleton) do nothing;
