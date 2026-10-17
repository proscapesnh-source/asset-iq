create or replace function public.bootstrap_my_organization(organization_name text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  existing_org uuid;
  new_org uuid;
  safe_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select organization_id into existing_org
    from public.organization_members where user_id=auth.uid()
    order by created_at asc limit 1;
  if existing_org is not null then return existing_org; end if;
  if exists (
    select 1 from public.organization_join_requests r
    join auth.users u on u.id=auth.uid()
    where r.status='pending'
      and (r.requested_by=auth.uid() or (r.invited_email is not null and r.invited_email=lower(u.email)))
  ) then
    raise exception 'TECHNICIAN_INVITATION_PENDING_APPROVAL';
  end if;
  safe_name:=nullif(trim(organization_name),'');
  if safe_name is null then safe_name:='My Organization'; end if;
  insert into public.organizations(name) values(safe_name) returning id into new_org;
  insert into public.organization_members(organization_id,user_id,role)
   values(new_org,auth.uid(),'owner');
  return new_org;
end;
$$;