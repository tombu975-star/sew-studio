begin;
create table private.studio_sops (
 id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete cascade,
 title text not null, department text not null, instructions text not null, published boolean not null default false,
 revision integer not null default 1, updated_at timestamptz not null default now()
);
create index on private.studio_sops(shop_id);
create table private.studio_sop_acknowledgements (
 sop_id uuid not null references private.studio_sops(id) on delete cascade,
 revision integer not null, user_id uuid not null references auth.users(id) on delete cascade,
 acknowledged_at timestamptz not null default now(), primary key(sop_id,revision,user_id)
);
commit;
