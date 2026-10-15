# PolyShield Asset IQ v2.9.0 — Role Workspaces

This release separates the product into Supervisor, Technician, Maintenance, and read-only workspaces while keeping one shared asset passport and organization history.

## Workspace ownership

| Workspace | Primary responsibilities | Navigation |
|---|---|---|
| Supervisor | Fleet oversight, sites, lifecycle decisions, reports, budgets, approvals, QR administration, activity | Dashboard, Assets, Sites, Work Orders, Planning, Knowledge, Supervisor |
| Technician | Field inspections, photos, voice notes, AI review/correction, nameplates, measurements and field calculators | Dashboard, Assets, Inspect, Planning, Knowledge |
| Maintenance | Work execution, service/repair history, component changeouts, closeout evidence and repair calculations | Dashboard, Assets, Work Orders, Planning, Knowledge |
| Viewer | Read-only asset passports and history | Dashboard, Assets |

Legacy `inspector` memberships are treated as Technician accounts so existing users do not lose access.

## Security changes

- New `technician` and `maintenance` roles are accepted by the database.
- Route guards prevent users from opening another workspace through application navigation.
- Row-level security assigns inspection writes to technicians/supervisors and maintenance-record writes to maintenance/supervisors. Technicians may still create a budget-free work order automatically from a repair finding, but cannot update maintenance execution.
- Asset lifecycle events and QR production requests are supervisor-only.
- Work-order budget, vendor, and PO fields remain supervisor-controlled. A database trigger prevents Maintenance accounts from altering those fields through direct API calls.
- Destructive deletes remain restricted to owner/admin roles.

The application update and `supabase/migrations/20260911_v2_9_role_workspaces.sql` must be deployed together. Applying only the interface changes will hide tools but will not enforce the separation at the database boundary.
