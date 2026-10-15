# Deploy PolyShield Asset IQ v2.9.0

1. Back up the Supabase database.
2. Run `supabase/migrations/20260911_v2_9_role_workspaces.sql` in the production Supabase SQL editor.
3. Deploy this application package through the existing GitHub/Vercel workflow.
4. Assign each member one role in `organization_members.role`: `supervisor`, `technician`, or `maintenance`. Existing `owner`, `admin`, `manager`, `inspector`, and `viewer` values remain supported.
5. Sign in with one test account for each workspace and complete the checks below.

## Acceptance checks

- Supervisor sees Sites, Work Orders, Planning, Knowledge, and Supervisor; does not see Inspect.
- Technician sees Inspect and field calculators; does not see Sites, Work Orders, budget, QR ordering, lifecycle controls, or Supervisor.
- Maintenance sees Work Orders, service history, components, and repair calculators; does not see Inspect, Sites, QR ordering, lifecycle controls, budget fields, or Supervisor.
- Viewer can open passports but cannot add/edit assets, add photos, inspect, or update maintenance records.
- A direct API attempt by Maintenance to change `approved_budget`, vendor, or PO is rejected.
- Existing `inspector` users land in the Technician workspace.
