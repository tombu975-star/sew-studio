-- Shared, persistent login throttling (replaces the per-process in-memory map).
-- One row per throttle key (e.g. "acct:<email>" or "ip:<address>").
create table if not exists private.login_attempts (
  key        text primary key,
  failures   integer     not null default 0,
  reset_at   timestamptz not null
);
create index if not exists login_attempts_reset_at_idx on private.login_attempts (reset_at);
