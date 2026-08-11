-- PolyShield Asset IQ v2.2 - component changeout lifecycle
alter table public.asset_components
  add column if not exists lifecycle_status text not null default 'active',
  add column if not exists installed_at timestamptz,
  add column if not exists removed_at timestamptz,
  add column if not exists removal_reason text,
  add column if not exists replacement_component_id uuid references public.asset_components(id) on delete set null;

create index if not exists asset_components_asset_lifecycle_idx
  on public.asset_components(asset_id, lifecycle_status);
