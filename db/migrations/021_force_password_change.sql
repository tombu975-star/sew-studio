-- Temporary passwords issued by an owner must be replaced at first sign-in.
alter table private.credentials
  add column if not exists must_change_password boolean not null default false;
