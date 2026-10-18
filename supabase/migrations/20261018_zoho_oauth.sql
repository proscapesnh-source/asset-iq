create table public.zoho_oauth_states (
 state text primary key,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 expires_at timestamptz not null default (now()+ interval '10 minutes'),
 consumed_at timestamptz
);
create table public.zoho_credentials (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 refresh_token text not null,
 access_token text not null,
 expires_at timestamptz not null,
 api_domain text not null,
 updated_at timestamptz not null default now()
);
alter table public.zoho_oauth_states enable row level security;
alter table public.zoho_credentials enable row level security;
-- No policies: these tables can be accessed only by the backend service role.
revoke all on public.zoho_oauth_states from anon,authenticated;
revoke all on public.zoho_credentials from anon,authenticated;