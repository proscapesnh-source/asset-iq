-- PolyShield Asset IQ v2.9 — separate supervisor, technician, and maintenance workspaces
-- Additive security migration. Existing inspector users remain supported as technicians.
begin;

alter table public.organization_members drop constraint if exists organization_members_role_check;
alter table public.organization_members add constraint organization_members_role_check
  check (role in ('owner','admin','manager','supervisor','technician','inspector','maintenance','viewer'));

create or replace function public.has_org_role(target_org uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role = any(allowed_roles)
  );
$$;
revoke all on function public.has_org_role(uuid, text[]) from public;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

-- Asset registry: supervisors and technicians register/edit; only administrators delete.
drop policy if exists assets_insert on public.assets;
drop policy if exists assets_update on public.assets;
drop policy if exists assets_delete on public.assets;
create policy assets_insert on public.assets for insert to authenticated with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','technician','inspector']));
create policy assets_update on public.assets for update to authenticated using
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','technician','inspector'])) with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','technician','inspector']));
create policy assets_delete on public.assets for delete to authenticated using
  (public.has_org_role(organization_id, array['owner','admin']));

-- Shared asset photos may be added by field and maintenance teams.
drop policy if exists asset_photos_insert on public.asset_photos;
drop policy if exists asset_photos_update on public.asset_photos;
drop policy if exists asset_photos_delete on public.asset_photos;
create policy asset_photos_insert on public.asset_photos for insert to authenticated with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','technician','inspector','maintenance']));
create policy asset_photos_update on public.asset_photos for update to authenticated using
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','technician','inspector','maintenance'])) with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','technician','inspector','maintenance']));
create policy asset_photos_delete on public.asset_photos for delete to authenticated using
  (public.has_org_role(organization_id, array['owner','admin']));

-- Inspection evidence belongs to technicians; supervisors retain corrective access.
drop policy if exists inspections_insert on public.inspections;
drop policy if exists inspections_update on public.inspections;
drop policy if exists inspections_delete on public.inspections;
create policy inspections_insert on public.inspections for insert to authenticated with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','technician','inspector']) and (inspector_id is null or inspector_id = auth.uid() or public.has_org_role(organization_id, array['owner','admin','manager','supervisor'])));
create policy inspections_update on public.inspections for update to authenticated using
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','technician','inspector'])) with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','technician','inspector']));
create policy inspections_delete on public.inspections for delete to authenticated using
  (public.has_org_role(organization_id, array['owner','admin']));

drop policy if exists inspection_photos_insert on public.inspection_photos;
drop policy if exists inspection_photos_update on public.inspection_photos;
drop policy if exists inspection_photos_delete on public.inspection_photos;
create policy inspection_photos_insert on public.inspection_photos for insert to authenticated with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','technician','inspector']));
create policy inspection_photos_update on public.inspection_photos for update to authenticated using
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','technician','inspector'])) with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','technician','inspector']));
create policy inspection_photos_delete on public.inspection_photos for delete to authenticated using
  (public.has_org_role(organization_id, array['owner','admin']));

-- Maintenance owns work execution, service history, and component changeouts.
drop policy if exists work_orders_insert on public.work_orders;
drop policy if exists work_orders_update on public.work_orders;
drop policy if exists work_orders_delete on public.work_orders;
create policy work_orders_insert on public.work_orders for insert to authenticated with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','maintenance','technician','inspector']));
create policy work_orders_update on public.work_orders for update to authenticated using
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','maintenance'])) with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','maintenance']));
create policy work_orders_delete on public.work_orders for delete to authenticated using
  (public.has_org_role(organization_id, array['owner','admin']));

drop policy if exists asset_service_events_insert on public.asset_service_events;
drop policy if exists asset_service_events_update on public.asset_service_events;
create policy asset_service_events_insert on public.asset_service_events for insert to authenticated with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','maintenance']));
create policy asset_service_events_update on public.asset_service_events for update to authenticated using
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','maintenance'])) with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','maintenance']));

drop policy if exists asset_components_insert on public.asset_components;
drop policy if exists asset_components_update on public.asset_components;
create policy asset_components_insert on public.asset_components for insert to authenticated with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','maintenance']));
create policy asset_components_update on public.asset_components for update to authenticated using
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','maintenance'])) with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','maintenance']));

-- Lifecycle and QR production remain supervisory decisions.
drop policy if exists asset_dna_insert on public.asset_dna;
drop policy if exists asset_dna_update on public.asset_dna;
create policy asset_dna_insert on public.asset_dna for insert to authenticated with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','maintenance']));
create policy asset_dna_update on public.asset_dna for update to authenticated using
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','maintenance'])) with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor','maintenance']));

drop policy if exists asset_lifecycle_events_insert on public.asset_lifecycle_events;
drop policy if exists asset_lifecycle_events_update on public.asset_lifecycle_events;
create policy asset_lifecycle_events_insert on public.asset_lifecycle_events for insert to authenticated with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor']));
create policy asset_lifecycle_events_update on public.asset_lifecycle_events for update to authenticated using
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor'])) with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor']));

drop policy if exists qr_tag_orders_insert on public.qr_tag_orders;
create policy qr_tag_orders_insert on public.qr_tag_orders for insert to authenticated with check
  (public.has_org_role(organization_id, array['owner','admin','manager','supervisor']) and (requested_by is null or requested_by = auth.uid()));

-- Maintenance can advance work, but cannot alter supervisor-controlled money or PO fields.
create or replace function public.protect_work_order_budget()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.has_org_role(new.organization_id, array['maintenance','technician','inspector'])
     and not public.has_org_role(new.organization_id, array['owner','admin','manager','supervisor']) then
    if tg_op = 'INSERT' and (new.estimated_cost is not null or new.approved_budget is not null or new.vendor_name is not null or new.purchase_order_number is not null) then
      raise exception 'Maintenance workspace cannot set budget, vendor, or PO fields';
    end if;
    if tg_op = 'UPDATE' and (new.estimated_cost is distinct from old.estimated_cost or new.approved_budget is distinct from old.approved_budget or new.vendor_name is distinct from old.vendor_name or new.purchase_order_number is distinct from old.purchase_order_number) then
      raise exception 'Maintenance workspace cannot change budget, vendor, or PO fields';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists work_orders_protect_budget on public.work_orders;
create trigger work_orders_protect_budget before insert or update on public.work_orders
for each row execute function public.protect_work_order_budget();

insert into public.schema_migrations(version, description)
values ('v2.9.0', 'Separate supervisor, technician, and maintenance workspaces with enforced permissions')
on conflict (version) do nothing;

commit;
