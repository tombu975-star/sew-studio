begin;
create table if not exists public.rtw_stock_movements (
 id bigint generated always as identity primary key,
 shop_id uuid not null, product_id uuid not null, variant_id uuid not null,
 quantity_before integer not null, quantity_after integer not null,
 reason text not null, created_at timestamptz not null default now()
);
create index if not exists rtw_stock_movements_shop_date on public.rtw_stock_movements(shop_id,created_at desc,id desc);
create or replace function private.rtw_record_stock() returns trigger language plpgsql as $$
declare prior integer; owner_shop uuid;
begin
 if TG_OP='INSERT' then prior:=0; else prior:=OLD.stock; end if;
 if TG_OP='UPDATE' and prior=NEW.stock then return NEW; end if;
 select shop_id into strict owner_shop from public.rtw_products where id=NEW.product_id;
 insert into public.rtw_stock_movements(shop_id,product_id,variant_id,quantity_before,quantity_after,reason)
 values(owner_shop,NEW.product_id,NEW.id,prior,NEW.stock,case when TG_OP='INSERT' then 'Initial stock' else coalesce(nullif(current_setting('rtw.stock_reason',true),''),'Stock change') end);
 return NEW;
end $$;
drop trigger if exists rtw_stock_ledger on public.rtw_variants;
create trigger rtw_stock_ledger after insert or update of stock on public.rtw_variants for each row execute function private.rtw_record_stock();
commit;
