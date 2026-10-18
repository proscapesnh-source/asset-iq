-- OAuth tables are intentionally invisible to authenticated and anonymous clients.
-- Allow only the trusted Edge Function service role to manage them.
grant select, insert, update, delete on table public.zoho_oauth_states to service_role;
grant select, insert, update, delete on table public.zoho_credentials to service_role;
