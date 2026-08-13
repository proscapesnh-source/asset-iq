-- PolyShield Asset IQ v2.4 - multi-site organizations + branding
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  site_code text,
  address text,
  city text,
  state text,
  postal_code text,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.organizations add column if not exists logo_storage_path text;
alter table public.organizations add column if not exists report_display_name text;
alter table public.assets add column if not exists site_id uuid references public.sites(id) on delete set null;
create index if not exists sites_org_idx on public.sites(organization_id, name);
create index if not exists assets_site_idx on public.assets(site_id);

drop trigger if exists sites_touch_updated_at on public.sites;
create trigger sites_touch_updated_at before update on public.sites
for each row execute function public.touch_updated_at();

alter table public.sites enable row level security;
drop policy if exists sites_select on public.sites;
drop policy if exists sites_insert on public.sites;
drop policy if exists sites_update on public.sites;
drop policy if exists sites_delete on public.sites;
create policy sites_select on public.sites for select to authenticated using (public.is_org_member(organization_id));
create policy sites_insert on public.sites for insert to authenticated with check (public.is_org_member(organization_id));
create policy sites_update on public.sites for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy sites_delete on public.sites for delete to authenticated using (public.is_org_member(organization_id));

-- Convert existing facility names into formal sites without losing legacy data.
insert into public.sites (organization_id, name)
select distinct organization_id, trim(facility)
from public.assets
where nullif(trim(facility), '') is not null
on conflict (organization_id, name) do nothing;

update public.assets a
set site_id = s.id
from public.sites s
where a.site_id is null
  and s.organization_id = a.organization_id
  and lower(trim(s.name)) = lower(trim(a.facility));
