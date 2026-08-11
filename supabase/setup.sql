-- PolyShield Asset IQ v1 - clean Supabase setup
-- Run this ONCE in a brand-new Supabase project: SQL Editor -> New query -> paste all -> Run.

create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','inspector','viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_tag text not null,
  name text not null,
  asset_type text not null default 'Other',
  facility text,
  location text,
  contents text,
  manufacturer text,
  model text,
  serial_number text,
  install_date date,
  last_inspection_date date,
  next_inspection_date date,
  health_score integer not null default 85 check (health_score between 0 and 100),
  status text not null default 'Good' check (status in ('Good','Monitor','Repair','Critical')),
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, asset_tag)
);

create table public.asset_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  storage_path text not null,
  file_name text,
  caption text,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  inspector_id uuid references auth.users(id) on delete set null,
  inspected_at timestamptz not null default now(),
  condition text not null check (condition in ('Excellent','Good','Fair','Poor','Critical')),
  liner_present text not null default 'Unknown' check (liner_present in ('Yes','No','Unknown')),
  action_required text not null default 'None' check (action_required in ('None','Monitor','Repair','Engineering Review')),
  health_score integer not null check (health_score between 0 and 100),
  notes text,
  created_at timestamptz not null default now()
);

create table public.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  storage_path text not null,
  file_name text,
  title text,
  category text not null default 'Interior',
  notes text,
  annotation_note text,
  created_at timestamptz not null default now()
);

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  inspection_id uuid references public.inspections(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Critical')),
  status text not null default 'Open' check (status in ('Open','Assigned','In Progress','Complete')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assets_org_idx on public.assets(organization_id);
create index inspections_asset_idx on public.inspections(asset_id, inspected_at desc);
create index work_orders_asset_idx on public.work_orders(asset_id, created_at desc);
create index asset_photos_asset_idx on public.asset_photos(asset_id, created_at desc);
create index inspection_photos_inspection_idx on public.inspection_photos(inspection_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger assets_touch_updated_at before update on public.assets
for each row execute function public.touch_updated_at();
create trigger work_orders_touch_updated_at before update on public.work_orders
for each row execute function public.touch_updated_at();

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

create or replace function public.bootstrap_my_organization(organization_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_org uuid;
  new_org uuid;
  safe_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select organization_id into existing_org
  from public.organization_members
  where user_id = auth.uid()
  order by created_at asc
  limit 1;

  if existing_org is not null then
    return existing_org;
  end if;

  safe_name := nullif(trim(organization_name), '');
  if safe_name is null then safe_name := 'My Organization'; end if;

  insert into public.organizations(name) values (safe_name) returning id into new_org;
  insert into public.organization_members(organization_id, user_id, role)
  values (new_org, auth.uid(), 'owner');

  return new_org;
end;
$$;

revoke all on function public.bootstrap_my_organization(text) from public;
grant execute on function public.bootstrap_my_organization(text) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.assets enable row level security;
alter table public.asset_photos enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_photos enable row level security;
alter table public.work_orders enable row level security;

create policy organizations_select on public.organizations for select to authenticated
using (public.is_org_member(id));

create policy members_select on public.organization_members for select to authenticated
using (user_id = auth.uid() or public.is_org_member(organization_id));

create policy assets_select on public.assets for select to authenticated using (public.is_org_member(organization_id));
create policy assets_insert on public.assets for insert to authenticated with check (public.is_org_member(organization_id));
create policy assets_update on public.assets for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy assets_delete on public.assets for delete to authenticated using (public.is_org_member(organization_id));

create policy asset_photos_select on public.asset_photos for select to authenticated using (public.is_org_member(organization_id));
create policy asset_photos_insert on public.asset_photos for insert to authenticated with check (public.is_org_member(organization_id));
create policy asset_photos_update on public.asset_photos for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy asset_photos_delete on public.asset_photos for delete to authenticated using (public.is_org_member(organization_id));

create policy inspections_select on public.inspections for select to authenticated using (public.is_org_member(organization_id));
create policy inspections_insert on public.inspections for insert to authenticated with check (public.is_org_member(organization_id));
create policy inspections_update on public.inspections for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy inspections_delete on public.inspections for delete to authenticated using (public.is_org_member(organization_id));

create policy inspection_photos_select on public.inspection_photos for select to authenticated using (public.is_org_member(organization_id));
create policy inspection_photos_insert on public.inspection_photos for insert to authenticated with check (public.is_org_member(organization_id));
create policy inspection_photos_update on public.inspection_photos for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy inspection_photos_delete on public.inspection_photos for delete to authenticated using (public.is_org_member(organization_id));

create policy work_orders_select on public.work_orders for select to authenticated using (public.is_org_member(organization_id));
create policy work_orders_insert on public.work_orders for insert to authenticated with check (public.is_org_member(organization_id));
create policy work_orders_update on public.work_orders for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy work_orders_delete on public.work_orders for delete to authenticated using (public.is_org_member(organization_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inspection-photos',
  'inspection-photos',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_member_select on storage.objects for select to authenticated
using (
  bucket_id = 'inspection-photos'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy storage_member_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'inspection-photos'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy storage_member_update on storage.objects for update to authenticated
using (
  bucket_id = 'inspection-photos'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'inspection-photos'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy storage_member_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'inspection-photos'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);
