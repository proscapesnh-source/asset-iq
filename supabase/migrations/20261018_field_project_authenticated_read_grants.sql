-- Allow signed-in users to query project lists; existing RLS still limits rows by organization, role and project assignment.
grant select on public.field_projects, public.field_project_assignments to authenticated;
