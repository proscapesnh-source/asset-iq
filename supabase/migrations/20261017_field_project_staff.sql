create or replace function public.list_field_project_staff(p_org uuid)
returns table(user_id uuid,email text,role text)
language plpgsql security definer set search_path=''
as $$
begin
 if not public.has_org_role(p_org,array['owner','admin']) then raise exception 'Owner or admin required';end if;
 return query
 select m.user_id,u.email::text,m.role from public.organization_members m
 join auth.users u on u.id=m.user_id where m.organization_id=p_org
 and m.role in ('owner','admin','manager','supervisor','technician','inspector','maintenance')
 order by u.email;
end $$;
revoke all on function public.list_field_project_staff(uuid) from public;
grant execute on function public.list_field_project_staff(uuid) to authenticated;