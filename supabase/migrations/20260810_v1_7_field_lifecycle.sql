-- PolyShield Asset IQ v1.7 - Lifecycle & ownership history
-- SAFE FOR EXISTING PROJECTS. Additive migration only; no existing rows are deleted.
begin;

alter table public.asset_dna
  add column if not exists lifecycle_status text not null default 'Active';

do $$ begin
  alter table public.asset_dna add constraint asset_dna_lifecycle_status_check
    check (lifecycle_status in ('Active','Out of Service','Decommissioned','Sold / Transferred','Replaced','Retired / Scrapped'));
exception when duplicate_object then null; end $$;

create table if not exists public.asset_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  event_date date not null default current_date,
  event_type text not null check (event_type in ('Status Change','Sale / Transfer','Decommissioned','Returned to Service','Replaced','Retired / Scrapped','Ownership Note')),
  lifecycle_status text not null default 'Active' check (lifecycle_status in ('Active','Out of Service','Decommissioned','Sold / Transferred','Replaced','Retired / Scrapped')),
  previous_owner text,
  new_owner text,
  counterparty text,
  reason text,
  disposition text,
  replacement_asset_tag text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_lifecycle_events_asset_date_idx on public.asset_lifecycle_events(asset_id, event_date desc, created_at desc);

grant select, insert, update, delete on public.asset_lifecycle_events to authenticated;
revoke all on public.asset_lifecycle_events from anon;
alter table public.asset_lifecycle_events enable row level security;

drop policy if exists asset_lifecycle_events_select on public.asset_lifecycle_events;
drop policy if exists asset_lifecycle_events_insert on public.asset_lifecycle_events;
drop policy if exists asset_lifecycle_events_update on public.asset_lifecycle_events;
drop policy if exists asset_lifecycle_events_delete on public.asset_lifecycle_events;
create policy asset_lifecycle_events_select on public.asset_lifecycle_events for select to authenticated using (public.is_org_member(organization_id));
create policy asset_lifecycle_events_insert on public.asset_lifecycle_events for insert to authenticated with check (public.is_org_member(organization_id));
create policy asset_lifecycle_events_update on public.asset_lifecycle_events for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy asset_lifecycle_events_delete on public.asset_lifecycle_events for delete to authenticated using (public.is_org_admin(organization_id));

drop trigger if exists asset_lifecycle_events_touch_updated_at on public.asset_lifecycle_events;
create trigger asset_lifecycle_events_touch_updated_at before update on public.asset_lifecycle_events for each row execute function public.touch_updated_at();

insert into public.polyshield_migrations(version, description)
values ('1.7.0', 'Lifecycle and ownership history plus field-app foundation')
on conflict (version) do nothing;

commit;
