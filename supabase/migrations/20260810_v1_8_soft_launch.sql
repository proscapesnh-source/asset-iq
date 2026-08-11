-- PolyShield Asset IQ v1.8 — Soft Launch Foundation
-- Additive migration. Does not drop or truncate existing data.

-- Extend organization roles for soft-launch supervisory access.
alter table public.organization_members drop constraint if exists organization_members_role_check;
alter table public.organization_members add constraint organization_members_role_check
  check (role in ('owner','admin','manager','supervisor','inspector','viewer'));

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_org_created_idx on public.activity_log(organization_id, created_at desc);
create index if not exists activity_log_user_created_idx on public.activity_log(user_id, created_at desc);

alter table public.activity_log enable row level security;
grant select, insert on public.activity_log to authenticated;

drop policy if exists activity_log_insert on public.activity_log;
create policy activity_log_insert on public.activity_log for insert to authenticated
with check (public.is_org_member(organization_id) and user_id = auth.uid());

drop policy if exists activity_log_select on public.activity_log;
create policy activity_log_select on public.activity_log for select to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = activity_log.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','manager','supervisor')
  )
);

insert into public.schema_migrations(version, description)
values ('v1.8.0', 'Soft launch audit log and supervisor operations visibility')
on conflict (version) do nothing;
