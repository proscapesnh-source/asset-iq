# PolyShield Asset IQ v2.4.1 — Branding Permission Fix

- Fixes `Cannot coerce the result to a single JSON object` when saving organization report branding.
- Adds an owner/admin-only RLS policy for updating the organization branding record.
- Adds an explicit authenticated `UPDATE` grant on `public.organizations`.
- Replaces `.single()` with `.maybeSingle()` and returns a clear migration message when no organization row can be updated.

## Required database step
Run `supabase/migrations/20260813_v2_4_1_branding_permissions.sql` once in Supabase SQL Editor.
