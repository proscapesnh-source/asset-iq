# PolyShield Asset IQ v1.5 — Database Foundation

This release repairs the Knowledge Center permission error without deleting existing assets or inspections.

## Run once
1. Open Supabase → SQL Editor → New query.
2. Open `supabase/migrations/20260807_v1_5_database_foundation.sql` from this project.
3. Paste the whole migration into Supabase and click **Run query**.
4. Refresh PolyShield. Your existing assets should still be present and Knowledge Center should load.

## Why the v1.4 error happened
Supabase requires both table privileges (GRANT) and Row Level Security policies. v1.4 created RLS policies but your project did not have the required API table privileges on the new knowledge tables. v1.5 adds both.

## Safety
The migration does not DROP or TRUNCATE application tables and does not DELETE records. It is idempotent and may be rerun. Policy/trigger definitions are replaced intentionally; row data is not touched.

## Security model
All organization members can read their organization's knowledge. Only organization owners/admins can add, edit, seed, or delete Knowledge Center records.
