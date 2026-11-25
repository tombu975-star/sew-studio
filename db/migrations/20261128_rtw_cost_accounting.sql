begin;
alter table public.rtw_products add column if not exists unit_cost numeric(12,2) check(unit_cost>=0);
alter table public.rtw_orders add column if not exists unit_cost_snapshot numeric(12,2) check(unit_cost_snapshot>=0);
commit;
