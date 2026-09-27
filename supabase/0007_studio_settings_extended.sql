-- Extended studio settings — additive migration for databases created
-- before this column set existed. Safe to run multiple times.
-- Adds: overhead cost breakdown (itemised, replaces the flat per-order
-- overhead whenever at least one item is listed), the outstanding-balance
-- dashboard alert threshold, typical active-order capacity per staff
-- member, and studio contact/registration details.

alter table public.settings
  add column if not exists overhead_items                  jsonb   not null default '[]',
  add column if not exists outstanding_balance_alert_threshold numeric(12, 2) not null default 2000,
  add column if not exists typical_active_orders_per_staff  integer not null default 4,
  add column if not exists contact_phone                   text    not null default '',
  add column if not exists contact_email                   text    not null default '',
  add column if not exists address                         text    not null default '',
  add column if not exists tax_id                           text    not null default '',
  add column if not exists invoice_prefix                   text    not null default 'INV';

comment on column public.settings.overhead_items is
  'Array of {id,name,amount} monthly overhead line items (rent, electricity, data, transport…). While non-empty, their sum replaces overhead_amount and is added to every order''s True Cost.';
comment on column public.settings.outstanding_balance_alert_threshold is
  'Dashboard alert fires when total outstanding balance across open orders exceeds this amount.';
comment on column public.settings.typical_active_orders_per_staff is
  'Reference workload used to flag a staff member as at/over capacity on the dashboard.';
