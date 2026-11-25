begin;
alter table public.rtw_products add column if not exists gallery_images jsonb not null default '[]'::jsonb;
commit;
