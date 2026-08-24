# Deploy v2.5.0

1. Run `supabase/migrations/20260824_v2_5_field_stabilization.sql` in the existing PolyShield Supabase SQL Editor.
2. In Vercel project environment variables, set `VITE_APP_URL` to the live PolyShield origin.
3. In Supabase → Authentication → URL Configuration, set **Site URL** to the live PolyShield origin and add the live origin to **Redirect URLs**. Do not leave localhost as the production Site URL.
4. Commit/push this v2.5.0 project to the same GitHub branch Vercel deploys.
5. After deployment test: Forgot Password; scan QR while logged out and create a new user; correct an AI finding then re-analyze; print a multi-page inspection report to PDF and paper preview.
