-- Freelancers must confirm their email before they can apply for jobs or be
-- listed to studios. A verified freelancer shows a "Verified" badge.
alter table public.freelancer_profiles
  add column if not exists verified_at timestamptz;

create table if not exists private.freelancer_verifications (
  token_hash    text primary key,
  freelancer_id uuid not null references public.freelancer_profiles (id) on delete cascade,
  expires_at    timestamptz not null,
  used_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists freelancer_verifications_freelancer_idx
  on private.freelancer_verifications (freelancer_id, created_at desc);
