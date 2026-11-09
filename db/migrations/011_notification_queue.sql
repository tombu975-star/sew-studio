-- Email notification queue used by the `email-notification` edge function.
-- The function reads/writes these tables with the service-role key only, so
-- RLS is enabled with NO policies: normal app users can never read or change
-- queued emails (they contain customer addresses and message text).

create table if not exists public.notification_jobs (
  id                 uuid primary key default gen_random_uuid(),
  shop_id            uuid references public.shops (id) on delete cascade,
  notification_type  text not null default 'general',
  recipient_email    text not null,
  recipient_name     text,
  subject            text not null,
  message            text not null,
  reference_type     text,
  reference_id       text,
  scheduled_for      timestamptz not null default now(),
  status             text not null default 'PENDING'
                       check (status in ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
  attempts           integer not null default 0,
  error_message      text,
  locked_at          timestamptz,
  sent_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists notification_jobs_due_idx
  on public.notification_jobs (status, scheduled_for);

create table if not exists public.notification_logs (
  id                   uuid primary key default gen_random_uuid(),
  notification_job_id  uuid not null references public.notification_jobs (id) on delete cascade,
  provider             text not null,
  recipient_email      text,
  subject              text,
  status               text not null,
  error_message        text,
  sent_at              timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists notification_logs_job_idx
  on public.notification_logs (notification_job_id);

alter table public.notification_jobs enable row level security;
alter table public.notification_logs enable row level security;
