create or replace function public.get_org_invitation_token(p_org uuid, p_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare v_token uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_org,array['owner','admin','manager','supervisor']) then
    raise exception 'Supervisor access required';
  end if;
  select r.token into v_token from public.organization_join_requests r
  where r.id=p_id and r.organization_id=p_org and r.status='pending' and r.invited_email is not null;
  if v_token is null then raise exception 'Pending invitation not found'; end if;
  return v_token;
end $function$;
revoke all on function public.get_org_invitation_token(uuid,uuid) from public, anon;
grant execute on function public.get_org_invitation_token(uuid,uuid) to authenticated;