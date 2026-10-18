-- Required API table privileges; row-level security continues to determine which organization members can read or change integration settings.
grant select, insert, update, delete on table public.integration_connections to authenticated;
grant select, insert, update, delete on table public.integration_connections to service_role;
