CREATE OR REPLACE FUNCTION public.list_org_join_requests(p_org uuid)
RETURNS TABLE(id uuid, requested_email text, kind text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
begin
 if not public.has_org_role(p_org,array['owner','admin','manager','supervisor']) then raise exception 'Supervisor access required'; end if;
 return query select r.id,coalesce(r.invited_email,u.email)::text,
 case when r.requested_by is null then 'invitation' else 'membership request' end::text,r.created_at
 from public.organization_join_requests r left join auth.users u on u.id=r.requested_by
 where r.organization_id=p_org and r.status='pending' and (r.requested_by is not null or r.invited_email is not null)
 order by r.created_at desc;
end $function$;