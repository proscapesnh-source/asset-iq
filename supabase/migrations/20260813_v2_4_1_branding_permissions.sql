-- PolyShield Asset IQ v2.4.1 — organization branding permissions
-- Allows only organization owners/admins to update organization branding.

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org
      and om.user_id = auth.uid()
      and om.role in ('owner','admin')
  );
$$;

revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_admin(uuid) to authenticated;

grant select, update on table public.organizations to authenticated;

drop policy if exists organizations_update on public.organizations;
create policy organizations_update
on public.organizations
for update
to authenticated
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

notify pgrst, 'reload schema';
