-- 029: burgundy brand, two-month all-features trial, order costing.

-- ── 1. Burgundy brand colours ───────────────────────────────────────────
-- New defaults, and move any row still on an earlier default (the original
-- blue or the plum theme) to burgundy. A colour an admin chose themselves is
-- left alone.
alter table public.system_platform_settings
  alter column primary_color    set default '#6C1C2F',
  alter column accent_color     set default '#832138',
  alter column background_color set default '#F9F2F4';

update public.system_platform_settings
   set primary_color = '#6C1C2F', updated_at = now()
 where upper(primary_color) in ('#1D4ED8', '#571A84', '#6A1FA0');
update public.system_platform_settings
   set accent_color = '#832138', updated_at = now()
 where upper(accent_color) in ('#2563EB', '#6A1FA0', '#571A84');
update public.system_platform_settings
   set background_color = '#F9F2F4', updated_at = now()
 where upper(background_color) in ('#F4F6F8', '#F6F2F9');

-- ── 2. Trial: two months from each studio's own sign-up date ───────────
-- trial_started_at is the sign-up moment; trial_ends_at is two calendar
-- months after it. Both are still set per studio when it is created.
alter table public.shops
  alter column trial_started_at set default now(),
  alter column trial_ends_at    set default (now() + interval '2 months');

-- Existing trial studios: count the two months from when each one signed up
-- (shops.created_at), not from the day migration 019 ran. A studio is never
-- given less time than it already had, so nobody loses days.
update public.shops
   set trial_started_at = created_at,
       trial_ends_at    = greatest(trial_ends_at, created_at + interval '2 months'),
       updated_at       = now()
 where plan = 'trial';

-- ── 3. True Costing on orders ──────────────────────────────────────────
-- other_cost       extras for this job (thread, zips, transport ...)
-- markup_percent   the mark-up used when the price was worked out
-- suggested_price  the price True Costing suggested at that moment, kept so
--                  an owner's change to the final price is visible later
alter table public.orders
  add column if not exists other_cost      numeric(12, 2) not null default 0,
  add column if not exists markup_percent  numeric(6, 2),
  add column if not exists suggested_price numeric(12, 2);

alter table public.settings
  add column if not exists default_markup_percent numeric(6, 2) not null default 30;

comment on column public.orders.other_cost is
  'Other direct costs for this job besides fabric/materials and labour. Part of the order''s True Cost.';
comment on column public.orders.markup_percent is
  'Mark-up % on True Cost used when this order was priced. Null for orders priced by hand.';
comment on column public.orders.suggested_price is
  'Price suggested by True Costing (true cost + mark-up) when the order was booked. selling_price is the owner''s final, editable price.';
comment on column public.settings.default_markup_percent is
  'Studio default mark-up on True Cost, pre-filled when an order is priced.';

-- ── 4. True Costing menu entry ─────────────────────────────────────────
alter table public.system_menu_settings
  drop constraint if exists system_menu_settings_menu_key_check;
alter table public.system_menu_settings
  add constraint system_menu_settings_menu_key_check check (menu_key in (
    'dashboard', 'customers', 'orders', 'board', 'fittings', 'tasks',
    'quote', 'costing', 'style-assist', 'team', 'community', 'curriculum',
    'progress', 'portfolio', 'certificate', 'messages', 'my-jobs', 'settings'
  ));
insert into public.system_menu_settings (menu_key) values ('costing')
on conflict (menu_key) do nothing;
