begin;
alter table public.rtw_products add column if not exists sale_price numeric(12,2), add column if not exists sale_start timestamptz, add column if not exists sale_end timestamptz, add column if not exists low_stock_threshold integer not null default 3;
alter table public.rtw_products add constraint rtw_sale_valid check (sale_price is null or (sale_price>0 and sale_price<price and sale_start is not null and sale_end is not null and sale_end>sale_start));
alter table public.rtw_products add constraint rtw_threshold_valid check (low_stock_threshold between 0 and 100000);
commit;
