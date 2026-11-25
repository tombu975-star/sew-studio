begin;
alter table public.rtw_products add column if not exists collection_name text not null default '', add column if not exists sku text, add column if not exists barcode text, add column if not exists archived_at timestamptz;
create unique index if not exists rtw_products_shop_sku_unique on public.rtw_products(shop_id,lower(sku)) where sku is not null;
create unique index if not exists rtw_products_shop_barcode_unique on public.rtw_products(shop_id,barcode) where barcode is not null;
commit;
