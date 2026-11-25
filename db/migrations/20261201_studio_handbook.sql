begin;
create table if not exists private.studio_handbooks (
 shop_id uuid primary key references public.shops(id) on delete cascade,
 about text not null default '',
 sop text not null default '',
 updated_at timestamptz not null default now()
);
commit;
