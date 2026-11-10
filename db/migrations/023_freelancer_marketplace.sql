-- Open job posts (shop side) and applications (freelancer side).
-- Server-only tables: routes authorize explicitly, like public.uploads.
create table if not exists public.freelance_job_posts (
  id               uuid primary key default gen_random_uuid(),
  shop_id          uuid not null references public.shops (id) on delete cascade,
  task_description text not null,
  budget           numeric(12, 2),
  due_date         timestamptz,
  status           text not null default 'Open',  -- Open | Filled | Closed
  created_by       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists freelance_job_posts_shop_idx on public.freelance_job_posts (shop_id);
create index if not exists freelance_job_posts_open_idx on public.freelance_job_posts (status, created_at desc);

create table if not exists public.freelance_job_applications (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.freelance_job_posts (id) on delete cascade,
  freelancer_id uuid not null references public.freelancer_profiles (id) on delete cascade,
  message       text,
  proposed_cost numeric(12, 2),
  status        text not null default 'Pending',  -- Pending | Accepted | Declined | Withdrawn
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (post_id, freelancer_id)
);
create index if not exists freelance_job_applications_freelancer_idx on public.freelance_job_applications (freelancer_id);

alter table public.freelance_job_posts enable row level security;
alter table public.freelance_job_applications enable row level security;
revoke all on public.freelance_job_posts from anon, authenticated;
revoke all on public.freelance_job_applications from anon, authenticated;
