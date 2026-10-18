create table public.zoho_attachment_queue (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null,
 source_type text not null check(source_type in ('inspection_photo','asset_photo','final_report')),
 source_id uuid not null,
 file_name text not null,
 storage_path text not null,
 status text not null default 'pending' check(status in ('pending','processing','uploaded','failed','blocked')),
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 last_error text,
 zoho_attachment_id text,
 created_at timestamptz not null default now(),
 uploaded_at timestamptz,
 unique(project_id,source_type,source_id),
 foreign key(project_id,organization_id) references public.field_projects(id,organization_id) on delete cascade
);
create index zoho_attachment_queue_retry on public.zoho_attachment_queue(status,next_attempt_at);
alter table public.zoho_attachment_queue enable row level security;
create policy zoho_attachment_queue_owner_read on public.zoho_attachment_queue for select to authenticated using (public.has_org_role(organization_id,array['owner','admin']));
grant select on public.zoho_attachment_queue to authenticated;
grant select,insert,update,delete on public.zoho_attachment_queue to service_role;
create or replace function public.queue_zoho_project_photo(p_project uuid,p_photo uuid,p_source text)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.field_projects; v_path text; v_name text; v_org uuid; v_id uuid;
begin
 select * into p from public.field_projects where id=p_project;
 if not found or p.zoho_record_id is null then raise exception 'Project must be linked to a Zoho JobSite';end if;
 if not public.has_org_role(p.organization_id,array['owner','admin']) then raise exception 'Owner/Admin required';end if;
 if p_source='inspection_photo' then
  select organization_id,storage_path,file_name into v_org,v_path,v_name from public.inspection_photos where id=p_photo;
 elsif p_source='asset_photo' then
  select organization_id,storage_path,file_name into v_org,v_path,v_name from public.asset_photos where id=p_photo;
 else raise exception 'Unsupported attachment source';end if;
 if v_org is distinct from p.organization_id or v_path is null then raise exception 'Photo not found in project organization';end if;
 insert into public.zoho_attachment_queue(organization_id,project_id,source_type,source_id,file_name,storage_path)
 values(p.organization_id,p_project,p_source,p_photo,coalesce(nullif(v_name,''),'photo'),v_path)
 on conflict(project_id,source_type,source_id) do update set id=public.zoho_attachment_queue.id
 returning id into v_id;
 return v_id;
end $$;
revoke all on function public.queue_zoho_project_photo(uuid,uuid,text) from public;
grant execute on function public.queue_zoho_project_photo(uuid,uuid,text) to authenticated;
