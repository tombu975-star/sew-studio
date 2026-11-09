-- Row Level Security. Policy shape used everywhere a table has its own
-- shop_id column:
--   SELECT/INSERT/UPDATE : shop_id = current_shop_id()
--   DELETE                : shop_id = current_shop_id() AND is_shop_manager()
-- (delete restricted to madam/trainer — matches the app's existing
-- convention that only the owner/trainer performs destructive actions).
--
-- Fine-grained *business* rules the app already enforces in route code —
-- e.g. "a trainee can only PATCH the status of a task assigned to them",
-- or "only madam/trainer may set a trainee's curriculum" — stay in the
-- Next.js route handlers, same as before. RLS here is the coarse,
-- unconditional tenant boundary: it guarantees no query can ever cross
-- shop_id, even if a route handler has a bug. Defense in depth, not a
-- replacement for the application-level authorization already in place.

-- ─── shops ─────────────────────────────────────────────────────────
alter table public.shops enable row level security;

create policy "members can view their own shop"
  on public.shops for select
  using (id = public.current_shop_id());

create policy "madam can update their own shop"
  on public.shops for update
  using (id = public.current_shop_id() and public.current_role() = 'madam')
  with check (id = public.current_shop_id() and public.current_role() = 'madam');

-- Freelancers aren't shop members (no profiles row, so current_shop_id()
-- is null for them) but the freelancer-facing job list embeds each job's
-- shop NAME — this lets that embed resolve instead of silently returning
-- null, without exposing anything else about the shop.
create policy "freelancers can view shops that have commissioned them"
  on public.shops for select
  using (
    exists (
      select 1 from public.freelance_jobs j
      where j.shop_id = shops.id and j.freelancer_id = auth.uid()
    )
    or exists (
      select 1 from public.freelancer_shop_links l
      where l.shop_id = shops.id and l.freelancer_id = auth.uid()
    )
  );

-- Shop creation happens via the service-role client during registration
-- (before any profile/session exists to satisfy current_shop_id()), so no
-- INSERT policy is needed for normal users.

-- ─── profiles ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "shop members can view each other's profile"
  on public.profiles for select
  using (shop_id = public.current_shop_id());

create policy "users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "madam or trainer can update any trainee in their shop"
  on public.profiles for update
  using (shop_id = public.current_shop_id() and public.is_shop_manager())
  with check (shop_id = public.current_shop_id() and public.is_shop_manager());

-- New profiles are created by the server (service-role client) when the
-- owner registers a shop, or when madam/trainer invites a staff/trainee —
-- both privileged, server-side operations, so no client-facing INSERT
-- policy is needed.

-- ─── freelancer_profiles (NOT shop-scoped — see schema note) ──────
alter table public.freelancer_profiles enable row level security;

create policy "freelancers can view their own profile"
  on public.freelancer_profiles for select
  using (id = auth.uid());

create policy "freelancers can update their own profile"
  on public.freelancer_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "shop members can view freelancers linked to their shop"
  on public.freelancer_profiles for select
  using (
    exists (
      select 1 from public.freelancer_shop_links l
      where l.freelancer_id = freelancer_profiles.id
        and l.shop_id = public.current_shop_id()
    )
  );

-- ─── freelancer_shop_links / freelance_jobs ───────────────────────
alter table public.freelancer_shop_links enable row level security;

create policy "shop members can manage their freelancer links"
  on public.freelancer_shop_links for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy "freelancers can view their own shop links"
  on public.freelancer_shop_links for select
  using (freelancer_id = auth.uid());

alter table public.freelance_jobs enable row level security;

create policy "shop members can manage jobs they commissioned"
  on public.freelance_jobs for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy "freelancers can view their own jobs"
  on public.freelance_jobs for select
  using (freelancer_id = auth.uid());

create policy "freelancers can update status on their own jobs"
  on public.freelance_jobs for update
  using (freelancer_id = auth.uid())
  with check (freelancer_id = auth.uid());

-- ─── Generic shop-scoped tables ────────────────────────────────────
-- customers, measurement_sets, customer_feedback, orders, tasks,
-- style_concepts, settings, community_posts, training_logs, certificates,
-- customer_notifications, training_programs, competency_units all follow
-- the same shape.
do $$
declare
  t text;
  shop_scoped_tables text[] := array[
    'customers', 'measurement_sets', 'customer_feedback', 'orders', 'tasks',
    'style_concepts', 'settings', 'community_posts', 'training_logs',
    'certificates', 'customer_notifications', 'training_programs',
    'competency_units'
  ];
begin
  foreach t in array shop_scoped_tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy "shop members can view %1$s" on public.%1$s for select using (shop_id = public.current_shop_id())',
      t
    );
    execute format(
      'create policy "shop members can insert %1$s" on public.%1$s for insert with check (shop_id = public.current_shop_id())',
      t
    );
    execute format(
      'create policy "shop members can update %1$s" on public.%1$s for update using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id())',
      t
    );
    execute format(
      'create policy "shop managers can delete %1$s" on public.%1$s for delete using (shop_id = public.current_shop_id() and public.is_shop_manager())',
      t
    );
  end loop;
end $$;

-- ─── payments / fittings (scoped via their parent order) ──────────
alter table public.payments enable row level security;

create policy "shop members can manage payments on their orders"
  on public.payments for all
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.shop_id = public.current_shop_id()
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.shop_id = public.current_shop_id()
    )
  );

alter table public.fittings enable row level security;

create policy "shop members can manage fittings on their orders"
  on public.fittings for all
  using (
    exists (
      select 1 from public.orders o
      where o.id = fittings.order_id and o.shop_id = public.current_shop_id()
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = fittings.order_id and o.shop_id = public.current_shop_id()
    )
  );

-- ─── community_comments / community_likes (scoped via post) ───────
alter table public.community_comments enable row level security;

create policy "shop members can manage comments on their shop's posts"
  on public.community_comments for all
  using (
    exists (
      select 1 from public.community_posts p
      where p.id = community_comments.post_id and p.shop_id = public.current_shop_id()
    )
  )
  with check (
    exists (
      select 1 from public.community_posts p
      where p.id = community_comments.post_id and p.shop_id = public.current_shop_id()
    )
  );

alter table public.community_likes enable row level security;

create policy "shop members can manage likes on their shop's posts"
  on public.community_likes for all
  using (
    exists (
      select 1 from public.community_posts p
      where p.id = community_likes.post_id and p.shop_id = public.current_shop_id()
    )
  )
  with check (
    exists (
      select 1 from public.community_posts p
      where p.id = community_likes.post_id and p.shop_id = public.current_shop_id()
    )
  );

-- ─── Customer portal & service-role-only paths ─────────────────────
-- The customer order-tracking portal (`/portal/[token]`) authenticates
-- with a secret token, not a Supabase session — there is no auth.uid()
-- to scope by. Those routes (and shop registration, and admin invites of
-- staff/trainees) intentionally use the SERVICE ROLE client on the
-- server, which bypasses RLS entirely, with authorization done in the
-- route code itself (token lookup, invite-role checks, etc.) — same
-- pattern the app already used for portal token auth pre-migration.
