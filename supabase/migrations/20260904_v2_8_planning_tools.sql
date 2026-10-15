-- PolyShield Asset IQ v2.8: repair budget and purchase-order tracking
alter table public.work_orders add column if not exists estimated_cost numeric(14,2);
alter table public.work_orders add column if not exists approved_budget numeric(14,2);
alter table public.work_orders add column if not exists vendor_name text;
alter table public.work_orders add column if not exists purchase_order_number text;

alter table public.work_orders drop constraint if exists work_orders_estimated_cost_nonnegative;
alter table public.work_orders add constraint work_orders_estimated_cost_nonnegative check (estimated_cost is null or estimated_cost >= 0);
alter table public.work_orders drop constraint if exists work_orders_approved_budget_nonnegative;
alter table public.work_orders add constraint work_orders_approved_budget_nonnegative check (approved_budget is null or approved_budget >= 0);
