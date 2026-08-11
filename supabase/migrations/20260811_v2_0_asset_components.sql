-- PolyShield Asset IQ v2.0 - vessel/component hierarchy
create table if not exists public.asset_components (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  component_tag text,
  name text not null,
  component_type text not null default 'Other',
  location text,
  manufacturer text,
  model text,
  serial_number text,
  condition text not null default 'Good' check (condition in ('Excellent','Good','Fair','Poor','Critical')),
  health_score integer not null default 85 check (health_score between 0 and 100),
  status text not null default 'Good',
  notes text,
  photo_storage_path text,
  ai_confidence integer,
  ai_identified boolean not null default false,
  ai_visible_text jsonb not null default '[]'::jsonb,
  lifecycle_status text not null default 'active',
  installed_at timestamptz,
  removed_at timestamptz,
  removal_reason text,
  replacement_component_id uuid references public.asset_components(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_components_org_asset_idx
  on public.asset_components(organization_id, asset_id);

alter table public.asset_components enable row level security;

drop policy if exists asset_components_select on public.asset_components;
create policy asset_components_select on public.asset_components
for select using (public.is_org_member(organization_id));

drop policy if exists asset_components_insert on public.asset_components;
create policy asset_components_insert on public.asset_components
for insert with check (public.is_org_member(organization_id));

drop policy if exists asset_components_update on public.asset_components;
create policy asset_components_update on public.asset_components
for update using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists asset_components_delete on public.asset_components;
create policy asset_components_delete on public.asset_components
for delete using (public.is_org_admin(organization_id));

grant select, insert, update on public.asset_components to authenticated;
grant delete on public.asset_components to authenticated;
