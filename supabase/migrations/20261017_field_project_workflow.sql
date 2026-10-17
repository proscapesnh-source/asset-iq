-- Company projects: role-scoped access with owner-controlled closure.
create table public.field_projects (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 zoho_record_id text,
 job_number text,
 title text not null,
 site_id uuid references public.sites(id) on delete set null,
 description text,
 start_date date,
 end_date date,
 status text not null default 'owner_review' check(status in ('owner_review','work_scheduled','active','submitted_for_close','closed')),
 created_at timestamptz not null default now(),
 closed_at timestamptz,
 closed_by uuid references auth.users(id),
 unique(organization_id,zoho_record_id),
 unique(id,organization_id)
);
create table public.field_project_assignments (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null,
 organization_id uuid not null,
 member_id uuid not null references auth.users(id),
 assignment_role text not null check(assignment_role in ('lead_supervisor','supervisor','technician','maintenance')),
 created_at timestamptz not null default now(),
 unique(project_id,member_id),
 foreign key(project_id,organization_id) references public.field_projects(id,organization_id) on delete cascade
);
create unique index field_project_one_lead on public.field_project_assignments(project_id) where assignment_role='lead_supervisor';
create index field_project_assignments_member on public.field_project_assignments(member_id,project_id);
create or replace function public.can_access_field_project(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists (
 select 1 from public.field_projects p
 where p.id=p_id and (
  public.has_org_role(p.organization_id,array['owner','admin']) or
  (p.status<>'closed' and exists (
   select 1 from public.field_project_assignments a
   where a.project_id=p.id and a.member_id=auth.uid()
  ))
 )
 ) $$;
revoke all on function public.can_access_field_project(uuid) from public;
grant execute on function public.can_access_field_project(uuid) to authenticated;
alter table public.field_projects enable row level security;
alter table public.field_project_assignments enable row level security;
create policy field_projects_read on public.field_projects for select to authenticated using(public.can_access_field_project(id));
create policy field_project_assignments_read on public.field_project_assignments for select to authenticated using(public.can_access_field_project(project_id));
-- No direct client writes. SECURITY DEFINER operations validate membership and role.
create or replace function public.create_field_project(p_org uuid,p_title text,p_site uuid default null,p_job_number text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if not public.has_org_role(p_org,array['owner','admin']) then raise exception 'Owner or admin required';end if;
 if nullif(trim(p_title),'') is null then raise exception 'Project title required';end if;
 if p_site is not null and not exists(select 1 from public.sites where id=p_site and organization_id=p_org) then raise exception 'Site does not belong to organization';end if;
 insert into public.field_projects(organization_id,title,site_id,job_number)
 values(p_org,trim(p_title),p_site,p_job_number) returning id into v_id;
 return v_id;
end $$;
create or replace function public.assign_field_project_member(p_project uuid,p_user uuid,p_role text)
returns void language plpgsql security definer set search_path='' as $$
declare v public.field_projects; v_member_role text;
begin
 select * into v from public.field_projects where id=p_project for update;
 if not found then raise exception 'Project not found';end if;
 if not public.has_org_role(v.organization_id,array['owner','admin']) then raise exception 'Owner or admin required';end if;
 if v.status='closed' then raise exception 'Closed projects must be reopened before assignment';end if;
 if p_role not in ('lead_supervisor','supervisor','technician','maintenance') then raise exception 'Invalid role';end if;
 select role into v_member_role from public.organization_members where organization_id=v.organization_id and user_id=p_user;
 if v_member_role is null then raise exception 'User is not in organization';end if;
 if p_role in ('lead_supervisor','supervisor') and v_member_role not in ('supervisor','manager','admin','owner') then raise exception 'A supervisor membership is required';end if;
 if p_role='technician' and v_member_role not in ('technician','inspector') then raise exception 'A technician membership is required';end if;
 if p_role='maintenance' and v_member_role<>'maintenance' then raise exception 'A maintenance membership is required';end if;
 insert into public.field_project_assignments(project_id,organization_id,member_id,assignment_role)
 values(p_project,v.organization_id,p_user,p_role)
 on conflict(project_id,member_id) do update set assignment_role=excluded.assignment_role;
end $$;
create or replace function public.transition_field_project(p_project uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
declare v public.field_projects;
begin
 select * into v from public.field_projects where id=p_project for update;
 if not found then raise exception 'Project not found';end if;
 if p_status='submitted_for_close' then
  if v.status not in ('active','work_scheduled') then raise exception 'Project must be active or scheduled';end if;
  if not(public.has_org_role(v.organization_id,array['owner','admin']) or exists(select 1 from public.field_project_assignments a where a.project_id=p_project and a.member_id=auth.uid() and a.assignment_role in ('lead_supervisor','supervisor'))) then raise exception 'Assigned supervisor required';end if;
 elsif p_status in ('work_scheduled','active','closed','owner_review') then
  if not public.has_org_role(v.organization_id,array['owner','admin']) then raise exception 'Owner or admin required';end if;
  if p_status='work_scheduled' and v.status<>'owner_review' then raise exception 'Invalid transition';end if;
  if p_status='work_scheduled' and not exists(select 1 from public.field_project_assignments where project_id=p_project and assignment_role='lead_supervisor') then raise exception 'Assign a lead supervisor first';end if;
  if p_status='active' and v.status<>'work_scheduled' then raise exception 'Invalid transition';end if;
  if p_status='closed' and v.status<>'submitted_for_close' then raise exception 'Project must be submitted for approval';end if;
  if p_status='owner_review' and v.status<>'closed' then raise exception 'Only closed projects can be reopened';end if;
 else raise exception 'Invalid transition';end if;
 update public.field_projects set status=p_status,
 closed_at=case when p_status='closed' then now() else null end,
 closed_by=case when p_status='closed' then auth.uid() else null end
 where id=p_project;
end $$;
revoke all on function public.create_field_project(uuid,text,uuid,text) from public;
revoke all on function public.assign_field_project_member(uuid,uuid,text) from public;
revoke all on function public.transition_field_project(uuid,text) from public;
grant execute on function public.create_field_project(uuid,text,uuid,text) to authenticated;
grant execute on function public.assign_field_project_member(uuid,uuid,text) to authenticated;
grant execute on function public.transition_field_project(uuid,text) to authenticated;
