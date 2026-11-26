begin;
alter table public.settings add column overhead_allocation_method text not null default 'material' check(overhead_allocation_method in ('material','revenue')), add column overhead_revenue_basis numeric not null default 0 check(overhead_revenue_basis>=0);
alter table public.orders add column overhead_allocation_method text, add column overhead_rate_snapshot numeric, add column overhead_amount_snapshot numeric;
commit;
