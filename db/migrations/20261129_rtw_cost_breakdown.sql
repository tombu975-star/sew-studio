begin;
alter table public.rtw_products add column if not exists cost_breakdown jsonb, add column if not exists target_margin numeric(5,2);
commit;
