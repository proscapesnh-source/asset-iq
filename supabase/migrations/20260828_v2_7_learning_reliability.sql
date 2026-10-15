alter table public.inspections add column if not exists client_submission_id text;
create unique index if not exists inspections_org_submission_unique on public.inspections(organization_id, client_submission_id) where client_submission_id is not null;

create table if not exists public.ai_inspection_feedback (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade, inspection_id uuid not null references public.inspections(id) on delete cascade,
  inspection_photo_id uuid not null references public.inspection_photos(id) on delete cascade, original_analysis jsonb not null,
  corrected_analysis jsonb not null, correction_note text, status text not null default 'approved' check (status in ('pending','approved','rejected')),
  corrected_by uuid references auth.users(id) on delete set null, approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz, created_at timestamptz not null default now(), unique (inspection_photo_id)
);
create index if not exists ai_feedback_org_approved_idx on public.ai_inspection_feedback(organization_id, status, created_at desc);
alter table public.ai_inspection_feedback enable row level security;
drop policy if exists ai_feedback_select on public.ai_inspection_feedback;
create policy ai_feedback_select on public.ai_inspection_feedback for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists ai_feedback_insert on public.ai_inspection_feedback;
create policy ai_feedback_insert on public.ai_inspection_feedback for insert to authenticated with check (public.is_org_member(organization_id));
drop policy if exists ai_feedback_update on public.ai_inspection_feedback;
create policy ai_feedback_update on public.ai_inspection_feedback for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
