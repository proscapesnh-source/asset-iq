-- Job-start confirmation: supervisor assigns, technician responds, audit trail retained.
begin;
create table if not exists public.job_start_confirmations (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 job_title text not null check(length(trim(job_title)) > 0),
 site_id uuid references public.sites(id) on delete set null,
 technician_email text not null check (technician_email = lower(technician_email)),
 start_date date not null,
 start_time time,
 notes text,
 status text not null default 'pending' check(status in ('pending','confirmed','change_requested')),
 technician_note text,
 responded_at timestamptz,
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists job_start_confirmations_org_idx on public.job_start_confirmations (organization_id,start_date);
create index if not exists job_start_confirmations_email_idx on public.job_start_confirmations (technician_email,start_date);
create table if not exists public.job_start_confirmation_events (
 id uuid primary key default gen_random_uuid(),
 confirmation_id uuid not null references public.job_start_confirmations(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 actor_id uuid not null default auth.uid(),
 action text not null check (action in ('scheduled','rescheduled','confirmed','change_requested')),
 details text,
 created_at timestamptz not null default now()
);
alter table public.job_start_confirmations enable row level security;
alter table public.job_start_confirmation_events enable row level security;
create policy job_start_read on public.job_start_confirmations for select to authenticated using (
 public.has_org_role(organization_id,array['owner','admin','manager','supervisor']) or
 (public.has_org_role(organization_id,array['technician','inspector']) and technician_email = lower(auth.jwt()->>'email'))
);
create policy job_start_create on public.job_start_confirmations for insert to authenticated with check (
 public.has_org_role(organization_id,array['owner','admin','manager','supervisor']) and created_by=auth.uid()
);
-- All status transitions occur through this RPC, never direct client updates.
create or replace function public.respond_job_start(p_id uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v public.job_start_confirmations%rowtype;
begin
 if p_status not in ('confirmed','change_requested') then raise exception 'Invalid response'; end if;
 select * into v from public.job_start_confirmations where id=p_id for update;
 if not found or not public.has_org_role(v.organization_id,array['technician','inspector'])
   or v.technician_email is distinct from lower(auth.jwt()->>'email')
 then raise exception 'Not authorized to respond'; end if;
 if v.status <> 'pending' then raise exception 'This job start is no longer awaiting a response'; end if;
 update public.job_start_confirmations
 set status=p_status,technician_note=nullif(trim(p_note),''),responded_at=now(),updated_at=now()
 where id=p_id;
 insert into public.job_start_confirmation_events(confirmation_id,organization_id,actor_id,action,details)
 values(p_id,v.organization_id,auth.uid(),p_status,nullif(trim(p_note),''));
end $$;
revoke all on function public.respond_job_start(uuid,text,text) from public;
grant execute on function public.respond_job_start(uuid,text,text) to authenticated;
create or replace function public.reschedule_job_start(p_id uuid,p_date date,p_time time default null,p_notes text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v public.job_start_confirmations%rowtype;
begin
 select * into v from public.job_start_confirmations where id=p_id for update;
 if not found or not public.has_org_role(v.organization_id,array['owner','admin','manager','supervisor'])
 then raise exception 'Not authorized'; end if;
 if p_date is null then raise exception 'Start date required'; end if;
 update public.job_start_confirmations set start_date=p_date,start_time=p_time,notes=p_notes,status='pending',technician_note=null,responded_at=null,updated_at=now() where id=p_id;
 insert into public.job_start_confirmation_events(confirmation_id,organization_id,actor_id,action,details)
 values(p_id,v.organization_id,auth.uid(),'rescheduled','New start date: '||p_date::text);
end $$;
revoke all on function public.reschedule_job_start(uuid,date,time,text) from public;
grant execute on function public.reschedule_job_start(uuid,date,time,text) to authenticated;
create or replace function public.schedule_job_start(p_org uuid,p_title text,p_email text,p_date date,p_time time default null,p_notes text default null,p_site uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if not public.has_org_role(p_org,array['owner','admin','manager','supervisor']) then raise exception 'Not authorized'; end if;
 if p_date is null or trim(coalesce(p_title,''))='' then raise exception 'Job and date required'; end if;
 if not exists(select 1 from public.organization_members m join auth.users u on u.id=m.user_id
 where m.organization_id=p_org and lower(u.email)=lower(trim(p_email)) and m.role in ('technician','inspector'))
 then raise exception 'Technician must be a member of this organization'; end if;
 if p_site is not null and not exists(select 1 from public.sites s where s.id=p_site and s.organization_id=p_org)
 then raise exception 'Invalid site'; end if;
 insert into public.job_start_confirmations(organization_id,job_title,technician_email,start_date,start_time,notes,site_id)
 values(p_org,trim(p_title),lower(trim(p_email)),p_date,p_time,p_notes,p_site) returning id into v_id;
 insert into public.job_start_confirmation_events(confirmation_id,organization_id,actor_id,action,details)
 values(v_id,p_org,auth.uid(),'scheduled','Start date: '||p_date::text);
 return v_id;
end $$;
revoke all on function public.schedule_job_start(uuid,text,text,date,time,text,uuid) from public;
grant execute on function public.schedule_job_start(uuid,text,text,date,time,text,uuid) to authenticated;
create policy job_start_event_read on public.job_start_confirmation_events for select to authenticated using (
 exists(select 1 from public.job_start_confirmations c where c.id=confirmation_id and
 (public.has_org_role(c.organization_id,array['owner','admin','manager','supervisor']) or
 (public.has_org_role(c.organization_id,array['technician','inspector']) and c.technician_email=lower(auth.jwt()->>'email'))))
);
commit;