-- Technician time clock, immutable server timestamps, organization-scoped read access.
create table if not exists public.technician_time_entries (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 technician_id uuid not null references auth.users(id),
 site_id uuid references public.sites(id) on delete set null,
 work_type text not null default 'job' check (work_type in ('job','travel')),
 note text,
 clock_in_at timestamptz not null default now(),
 clock_out_at timestamptz,
 created_at timestamptz not null default now(),
 constraint valid_time_range check (clock_out_at is null or clock_out_at >= clock_in_at)
);
create unique index if not exists technician_one_open_shift on public.technician_time_entries(organization_id,technician_id) where clock_out_at is null;
create index if not exists technician_time_org_dates on public.technician_time_entries(organization_id,clock_in_at desc);
alter table public.technician_time_entries enable row level security;
grant select on public.technician_time_entries to authenticated;
create policy technician_time_read on public.technician_time_entries for select to authenticated using (
 (technician_id = (select auth.uid()) and public.has_org_role(organization_id,array['technician','inspector','owner','admin','manager','supervisor']))
 or public.has_org_role(organization_id,array['owner','admin','manager','supervisor'])
);
create or replace function public.clock_in_technician(p_org uuid,p_site uuid default null,p_work_type text default 'job',p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not public.has_org_role(p_org,array['technician','inspector','owner','admin','manager','supervisor']) then raise exception 'Not authorized to clock in'; end if;
 if p_work_type not in ('job','travel') then raise exception 'Invalid work type'; end if;
 if p_site is not null and not exists(select 1 from public.sites where id=p_site and organization_id=p_org) then raise exception 'Site is not in this organization'; end if;
 insert into public.technician_time_entries(organization_id,technician_id,site_id,work_type,note)
 values(p_org,auth.uid(),p_site,p_work_type,nullif(left(trim(coalesce(p_note,'')),500),''))
 returning id into v_id;
 return v_id;
exception when unique_violation then
 raise exception 'You already have an active shift. Clock out before starting another.';
end $$;
revoke all on function public.clock_in_technician(uuid,uuid,text,text) from public;
grant execute on function public.clock_in_technician(uuid,uuid,text,text) to authenticated;
create or replace function public.clock_out_technician(p_org uuid,p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not public.has_org_role(p_org,array['technician','inspector','owner','admin','manager','supervisor']) then raise exception 'Not authorized to clock out'; end if;
 update public.technician_time_entries
 set clock_out_at=greatest(now(),clock_in_at),
 note=coalesce(nullif(left(trim(coalesce(p_note,'')),500),''),note)
 where organization_id=p_org and technician_id=auth.uid() and clock_out_at is null
 returning id into v_id;
 if v_id is null then raise exception 'No active shift to clock out'; end if;
 return v_id;
end $$;
revoke all on function public.clock_out_technician(uuid,text) from public;
grant execute on function public.clock_out_technician(uuid,text) to authenticated;
create or replace function public.list_technician_timesheet(p_org uuid,p_days integer default 14)
returns table(id uuid,technician_email text,site_id uuid,work_type text,note text,clock_in_at timestamptz,clock_out_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not public.has_org_role(p_org,array['technician','inspector','owner','admin','manager','supervisor']) then raise exception 'Not authorized'; end if;
 return query
 select t.id, u.email::text,t.site_id,t.work_type,t.note,t.clock_in_at,t.clock_out_at
 from public.technician_time_entries t join auth.users u on u.id=t.technician_id
 where t.organization_id=p_org and (t.technician_id=auth.uid() or public.has_org_role(p_org,array['owner','admin','manager','supervisor']))
 and t.clock_in_at>=now()-make_interval(days=>least(greatest(coalesce(p_days,14),1),90))
 order by t.clock_in_at desc limit 2000;
end $$;
revoke all on function public.list_technician_timesheet(uuid,integer) from public;
grant execute on function public.list_technician_timesheet(uuid,integer) to authenticated;