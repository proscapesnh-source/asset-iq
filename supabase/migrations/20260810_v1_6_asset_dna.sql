-- PolyShield Asset IQ v1.6 - Asset DNA + service history
-- SAFE FOR EXISTING PROJECTS. No existing rows are deleted or replaced.
begin;

create table if not exists public.asset_dna (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null unique references public.assets(id) on delete cascade,
  record_mode text not null default 'Legacy / Existing' check (record_mode in ('Legacy / Existing','Known / New','Rehabilitated Baseline')),
  construction_material text,
  capacity text,
  design_pressure text,
  design_temperature text,
  service_environment text,
  original_coating_family text,
  original_coating_manufacturer text,
  original_coating_product text,
  original_coating_date date,
  original_dft text,
  original_surface_prep text,
  current_coating_family text,
  current_coating_manufacturer text,
  current_coating_product text,
  current_coating_date date,
  current_dft text,
  current_surface_prep text,
  coating_record_status text not null default 'Unknown' check (coating_record_status in ('Documented','Inspector Confirmed','Customer Reported','AI Inferred','Unknown')),
  construction_record_status text not null default 'Unknown' check (construction_record_status in ('Documented','Inspector Confirmed','Customer Reported','AI Inferred','Unknown')),
  baseline_date date,
  baseline_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_service_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  event_date date not null default current_date,
  event_type text not null check (event_type in ('Original Installation','Inspection','Repair','Rehabilitation','Recoat','Component Replacement','Other')),
  area text,
  defect_found text,
  coating_family text,
  manufacturer text,
  product_name text,
  surface_prep text,
  dft text,
  contractor text,
  source_status text not null default 'Documented' check (source_status in ('Documented','Inspector Confirmed','Customer Reported','AI Inferred','Unknown')),
  establishes_baseline boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_dna_org_asset_idx on public.asset_dna(organization_id, asset_id);
create index if not exists asset_service_events_asset_date_idx on public.asset_service_events(asset_id, event_date desc, created_at desc);

grant select, insert, update, delete on public.asset_dna to authenticated;
grant select, insert, update, delete on public.asset_service_events to authenticated;
revoke all on public.asset_dna from anon;
revoke all on public.asset_service_events from anon;

alter table public.asset_dna enable row level security;
alter table public.asset_service_events enable row level security;

drop policy if exists asset_dna_select on public.asset_dna;
drop policy if exists asset_dna_insert on public.asset_dna;
drop policy if exists asset_dna_update on public.asset_dna;
drop policy if exists asset_dna_delete on public.asset_dna;
create policy asset_dna_select on public.asset_dna for select to authenticated using (public.is_org_member(organization_id));
create policy asset_dna_insert on public.asset_dna for insert to authenticated with check (public.is_org_member(organization_id));
create policy asset_dna_update on public.asset_dna for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy asset_dna_delete on public.asset_dna for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists asset_service_events_select on public.asset_service_events;
drop policy if exists asset_service_events_insert on public.asset_service_events;
drop policy if exists asset_service_events_update on public.asset_service_events;
drop policy if exists asset_service_events_delete on public.asset_service_events;
create policy asset_service_events_select on public.asset_service_events for select to authenticated using (public.is_org_member(organization_id));
create policy asset_service_events_insert on public.asset_service_events for insert to authenticated with check (public.is_org_member(organization_id));
create policy asset_service_events_update on public.asset_service_events for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy asset_service_events_delete on public.asset_service_events for delete to authenticated using (public.is_org_admin(organization_id));

drop trigger if exists asset_dna_touch_updated_at on public.asset_dna;
create trigger asset_dna_touch_updated_at before update on public.asset_dna for each row execute function public.touch_updated_at();
drop trigger if exists asset_service_events_touch_updated_at on public.asset_service_events;
create trigger asset_service_events_touch_updated_at before update on public.asset_service_events for each row execute function public.touch_updated_at();

insert into public.polyshield_migrations(version, description)
values ('1.6.0', 'Asset DNA and verified service/repair history')
on conflict (version) do nothing;

commit;
