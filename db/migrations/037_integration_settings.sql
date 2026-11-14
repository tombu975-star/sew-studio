-- Platform-level integration settings (email, notification webhook, AI keys and
-- their endpoint addresses), edited by a platform admin in /admin/integrations.
--
-- A row overrides the matching environment variable; deleting the row falls
-- back to the environment. Secret values (is_secret) are stored encrypted by the
-- application (AES-256-GCM) and are never returned to the browser.
create table if not exists public.system_integration_settings (
  key text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  value text not null default '',
  is_secret boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.system_admins (id) on delete set null
);

alter table public.system_integration_settings enable row level security;

-- Defence in depth: request roles must never read this table, even if a policy
-- is added by mistake later. The application connects as the table owner.
revoke all on public.system_integration_settings from anon, authenticated, service_role;
