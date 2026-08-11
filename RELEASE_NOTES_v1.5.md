# PolyShield Asset IQ v1.5.0

## Database Foundation
- Fixes `permission denied for table coating_systems`.
- Adds explicit Supabase API grants in addition to RLS.
- Adds reusable `is_org_admin()` authorization helper.
- Restricts Knowledge Center writes to organization owner/admin roles.
- Adds an idempotent migration registry (`polyshield_migrations`).
- Reasserts core table grants without changing RLS or row data.
- Makes Knowledge Center load independently so an optional knowledge permission error no longer makes the dashboard appear empty.
- Adds clearer migration error messages.

## Data safety
No asset, inspection, photo, work order, or organization table is dropped, truncated, or cleared by the v1.5 migration.
