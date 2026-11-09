-- Helper functions used throughout RLS policies (0003_rls.sql). Each is
-- `security definer` so it reads public.profiles/freelancer_profiles with
-- the function owner's privileges rather than the calling user's — without
-- this, a policy on `profiles` that calls a function which selects from
-- `profiles` would recurse back into the same RLS check and either loop
-- or (more likely) just return nothing.

create or replace function public.current_shop_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select shop_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_shop_member(target_shop_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and shop_id = target_shop_id
  )
$$;

create or replace function public.is_freelancer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.freelancer_profiles where id = auth.uid())
$$;

-- True for madam (owner) and trainer — the two roles the app treats as
-- "management" for trainee/curriculum/settings-type data.
create or replace function public.is_shop_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('madam', 'trainer')
  )
$$;
