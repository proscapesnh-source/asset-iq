# PolyShield Asset IQ v2.5.0 — Field Stabilization

This release addresses issues found during live field use.

## Fixed
- Added **Forgot your password?** and full Supabase password recovery/new-password flow.
- Authentication email redirects now use `VITE_APP_URL` when configured and preserve a scanned asset through sign-up/reset/confirmation.
- QR deep links survive authentication. Organization members open the full asset record; authenticated outsiders receive a protected read-only QR passport rather than being silently sent to their own dashboard.
- Added technician correction of AI photo analysis: title/finding, severity, area, surface, coating condition, defects, summary, and a correction note.
- Added **Correct + re-analyze** so the vision model treats explicit technician corrections as authoritative field context.
- AI original analysis, technician correction, final analysis, and corrected flag can be retained on inspection photos for audit/learning.
- Reworked letter-size report printing: safer margins, table wrapping, repeated table headers, controlled page breaks, reduced print photo height, and print-only typography/layout adjustments.

## Database migration required
Run `supabase/migrations/20260824_v2_5_field_stabilization.sql` once in the current Supabase project. It adds AI audit fields and the authenticated read-only QR passport RPC.

## Production auth configuration
Set `VITE_APP_URL` in Vercel to the live PolyShield origin, e.g. `https://your-domain.vercel.app` (no trailing path). In Supabase Authentication → URL Configuration, set the Site URL to that same production origin and add it to Redirect URLs. Keep localhost only as an additional development redirect if needed.
