alter table public.technician_time_entries
 add column if not exists clock_in_lat double precision,
 add column if not exists clock_in_lon double precision,
 add column if not exists clock_in_accuracy_m double precision,
 add column if not exists clock_out_lat double precision,
 add column if not exists clock_out_lon double precision,
 add column if not exists clock_out_accuracy_m double precision;
alter table public.technician_time_entries
 add constraint time_in_gps_valid check ((clock_in_lat is null and clock_in_lon is null) or (clock_in_lat between -90 and 90 and clock_in_lon between -180 and 180)),
 add constraint time_out_gps_valid check ((clock_out_lat is null and clock_out_lon is null) or (clock_out_lat between -90 and 90 and clock_out_lon between -180 and 180)),
 add constraint time_accuracy_valid check ((clock_in_accuracy_m is null or clock_in_accuracy_m between 0 and 100000) and (clock_out_accuracy_m is null or clock_out_accuracy_m between 0 and 100000));
create or replace function public.clock_in_technician_gps(p_org uuid,p_site uuid,p_work_type text,p_note text,p_lat double precision,p_lon double precision,p_accuracy double precision)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not public.has_org_role(p_org,array['technician','inspector','owner','admin','manager','supervisor']) then raise exception 'Not authorized'; end if;
 if p_work_type not in ('job','travel') then raise exception 'Invalid work type'; end if;
 if p_site is not null and not exists(select 1 from public.sites where id=p_site and organization_id=p_org) then raise exception 'Invalid site'; end if;
 if (p_lat is null) <> (p_lon is null) or (p_lat is not null and (p_lat not between -90 and 90 or p_lon not between -180 and 180)) or (p_accuracy is not null and (p_accuracy < 0 or p_accuracy > 100000)) then raise exception 'Invalid GPS coordinates'; end if;
 insert into public.technician_time_entries(organization_id,technician_id,site_id,work_type,note,clock_in_lat,clock_in_lon,clock_in_accuracy_m)
 values(p_org,auth.uid(),p_site,p_work_type,nullif(left(trim(coalesce(p_note,'')),500),''),p_lat,p_lon,p_accuracy) returning id into v_id;
 return v_id;
exception when unique_violation then raise exception 'You already have an active shift';
end $$;
revoke all on function public.clock_in_technician_gps(uuid,uuid,text,text,double precision,double precision,double precision) from public;
grant execute on function public.clock_in_technician_gps(uuid,uuid,text,text,double precision,double precision,double precision) to authenticated;
create or replace function public.clock_out_technician_gps(p_org uuid,p_note text,p_lat double precision,p_lon double precision,p_accuracy double precision)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not public.has_org_role(p_org,array['technician','inspector','owner','admin','manager','supervisor']) then raise exception 'Not authorized'; end if;
 if (p_lat is null) <> (p_lon is null) or (p_lat is not null and (p_lat not between -90 and 90 or p_lon not between -180 and 180)) or (p_accuracy is not null and (p_accuracy < 0 or p_accuracy > 100000)) then raise exception 'Invalid GPS coordinates'; end if;
 update public.technician_time_entries set clock_out_at=greatest(now(),clock_in_at),
 note=coalesce(nullif(left(trim(coalesce(p_note,'')),500),''),note),
 clock_out_lat=p_lat,clock_out_lon=p_lon,clock_out_accuracy_m=p_accuracy
 where organization_id=p_org and technician_id=auth.uid() and clock_out_at is null returning id into v_id;
 if v_id is null then raise exception 'No active shift'; end if;
 return v_id;
end $$;
revoke all on function public.clock_out_technician_gps(uuid,text,double precision,double precision,double precision) from public;
grant execute on function public.clock_out_technician_gps(uuid,text,double precision,double precision,double precision) to authenticated;
create or replace function public.list_technician_timesheet_gps(p_org uuid,p_days integer default 14)
returns table(id uuid,technician_email text,site_id uuid,work_type text,note text,clock_in_at timestamptz,clock_out_at timestamptz,clock_in_lat double precision,clock_in_lon double precision,clock_in_accuracy_m double precision,clock_out_lat double precision,clock_out_lon double precision,clock_out_accuracy_m double precision)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.has_org_role(p_org,array['technician','inspector','owner','admin','manager','supervisor']) then raise exception 'Not authorized'; end if;
 return query select t.id,u.email::text,t.site_id,t.work_type,t.note,t.clock_in_at,t.clock_out_at,t.clock_in_lat,t.clock_in_lon,t.clock_in_accuracy_m,t.clock_out_lat,t.clock_out_lon,t.clock_out_accuracy_m
 from public.technician_time_entries t join auth.users u on u.id=t.technician_id
 where t.organization_id=p_org and (t.technician_id=auth.uid() or public.has_org_role(p_org,array['owner','admin','manager','supervisor']))
 and (t.clock_in_at>=now()-make_interval(days=>least(greatest(coalesce(p_days,14),1),90)) or t.clock_out_at is null)
 order by t.clock_in_at desc limit 2000;
end $$;
revoke all on function public.list_technician_timesheet_gps(uuid,integer) from public;
grant execute on function public.list_technician_timesheet_gps(uuid,integer) to authenticated;