-- 034: Public trainings & webinars shown on the Sewsiness website.
-- Platform-level (not per studio): managed by the platform admin, open to
-- visitors who do not have an account.

create table if not exists public.system_public_trainings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  presenter text,
  kind text not null default 'Webinar' check (kind in ('Webinar', 'Class', 'Training')),
  starts_at timestamptz,
  duration_minutes integer not null default 60 check (duration_minutes between 5 and 1440),
  meeting_url text,
  replay_url text,
  status text not null default 'Scheduled' check (status in ('Scheduled', 'Live', 'Completed', 'Cancelled')),
  capacity integer check (capacity is null or capacity > 0),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_training_registrations (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.system_public_trainings (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  about_you text,
  created_at timestamptz not null default now()
);
create unique index if not exists system_training_registrations_one_per_email
  on public.system_training_registrations (training_id, lower(email));

-- Server-only tables: no policies, so no direct client access.
alter table public.system_public_trainings enable row level security;
alter table public.system_training_registrations enable row level security;

drop trigger if exists set_updated_at on public.system_public_trainings;
create trigger set_updated_at before update on public.system_public_trainings
  for each row execute function public.set_updated_at();
