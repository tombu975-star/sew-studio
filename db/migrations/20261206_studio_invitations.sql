begin;
create table private.studio_invitations (
 id uuid primary key default gen_random_uuid(),
 shop_id uuid not null references public.shops(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 invited_by uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('staff','trainer','trainee')),
 status text not null default 'pending' check(status in ('pending','accepted_pending_activation','declined','revoked')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',
 responded_at timestamptz
);
create unique index studio_invitation_pending_unique on private.studio_invitations(shop_id,user_id) where status in ('pending','accepted_pending_activation');
commit;
