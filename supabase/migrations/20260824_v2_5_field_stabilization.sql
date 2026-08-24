-- PolyShield Asset IQ v2.5 field stabilization
-- Adds AI correction audit fields and authenticated read-only QR passport access.

alter table public.inspection_photos add column if not exists ai_analysis jsonb;
alter table public.inspection_photos add column if not exists ai_original_analysis jsonb;
alter table public.inspection_photos add column if not exists ai_correction jsonb;
alter table public.inspection_photos add column if not exists ai_corrected boolean not null default false;

create or replace function public.get_qr_asset_passport(target_asset uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select jsonb_build_object(
    'organization_name', o.name,
    'asset', jsonb_build_object(
      'id', a.id,
      'asset_tag', a.asset_tag,
      'name', a.name,
      'asset_type', a.asset_type,
      'facility', a.facility,
      'location', a.location,
      'contents', a.contents,
      'manufacturer', a.manufacturer,
      'model', a.model,
      'serial_number', a.serial_number,
      'last_inspection_date', a.last_inspection_date,
      'next_inspection_date', a.next_inspection_date,
      'health_score', a.health_score,
      'status', a.status
    ),
    'latest_inspection', (
      select jsonb_build_object(
        'id', i.id,
        'inspected_at', i.inspected_at,
        'condition', i.condition,
        'action_required', i.action_required,
        'health_score', i.health_score,
        'notes', i.notes
      )
      from public.inspections i
      where i.asset_id = a.id
      order by i.inspected_at desc
      limit 1
    )
  ) into result
  from public.assets a
  join public.organizations o on o.id = a.organization_id
  where a.id = target_asset and coalesce(a.archived,false) = false;

  return result;
end;
$$;

revoke all on function public.get_qr_asset_passport(uuid) from public;
grant execute on function public.get_qr_asset_passport(uuid) to authenticated;
