-- PolyShield Asset IQ v1.9 — QR Tag Production Requests
-- Additive migration. Does not delete or alter existing asset history.
begin;

create table if not exists public.qr_tag_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  material text not null check (material in ('Industrial Vinyl Sticker','Laminated Outdoor Sticker','Anodized Aluminum Plaque','Stainless Steel Plaque')),
  tag_size text not null,
  quantity integer not null default 1 check (quantity between 1 and 500),
  include_asset_name boolean not null default true,
  include_organization_name boolean not null default true,
  asset_name_snapshot text,
  asset_tag_snapshot text,
  qr_url text not null,
  notes text,
  status text not null default 'Submitted' check (status in ('Submitted','Quoted','Approved','In Production','Shipped','Delivered','Cancelled')),
  vendor_reference text,
  unit_price numeric(12,2),
  shipping_amount numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists qr_tag_orders_org_created_idx on public.qr_tag_orders(organization_id, created_at desc);
create index if not exists qr_tag_orders_asset_idx on public.qr_tag_orders(asset_id, created_at desc);

grant select, insert, update on public.qr_tag_orders to authenticated;
revoke all on public.qr_tag_orders from anon;
alter table public.qr_tag_orders enable row level security;

drop policy if exists qr_tag_orders_select on public.qr_tag_orders;
create policy qr_tag_orders_select on public.qr_tag_orders for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists qr_tag_orders_insert on public.qr_tag_orders;
create policy qr_tag_orders_insert on public.qr_tag_orders for insert to authenticated
with check (public.is_org_member(organization_id) and (requested_by is null or requested_by = auth.uid()));

drop policy if exists qr_tag_orders_update on public.qr_tag_orders;
create policy qr_tag_orders_update on public.qr_tag_orders for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop trigger if exists qr_tag_orders_touch_updated_at on public.qr_tag_orders;
create trigger qr_tag_orders_touch_updated_at before update on public.qr_tag_orders
for each row execute function public.touch_updated_at();

insert into public.polyshield_migrations(version, description)
values ('1.9.0', 'Print-ready QR tags and asset-linked QR tag production requests')
on conflict (version) do nothing;

commit;
