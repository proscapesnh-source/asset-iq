-- Owner/Supervisor AI Command dashboard settings. Additive; no production records removed.
create table if not exists public.ai_dashboard_preferences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  widgets text[] not null default array['projects','approvals','timesheets','attention','work_orders'],
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint ai_dashboard_widgets_valid check (
    array_length(widgets,1) between 1 and 5
    and widgets <@ array['projects','approvals','timesheets','attention','work_orders']::text[]
    and array_position(widgets,null) is null
  )
);
create table if not exists public.ai_dashboard_audit (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  old_widgets text[],
  new_widgets text[] not null,
  command text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_dashboard_audit_user_idx on public.ai_dashboard_audit(organization_id,user_id,created_at desc);
alter table public.ai_dashboard_preferences enable row level security;
alter table public.ai_dashboard_audit enable row level security;
revoke all on public.ai_dashboard_preferences, public.ai_dashboard_audit from anon, authenticated;
grant select on public.ai_dashboard_preferences, public.ai_dashboard_audit to authenticated;
create policy ai_preferences_read on public.ai_dashboard_preferences for select to authenticated
using (user_id = (select auth.uid()) and public.has_org_role(organization_id,array['owner','supervisor']));
create policy ai_audit_read on public.ai_dashboard_audit for select to authenticated
using (user_id = (select auth.uid()) and public.has_org_role(organization_id,array['owner','supervisor']));
-- All writes are via an invoker function so RLS applies; permit row writes only for eligible members.
grant insert, update on public.ai_dashboard_preferences to authenticated;
grant insert on public.ai_dashboard_audit to authenticated;
create policy ai_preferences_insert on public.ai_dashboard_preferences for insert to authenticated
with check (user_id = (select auth.uid()) and public.has_org_role(organization_id,array['owner','supervisor']));
create policy ai_preferences_update on public.ai_dashboard_preferences for update to authenticated
using (user_id = (select auth.uid()) and public.has_org_role(organization_id,array['owner','supervisor']))
with check (user_id = (select auth.uid()) and public.has_org_role(organization_id,array['owner','supervisor']));
-- Audit writes allowed only for same role/user and actual transition.
create policy ai_audit_insert on public.ai_dashboard_audit for insert to authenticated
with check (user_id = (select auth.uid()) and public.has_org_role(organization_id,array['owner','supervisor']));
-- Function is SECURITY INVOKER, inserts audit in the same transaction as the settings update.
create or replace function public.apply_ai_dashboard_layout(
  p_organization_id uuid, p_widgets text[], p_expected_version integer, p_command text
) returns integer language plpgsql security invoker set search_path = public as $$
declare
  v_before text[];
  v_version integer;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','supervisor']) then
    raise exception 'Not authorized to customize dashboard';
  end if;
  if p_widgets is null or cardinality(p_widgets) < 1 or cardinality(p_widgets) > 5
    or exists(select 1 from unnest(p_widgets) as w where w is null or w <> all(array['projects','approvals','timesheets','attention','work_orders']))
    or (select count(distinct w) from unnest(p_widgets) as w) <> cardinality(p_widgets) then
    raise exception 'Invalid dashboard layout';
  end if;
  if length(coalesce(p_command,'')) > 500 then raise exception 'Command too long'; end if;
  insert into public.ai_dashboard_preferences(organization_id,user_id)
  values(p_organization_id,auth.uid()) on conflict do nothing;
  select widgets,version into v_before,v_version from public.ai_dashboard_preferences
    where organization_id=p_organization_id and user_id=auth.uid() for update;
  if not found or v_version <> p_expected_version then raise exception 'Dashboard changed; reload before applying'; end if;
  update public.ai_dashboard_preferences set widgets=p_widgets,version=version+1,updated_at=now()
  where organization_id=p_organization_id and user_id=auth.uid()
  returning version into v_version;
  insert into public.ai_dashboard_audit(organization_id,user_id,old_widgets,new_widgets,command)
  values(p_organization_id,auth.uid(),v_before,p_widgets,coalesce(nullif(trim(p_command),''),'Dashboard layout change'));
  return v_version;
end $$;
revoke all on function public.apply_ai_dashboard_layout(uuid,text[],integer,text) from public,anon;
grant execute on function public.apply_ai_dashboard_layout(uuid,text[],integer,text) to authenticated;
