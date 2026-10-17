-- PolyShield Integration Hub: safe configuration foundation, no secrets in client tables.
create table if not exists public.integration_connections (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 provider text not null check (provider in ('zoho','salesforce','hubspot','maintainx','upkeep','custom')),
 display_name text not null,
 direction text not null default 'two_way' check (direction in ('two_way','incoming','outgoing')),
 status text not null default 'setup_required' check (status in ('setup_required','connected','paused','error')),
 permissions jsonb not null default '{"customers":{"read":true,"write":false},"sites":{"read":true,"write":false},"assets":{"read":true,"write":false},"work_orders":{"read":true,"write":false},"inspections":{"read":false,"write":false}}'::jsonb,
 field_mapping jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id,provider,display_name)
);
create table if not exists public.integration_record_links (
 id uuid primary key default gen_random_uuid(),
 connection_id uuid not null references public.integration_connections(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 entity_type text not null check (entity_type in ('customer','site','asset','work_order','inspection')),
 local_id uuid not null,
 remote_id text not null,
 last_synced_at timestamptz,
 unique(connection_id,entity_type,remote_id),
 unique(connection_id,entity_type,local_id)
);
create table if not exists public.integration_sync_events (
 id uuid primary key default gen_random_uuid(),
 connection_id uuid not null references public.integration_connections(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 direction text not null check(direction in ('incoming','outgoing')),
 entity_type text not null,
 entity_id text,
 status text not null default 'pending' check(status in ('pending','processed','failed','skipped')),
 message text,
 created_at timestamptz not null default now()
);
create index if not exists integration_links_org_idx on public.integration_record_links(organization_id);
create index if not exists integration_events_org_idx on public.integration_sync_events(organization_id,created_at desc);
alter table public.integration_connections enable row level security;
alter table public.integration_record_links enable row level security;
alter table public.integration_sync_events enable row level security;
create policy integration_connections_select on public.integration_connections for select to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager','supervisor']));
create policy integration_connections_insert on public.integration_connections for insert to authenticated with check (public.has_org_role(organization_id,array['owner','admin']));
create policy integration_connections_update on public.integration_connections for update to authenticated using (public.has_org_role(organization_id,array['owner','admin'])) with check (public.has_org_role(organization_id,array['owner','admin']));
create policy integration_connections_delete on public.integration_connections for delete to authenticated using (public.has_org_role(organization_id,array['owner','admin']));
create policy integration_links_select on public.integration_record_links for select to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager','supervisor']));
create policy integration_events_select on public.integration_sync_events for select to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager','supervisor']));
-- Only trusted backend workers (service role) can create links or sync events.
create or replace function public.validate_integration_connection()
returns trigger language plpgsql set search_path='' as $$
begin
 if not (new.permissions ? 'customers' and new.permissions ? 'sites' and new.permissions ? 'assets' and new.permissions ? 'work_orders' and new.permissions ? 'inspections') then
  raise exception 'All entity permissions must be specified';
 end if;
 if new.status='connected' and (tg_op='INSERT' or old.status is distinct from 'connected') then
  raise exception 'A backend connector must verify credentials before activating a connection';
 end if;
 if tg_op='UPDATE' and new.organization_id is distinct from old.organization_id then
  raise exception 'Connection organization cannot change';
 end if;
 new.updated_at=now();
 return new;
end $$;
create trigger integration_connection_guard before insert or update on public.integration_connections
for each row execute function public.validate_integration_connection();