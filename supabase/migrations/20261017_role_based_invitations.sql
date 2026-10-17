alter table public.organization_join_requests
  add column if not exists invited_role text not null default 'technician';
alter table public.organization_join_requests
  add constraint organization_join_requests_invited_role_check
  check (invited_role in ('supervisor','technician','maintenance','viewer'));

drop function if exists public.create_org_invitation(uuid,text);
create function public.create_org_invitation(p_org uuid,p_email text,p_role text default 'technician')
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
 if not public.has_org_role(p_org,array['owner','admin','manager','supervisor']) then
  raise exception 'Supervisor access required';
 end if;
 if p_role not in ('supervisor','technician','maintenance','viewer') or p_role is null then
  raise exception 'Invalid invitation role';
 end if;
 if p_role='supervisor' and not public.has_org_role(p_org,array['owner','admin']) then
  raise exception 'Only owners and admins may invite supervisors';
 end if;
 if nullif(trim(p_email),'') is null or position('@' in trim(p_email))<2 then
  raise exception 'Valid email required';
 end if;
 insert into public.organization_join_requests(organization_id,invited_email,initiated_by,invited_role)
 values(p_org,lower(trim(p_email)),auth.uid(),p_role)
 returning token into v_id;
 return v_id;
end $$;
revoke all on function public.create_org_invitation(uuid,text,text) from public;
grant execute on function public.create_org_invitation(uuid,text,text) to authenticated;

create or replace function public.review_org_join_request(p_id uuid,p_approve boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_request public.organization_join_requests;
begin
 select * into v_request from public.organization_join_requests
 where id=p_id and status='pending' for update;
 if not found then raise exception 'Request not found'; end if;
 if not public.has_org_role(v_request.organization_id,array['owner','admin','manager','supervisor']) then
  raise exception 'Supervisor access required';
 end if;
 if p_approve then
   if v_request.requested_by is null then raise exception 'Invitee has not accepted their invitation'; end if;
   if v_request.invited_role='supervisor'
     and not public.has_org_role(v_request.organization_id,array['owner','admin']) then
     raise exception 'Only owners and admins may approve supervisors';
   end if;
   insert into public.organization_members(organization_id,user_id,role)
   values(v_request.organization_id,v_request.requested_by,v_request.invited_role)
   on conflict (organization_id,user_id) do nothing;
   if not found then raise exception 'User already belongs to this organization; role unchanged'; end if;
 end if;
 update public.organization_join_requests
 set status=case when p_approve then 'approved' else 'rejected' end,
 reviewed_at=now(),reviewed_by=auth.uid() where id=p_id;
end $$;

drop function if exists public.list_org_join_requests(uuid);
create function public.list_org_join_requests(p_org uuid)
returns table(id uuid,requested_email text,kind text,created_at timestamptz,invited_role text)
language plpgsql security definer set search_path = ''
as $$
begin
 if not public.has_org_role(p_org,array['owner','admin','manager','supervisor']) then
  raise exception 'Supervisor access required';
 end if;
 return query select r.id,coalesce(r.invited_email,u.email)::text,
 case when r.requested_by is null then 'invitation' else 'membership request' end::text,
 r.created_at,r.invited_role
 from public.organization_join_requests r
 left join auth.users u on u.id=r.requested_by
 where r.organization_id=p_org and r.status='pending'
 and (r.requested_by is not null or r.invited_email is not null)
 order by r.created_at desc;
end $$;
revoke all on function public.list_org_join_requests(uuid) from public;
grant execute on function public.list_org_join_requests(uuid) to authenticated;
revoke all on function public.review_org_join_request(uuid,boolean) from public;
grant execute on function public.review_org_join_request(uuid,boolean) to authenticated;