-- Madam Studio — Supabase-native schema (replaces prisma/schema.prisma)
-- Run in the Supabase SQL editor, or via `supabase db push`, in this order:
--   0001_tables.sql -> 0002_functions.sql -> 0003_rls.sql -> 0004_triggers.sql
--
-- Design notes:
--  * Every table uses uuid ids (gen_random_uuid()), matching Supabase convention.
--  * `profiles` and `freelancer_profiles` are 1:1 extensions of auth.users —
--    their id IS the auth.users id. This is how Supabase Auth carries our
--    custom fields (role, shop_id, etc.) since auth.users itself is managed
--    by Supabase and shouldn't be altered directly.
--  * All shop-owned tables carry shop_id for tenant scoping, enforced by RLS
--    (see 0003_rls.sql) — the same boundary the app used to enforce in code
--    via getTenant()/tenantWhere(), now enforced by Postgres itself.

create extension if not exists pgcrypto;

-- ─── Tenant ────────────────────────────────────────────────────────
create table public.shops (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  plan       text not null default 'trial',
  currency   text not null default 'GHS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── People ────────────────────────────────────────────────────────
-- Extends auth.users 1:1. Created by our own server code right after
-- supabase.auth.admin.createUser() (registration) or .signUp() — never by
-- a raw trigger, so we control shop creation atomically. See auth routes.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  full_name  text not null,
  role       text not null default 'staff'
             check (role in ('madam', 'staff', 'trainer', 'trainee')),
  gender     text,
  phone      text,
  shop_id    uuid not null references public.shops (id) on delete cascade,
  mentor_id  uuid references public.profiles (id) on delete set null,
  training_duration_weeks int,
  training_started_at     timestamptz,
  program_id uuid, -- fk added after training_programs exists (below)
  can_access_orders      boolean not null default false,
  can_access_board       boolean not null default false,
  can_manage_freelancers boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_shop_id_idx on public.profiles (shop_id);
create index profiles_mentor_id_idx on public.profiles (mentor_id);

-- ─── Freelancers (NOT shop tenants — see FreelanceJob note below) ──
create table public.freelancer_profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  full_name  text not null,
  phone      text,
  specialty  text,
  skills     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.freelancer_shop_links (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references public.shops (id) on delete cascade,
  freelancer_id uuid not null references public.freelancer_profiles (id) on delete cascade,
  rate_notes    text,
  status        text not null default 'Available',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (shop_id, freelancer_id)
);
create index freelancer_shop_links_shop_id_idx on public.freelancer_shop_links (shop_id);

-- order_id is an internal bookkeeping reference ONLY (no FK, deliberately —
-- see original schema comment: the freelancer-facing API must never join
-- into orders/customers).
create table public.freelance_jobs (
  id               uuid primary key default gen_random_uuid(),
  shop_id          uuid not null references public.shops (id) on delete cascade,
  freelancer_id    uuid not null references public.freelancer_profiles (id) on delete cascade,
  order_id         uuid,
  task_description text not null,
  cost             numeric(12, 2),
  due_date         timestamptz,
  status           text not null default 'Commissioned',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index freelance_jobs_shop_id_idx on public.freelance_jobs (shop_id);
create index freelance_jobs_freelancer_id_idx on public.freelance_jobs (freelancer_id);

-- ─── Clients ───────────────────────────────────────────────────────
create table public.customers (
  id                 uuid primary key default gen_random_uuid(),
  shop_id            uuid not null references public.shops (id) on delete cascade,
  name               text not null,
  phone              text,
  email              text,
  whatsapp           text,
  gender             text,
  occupation         text,
  city               text,
  country            text,
  entry_source       text,
  referred_by        text,
  customer_type      text,
  preferred_styles   text,
  favourite_colours  text,
  colours_to_avoid   text,
  favourite_fabrics  text,
  preferred_fit      text,
  design_preferences text,
  style_notes        text,
  skin_tone          text,
  height             double precision,
  weight             double precision,
  loyalty_points     integer not null default 0,
  notes              text,
  status             text not null default 'Active',
  portal_token       text unique,
  portal_phone       text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index customers_shop_id_idx on public.customers (shop_id);

create table public.measurement_sets (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  staff_id    uuid references public.profiles (id) on delete set null,
  unit        text not null default 'cm',
  date_taken  timestamptz not null default now(),
  bust        double precision,
  waist       double precision,
  hip         double precision,
  shoulder    double precision,
  length      double precision,
  sleeve      double precision,
  inseam      double precision,
  neck        double precision,
  notes       text,
  created_at  timestamptz not null default now()
);
create index measurement_sets_shop_id_idx on public.measurement_sets (shop_id);
create index measurement_sets_customer_id_idx on public.measurement_sets (customer_id);

create table public.customer_feedback (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  rating      integer not null default 5,
  type        text not null default 'General',
  feedback    text,
  date        timestamptz not null default now()
);
create index customer_feedback_shop_id_idx on public.customer_feedback (shop_id);

-- ─── Orders & production ───────────────────────────────────────────
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  shop_id           uuid not null references public.shops (id) on delete cascade,
  customer_id       uuid not null references public.customers (id),
  garment_design    text not null,
  design_image      text,
  order_date        timestamptz not null,
  delivery_date     timestamptz,
  status            text not null default 'Enquiry',
  assigned_staff_id uuid references public.profiles (id),
  selling_price     numeric(12, 2) not null default 0,
  fabric_cost       numeric(12, 2) not null default 0,
  labour_cost       numeric(12, 2) not null default 0,
  notes             text,
  priority          text not null default 'Medium',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index orders_shop_id_idx on public.orders (shop_id);
create index orders_customer_id_idx on public.orders (customer_id);

create table public.payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  amount     numeric(12, 2) not null,
  method     text,
  date       timestamptz not null default now(),
  note       text,
  created_at timestamptz not null default now()
);
create index payments_order_id_idx on public.payments (order_id);

create table public.fittings (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  date       timestamptz not null,
  status     text not null default 'Scheduled',
  notes      text,
  created_at timestamptz not null default now()
);
create index fittings_order_id_idx on public.fittings (order_id);

-- ─── Curriculum (competency-based training) — created before `tasks`
-- since tasks reference competency_units. ──────────────────────────
create table public.training_programs (
  id             uuid primary key default gen_random_uuid(),
  shop_id        uuid not null references public.shops (id) on delete cascade,
  name           text not null,
  level          text not null,
  duration_weeks integer not null,
  description    text,
  created_by_id  uuid not null references public.profiles (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index training_programs_shop_id_idx on public.training_programs (shop_id);

alter table public.profiles
  add constraint profiles_program_id_fkey
  foreign key (program_id) references public.training_programs (id) on delete set null;
create index profiles_program_id_idx on public.profiles (program_id);

create table public.competency_units (
  id                  uuid primary key default gen_random_uuid(),
  shop_id             uuid not null references public.shops (id) on delete cascade,
  program_id          uuid not null references public.training_programs (id) on delete cascade,
  code                text,
  title               text not null,
  learning_outcomes   text not null,
  assessment_criteria text not null,
  nominal_hours       integer,
  order_index         integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index competency_units_program_id_idx on public.competency_units (program_id);

create table public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  shop_id            uuid not null references public.shops (id) on delete cascade,
  title              text not null,
  order_id           uuid references public.orders (id) on delete cascade,
  staff_id           uuid references public.profiles (id),
  status             text not null default 'To Do',
  priority           text not null default 'Medium',
  due_date           timestamptz,
  notes              text,
  max_score          integer,
  score              integer,
  graded_by_id       uuid references public.profiles (id),
  graded_at          timestamptz,
  feedback           text,
  competency_unit_id uuid references public.competency_units (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index tasks_shop_id_idx on public.tasks (shop_id);
create index tasks_order_id_idx on public.tasks (order_id);
create index tasks_staff_id_idx on public.tasks (staff_id);

create table public.style_concepts (
  id                 uuid primary key default gen_random_uuid(),
  shop_id            uuid not null references public.shops (id) on delete cascade,
  customer_id        uuid not null references public.customers (id) on delete cascade,
  garment_type       text not null,
  occasion           text,
  desired_look       text,
  season             text,
  budget             numeric(12, 2),
  colour_preference  text,
  concept_name       text not null,
  silhouette         text,
  neckline           text,
  sleeve_style       text,
  length             text,
  fabric             text,
  colour             text,
  detailing          text,
  embellishment      text,
  why_this_may_work  text,
  fit_considerations text,
  match_percent      integer,
  design_direction   text,
  image_url          text,
  status             text not null default 'Suggested',
  rejection_reason   text,
  data_confidence    text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index style_concepts_shop_id_idx on public.style_concepts (shop_id);
create index style_concepts_customer_id_idx on public.style_concepts (customer_id);

-- ─── Settings ──────────────────────────────────────────────────────
create table public.settings (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null unique references public.shops (id) on delete cascade,
  owner_gender    text not null default 'Madam',
  studio_name     text not null default 'Madam Studio',
  overhead_amount numeric(12, 2) not null default 0,
  self_payout     numeric(12, 2) not null default 0,
  currency        text not null default 'GHS',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Community ─────────────────────────────────────────────────────
create table public.community_posts (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  author_name text not null,
  author_role text,
  type        text not null default 'update',
  title       text,
  body        text not null,
  image_url   text,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index community_posts_shop_id_idx on public.community_posts (shop_id);

create table public.community_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.community_posts (id) on delete cascade,
  author_name text not null,
  author_id   uuid references public.profiles (id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index community_comments_post_id_idx on public.community_comments (post_id);

create table public.community_likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (post_id, author_id)
);

-- ─── Training & certificates ───────────────────────────────────────
create table public.training_logs (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  trainee_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id  uuid references public.profiles (id),
  skill      text,
  title      text not null,
  note       text,
  status     text not null default 'Learning',
  date       timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index training_logs_shop_id_idx on public.training_logs (shop_id);
create index training_logs_trainee_id_idx on public.training_logs (trainee_id);

create table public.certificates (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references public.shops (id) on delete cascade,
  trainee_id      uuid not null references public.profiles (id) on delete cascade,
  issued_by_id    uuid not null references public.profiles (id),
  program_name    text not null default 'Atelier Apprenticeship Programme',
  duration_weeks  integer not null default 12,
  skills_achieved text not null,
  honors          text,
  certificate_no  text not null unique,
  issued_at       timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index certificates_shop_id_idx on public.certificates (shop_id);

-- ─── Customer notifications (order alerts) ────────────────────────
create table public.customer_notifications (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references public.shops (id) on delete cascade,
  customer_id     uuid not null references public.customers (id) on delete cascade,
  order_id        uuid references public.orders (id) on delete cascade,
  type            text not null,
  title           text not null,
  body            text not null,
  status_from     text,
  status_to       text,
  read_at         timestamptz,
  direction       text not null default 'auto',
  channel         text not null default 'in_app',
  recipient       text,
  delivery_status text not null default 'sent',
  sent_at         timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index customer_notifications_shop_id_idx on public.customer_notifications (shop_id);
create index customer_notifications_customer_id_idx on public.customer_notifications (customer_id);
