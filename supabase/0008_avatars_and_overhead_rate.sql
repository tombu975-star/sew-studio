-- Additive migration — safe to run multiple times.
--
-- 1. Profile pictures for team members and freelancers (URL-based, same
--    convention as every other image field in this schema — orders.design_image,
--    community_posts.image_url — no storage bucket, just a hosted URL).
--
-- 2. Standard overhead-recovery-rate costing: instead of a flat overhead
--    amount added equally to every order, the studio sets its average
--    monthly direct costs (materials/fabric, excluding labour) as the
--    allocation base. The overhead recovery rate is then:
--
--      Overhead Recovery Rate (%) = Total Monthly Overhead ÷ Monthly Direct-Cost Base × 100
--
--    ...and every order's overhead margin becomes:
--
--      Order Overhead Margin = Order Fabric Cost × Overhead Recovery Rate
--
--    This is the standard predetermined-overhead-rate method used in job
--    costing: overhead is recovered from each job in proportion to the
--    direct (non-labour) cost it carries, rather than a flat per-order fee
--    that undercharges big jobs and overcharges small ones.
--
--    While overhead_recovery_basis is 0 (not yet configured), the app
--    falls back to the previous flat-amount behaviour so nothing regresses
--    for studios that haven't set this up yet.

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.freelancer_profiles
  add column if not exists avatar_url text;

alter table public.settings
  add column if not exists overhead_recovery_basis numeric(12, 2) not null default 0;

comment on column public.profiles.avatar_url is
  'Hosted URL of the member''s profile photo. Optional — falls back to initials avatar in the UI.';
comment on column public.freelancer_profiles.avatar_url is
  'Hosted URL of the freelancer''s profile photo. Optional — falls back to initials avatar in the UI.';
comment on column public.settings.overhead_recovery_basis is
  'Studio''s estimated average monthly direct costs (materials/fabric etc.), excluding labour — the denominator of the standard overhead recovery rate: total monthly overhead ÷ this figure. Drives the per-order overhead margin (see orderOverheadMargin in src/lib/format.ts). 0 = not yet configured, app falls back to the flat per-order overhead amount.';
