-- One account per email address and one account per phone number.
--
--  • Gmail ignores dots and "+tags" (jo.hn+shop@gmail.com is the same inbox as
--    john@gmail.com, and googlemail.com is the same as gmail.com), so those
--    variants count as ONE address.
--  • Phone numbers are compared by digits only, so "024 555 0101",
--    "0245550101" and "+233 24 555 0101" count as ONE number.
--  • The rule covers shop owners, team members AND freelancers together: an
--    email or number used by one of them can't be used by another.
--
-- Rows that already exist are left alone (even if they happen to share a
-- number). The rule applies whenever an email/phone is added or CHANGED.

create or replace function public.normalize_email(e text) returns text
language plpgsql immutable as $$
declare
  v text := lower(btrim(coalesce(e, '')));
  local_part text;
  domain text;
begin
  if v = '' or position('@' in v) = 0 then
    return nullif(v, '');
  end if;
  local_part := split_part(v, '@', 1);
  domain := split_part(v, '@', 2);
  if domain in ('gmail.com', 'googlemail.com') then
    local_part := replace(split_part(local_part, '+', 1), '.', '');
    domain := 'gmail.com';
  end if;
  return local_part || '@' || domain;
end;
$$;

create or replace function public.normalize_phone(p text) returns text
language plpgsql immutable as $$
declare
  d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if d = '' then return null; end if;
  if left(d, 2) = '00' then d := substr(d, 3); end if;          -- 00233… → 233…
  if left(d, 1) = '0' and length(d) = 10 then d := '233' || substr(d, 2); end if; -- 024… → 23324…
  return d;
end;
$$;

alter table public.profiles
  add column if not exists email_key text,
  add column if not exists phone_key text;
alter table public.freelancer_profiles
  add column if not exists email_key text,
  add column if not exists phone_key text;

-- Fill in the keys for existing rows (before the check below exists).
update public.profiles
   set email_key = public.normalize_email(email), phone_key = public.normalize_phone(phone);
update public.freelancer_profiles
   set email_key = public.normalize_email(email), phone_key = public.normalize_phone(phone);

create index if not exists profiles_email_key_idx on public.profiles (email_key);
create index if not exists profiles_phone_key_idx on public.profiles (phone_key) where phone_key is not null;
create index if not exists freelancer_profiles_email_key_idx on public.freelancer_profiles (email_key);
create index if not exists freelancer_profiles_phone_key_idx on public.freelancer_profiles (phone_key) where phone_key is not null;

-- Runs on both tables. SECURITY DEFINER so it can see every studio's rows
-- (normal users can only see their own studio through RLS).
create or replace function public.enforce_unique_identity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.email_key := public.normalize_email(new.email);
  new.phone_key := public.normalize_phone(new.phone);

  if tg_op = 'INSERT' or new.email_key is distinct from old.email_key then
    if exists (select 1 from public.profiles where email_key = new.email_key and id <> new.id)
       or exists (select 1 from public.freelancer_profiles where email_key = new.email_key and id <> new.id) then
      raise exception 'email_taken' using errcode = '23505';
    end if;
  end if;

  if new.phone_key is not null
     and (tg_op = 'INSERT' or new.phone_key is distinct from old.phone_key) then
    if exists (select 1 from public.profiles where phone_key = new.phone_key and id <> new.id)
       or exists (select 1 from public.freelancer_profiles where phone_key = new.phone_key and id <> new.id) then
      raise exception 'phone_taken' using errcode = '23505';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_unique_identity on public.profiles;
create trigger profiles_unique_identity
  before insert or update of email, phone on public.profiles
  for each row execute function public.enforce_unique_identity();

drop trigger if exists freelancer_profiles_unique_identity on public.freelancer_profiles;
create trigger freelancer_profiles_unique_identity
  before insert or update of email, phone on public.freelancer_profiles
  for each row execute function public.enforce_unique_identity();

-- Heads-up about numbers/emails that were ALREADY shared before this rule.
do $$
declare dupes integer;
begin
  select count(*) into dupes from (
    select phone_key from (
      select phone_key from public.profiles where phone_key is not null
      union all
      select phone_key from public.freelancer_profiles where phone_key is not null
    ) x group by phone_key having count(*) > 1
  ) y;
  if dupes > 0 then
    raise notice '% phone number(s) are already shared by more than one account. They keep working, but whoever edits that number next must pick a unique one.', dupes;
  end if;
end $$;
