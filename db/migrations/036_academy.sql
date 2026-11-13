-- 035: Sewsiness Academy. Courses, video lessons, quizzes, certificates and an
-- on-platform live classroom. Everything is stored and served by this system:
-- no third-party video, meeting or course service is involved.
-- Server-only tables (row level security on, no policies): the app reaches
-- them through its own API routes, never directly from the browser.

create table if not exists public.academy_media (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('video', 'captions', 'image', 'document')),
  filename text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  received_bytes bigint not null default 0,
  storage_key text not null unique,
  status text not null default 'uploading' check (status in ('uploading', 'ready')),
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.academy_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  subtitle text,
  description text,
  level text not null default 'Beginner' check (level in ('Beginner', 'Intermediate', 'Advanced')),
  category text,
  cover_media_id uuid references public.academy_media (id) on delete set null,
  accent text not null default '#800020',
  pass_mark integer not null default 70 check (pass_mark between 1 and 100),
  certificate_enabled boolean not null default true,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists academy_courses_slug_key on public.academy_courses (lower(slug));

create table if not exists public.academy_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academy_courses (id) on delete cascade,
  section text not null default 'Lessons',
  position integer not null default 0,
  title text not null,
  kind text not null default 'video' check (kind in ('video', 'reading', 'quiz')),
  summary text,
  body text,
  media_id uuid references public.academy_media (id) on delete set null,
  captions_media_id uuid references public.academy_media (id) on delete set null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  quiz jsonb,
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists academy_lessons_course_idx on public.academy_lessons (course_id, position);

create table if not exists public.academy_learners (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  phone text,
  about_you text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create unique index if not exists academy_learners_email_key on public.academy_learners (lower(email));

create table if not exists public.academy_auth_codes (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.academy_learners (id) on delete cascade,
  code_hash text not null,
  token_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists academy_auth_codes_learner_idx on public.academy_auth_codes (learner_id, created_at desc);
create unique index if not exists academy_auth_codes_token_key on public.academy_auth_codes (token_hash);

create table if not exists public.academy_learner_sessions (
  token_hash text primary key,
  learner_id uuid not null references public.academy_learners (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists academy_learner_sessions_learner_idx on public.academy_learner_sessions (learner_id);

create table if not exists public.academy_enrollments (
  learner_id uuid not null references public.academy_learners (id) on delete cascade,
  course_id uuid not null references public.academy_courses (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (learner_id, course_id)
);

create table if not exists public.academy_progress (
  learner_id uuid not null references public.academy_learners (id) on delete cascade,
  lesson_id uuid not null references public.academy_lessons (id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (learner_id, lesson_id)
);

create table if not exists public.academy_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.academy_learners (id) on delete cascade,
  lesson_id uuid not null references public.academy_lessons (id) on delete cascade,
  score integer not null,
  total integer not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists academy_quiz_attempts_idx on public.academy_quiz_attempts (learner_id, lesson_id, created_at desc);

create table if not exists public.academy_certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  learner_id uuid not null references public.academy_learners (id) on delete cascade,
  course_id uuid not null references public.academy_courses (id) on delete cascade,
  learner_name text not null,
  course_title text not null,
  issued_at timestamptz not null default now(),
  unique (learner_id, course_id)
);

-- Live classroom: a session can be delivered on this platform instead of an
-- outside meeting link. The session video plays in sync for everyone, with
-- live chat and a questions list for the host.
alter table public.system_public_trainings
  add column if not exists delivery text not null default 'external' check (delivery in ('external', 'onsite')),
  add column if not exists media_id uuid references public.academy_media (id) on delete set null,
  add column if not exists captions_media_id uuid references public.academy_media (id) on delete set null;

create table if not exists public.academy_live_messages (
  id bigint generated always as identity primary key,
  training_id uuid not null references public.system_public_trainings (id) on delete cascade,
  learner_id uuid references public.academy_learners (id) on delete set null,
  display_name text not null,
  body text not null check (char_length(body) between 1 and 500),
  kind text not null default 'chat' check (kind in ('chat', 'question', 'host')),
  answered boolean not null default false,
  pinned boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists academy_live_messages_idx on public.academy_live_messages (training_id, id);

do $$
declare t text;
begin
  foreach t in array array[
    'academy_media', 'academy_courses', 'academy_lessons', 'academy_learners', 'academy_auth_codes',
    'academy_learner_sessions', 'academy_enrollments', 'academy_progress', 'academy_quiz_attempts',
    'academy_certificates', 'academy_live_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop trigger if exists set_updated_at on public.academy_courses;
create trigger set_updated_at before update on public.academy_courses
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.academy_lessons;
create trigger set_updated_at before update on public.academy_lessons
  for each row execute function public.set_updated_at();
