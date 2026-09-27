-- Business policies on `settings` — additive migration for databases
-- created before this column set existed. Safe to run multiple times.
-- Adds: deposit / rush-fee / quote-validity terms, fittings & alterations
-- terms, and the free-text policy notes shown verbatim on the client portal.

alter table public.settings
  add column if not exists deposit_percent            numeric(5, 2) not null default 50,
  add column if not exists rush_fee_percent           numeric(5, 2) not null default 25,
  add column if not exists quote_valid_days           integer not null default 14,
  add column if not exists full_balance_before_pickup boolean not null default true,
  add column if not exists fittings_included          integer not null default 2,
  add column if not exists alterations_window_days    integer not null default 14,
  add column if not exists deposit_policy_text        text not null default '',
  add column if not exists alterations_policy_text    text not null default '',
  add column if not exists cancellation_policy_text   text not null default '';
