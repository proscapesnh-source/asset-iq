-- PolyShield Asset IQ v1.5 - Production Database Foundation
-- SAFE FOR EXISTING PROJECTS. This migration does not drop or truncate application tables.
-- It is idempotent and may be run again if the first attempt is interrupted.
-- Run in Supabase SQL Editor while logged in as the project owner.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Migration registry (service/owner-readable; not exposed to application users)
-- ---------------------------------------------------------------------------
create table if not exists public.polyshield_migrations (
  version text primary key,
  description text not null,
  applied_at timestamptz not null default now()
);
revoke all on table public.polyshield_migrations from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Defensive helper functions. Re-create so this migration also repairs older
-- projects where the function permissions were incomplete.
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_admin(uuid) to authenticated;

-- Existing setup.sql normally provides this. Re-create defensively.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Knowledge Center tables: create only when absent. Existing data is preserved.
-- ---------------------------------------------------------------------------
create table if not exists public.coating_systems (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  manufacturer text,
  product_name text not null,
  coating_family text,
  color text,
  dft_range text,
  service_environment text,
  surface_prep text,
  visual_characteristics text,
  failure_modes text,
  repair_guidance text,
  reference_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.failure_modes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text,
  visual_indicators text,
  typical_causes text,
  severity_guidance text,
  verification text,
  repair_guidance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repair_methods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  compatible_families text,
  surface_prep text,
  procedure text,
  qa_qc text,
  limitations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_standards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  source text,
  version text,
  scope text,
  guidance text,
  reference_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coating_systems_org_idx on public.coating_systems(organization_id, created_at desc);
create index if not exists failure_modes_org_idx on public.failure_modes(organization_id, created_at desc);
create index if not exists repair_methods_org_idx on public.repair_methods(organization_id, created_at desc);
create index if not exists inspection_standards_org_idx on public.inspection_standards(organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- API privileges. RLS and GRANT are both required by PostgREST/Supabase.
-- The v1.4 error "permission denied for table coating_systems" is repaired here.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.coating_systems to authenticated;
grant select, insert, update, delete on table public.failure_modes to authenticated;
grant select, insert, update, delete on table public.repair_methods to authenticated;
grant select, insert, update, delete on table public.inspection_standards to authenticated;

-- Keep anonymous access off these organization-scoped knowledge tables.
revoke all on table public.coating_systems from anon;
revoke all on table public.failure_modes from anon;
revoke all on table public.repair_methods from anon;
revoke all on table public.inspection_standards from anon;

alter table public.coating_systems enable row level security;
alter table public.failure_modes enable row level security;
alter table public.repair_methods enable row level security;
alter table public.inspection_standards enable row level security;

-- Members can read company knowledge. Only owner/admin can change it.
drop policy if exists coating_systems_select on public.coating_systems;
drop policy if exists coating_systems_insert on public.coating_systems;
drop policy if exists coating_systems_update on public.coating_systems;
drop policy if exists coating_systems_delete on public.coating_systems;
create policy coating_systems_select on public.coating_systems for select to authenticated
  using (public.is_org_member(organization_id));
create policy coating_systems_insert on public.coating_systems for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy coating_systems_update on public.coating_systems for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy coating_systems_delete on public.coating_systems for delete to authenticated
  using (public.is_org_admin(organization_id));

drop policy if exists failure_modes_select on public.failure_modes;
drop policy if exists failure_modes_insert on public.failure_modes;
drop policy if exists failure_modes_update on public.failure_modes;
drop policy if exists failure_modes_delete on public.failure_modes;
create policy failure_modes_select on public.failure_modes for select to authenticated
  using (public.is_org_member(organization_id));
create policy failure_modes_insert on public.failure_modes for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy failure_modes_update on public.failure_modes for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy failure_modes_delete on public.failure_modes for delete to authenticated
  using (public.is_org_admin(organization_id));

drop policy if exists repair_methods_select on public.repair_methods;
drop policy if exists repair_methods_insert on public.repair_methods;
drop policy if exists repair_methods_update on public.repair_methods;
drop policy if exists repair_methods_delete on public.repair_methods;
create policy repair_methods_select on public.repair_methods for select to authenticated
  using (public.is_org_member(organization_id));
create policy repair_methods_insert on public.repair_methods for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy repair_methods_update on public.repair_methods for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy repair_methods_delete on public.repair_methods for delete to authenticated
  using (public.is_org_admin(organization_id));

drop policy if exists inspection_standards_select on public.inspection_standards;
drop policy if exists inspection_standards_insert on public.inspection_standards;
drop policy if exists inspection_standards_update on public.inspection_standards;
drop policy if exists inspection_standards_delete on public.inspection_standards;
create policy inspection_standards_select on public.inspection_standards for select to authenticated
  using (public.is_org_member(organization_id));
create policy inspection_standards_insert on public.inspection_standards for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy inspection_standards_update on public.inspection_standards for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy inspection_standards_delete on public.inspection_standards for delete to authenticated
  using (public.is_org_admin(organization_id));

-- Updated-at triggers (safe to replace; no row data is touched).
drop trigger if exists coating_systems_touch_updated_at on public.coating_systems;
create trigger coating_systems_touch_updated_at before update on public.coating_systems
for each row execute function public.touch_updated_at();
drop trigger if exists failure_modes_touch_updated_at on public.failure_modes;
create trigger failure_modes_touch_updated_at before update on public.failure_modes
for each row execute function public.touch_updated_at();
drop trigger if exists repair_methods_touch_updated_at on public.repair_methods;
create trigger repair_methods_touch_updated_at before update on public.repair_methods
for each row execute function public.touch_updated_at();
drop trigger if exists inspection_standards_touch_updated_at on public.inspection_standards;
create trigger inspection_standards_touch_updated_at before update on public.inspection_standards
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Ensure existing core tables retain their application privileges. This does
-- not bypass RLS; it only prevents schema/table privilege drift from breaking UI.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['organizations','organization_members','assets','asset_photos','inspections','inspection_photos','work_orders'] loop
    if to_regclass('public.' || t) is not null then
      execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    end if;
  end loop;
end $$;

insert into public.polyshield_migrations(version, description)
values ('1.5.0', 'Database foundation: knowledge grants/RLS, role helpers, migration registry')
on conflict (version) do update
set description = excluded.description,
    applied_at = now();

commit;

-- ---------------------------------------------------------------------------
-- POST-MIGRATION CHECKS (read-only)
-- Run these SELECTs separately if you want to verify the migration.
-- select * from public.polyshield_migrations order by applied_at desc;
-- select count(*) as assets_preserved from public.assets;
-- select count(*) as inspections_preserved from public.inspections;
-- select tablename, rowsecurity from pg_tables where schemaname='public'
--   and tablename in ('coating_systems','failure_modes','repair_methods','inspection_standards');
