create or replace function public.set_field_project_site(p_project uuid,p_site uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_org uuid;
begin
 select organization_id into v_org from public.field_projects where id=p_project;
 if v_org is null or not public.has_org_role(v_org,array['owner','admin']) then raise exception 'Owner/Admin required';end if;
 if p_site is not null and not exists(select 1 from public.sites where id=p_site and organization_id=v_org) then raise exception 'Site must belong to this organization';end if;
 update public.field_projects set site_id=p_site where id=p_project and organization_id=v_org;
end $$;
revoke all on function public.set_field_project_site(uuid,uuid) from public;
grant execute on function public.set_field_project_site(uuid,uuid) to authenticated;