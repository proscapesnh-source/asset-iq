# Deploy PolyShield v2.8.0

1. Run `supabase/migrations/20260904_v2_8_planning_tools.sql` in the production Supabase SQL Editor.
2. Replace the repository contents with this release while preserving deployed environment variables.
3. Commit and push to the production branch used by Vercel.
4. Create one test work order with an estimate, approved budget, vendor, and PO number.
5. Open Planning on an iPhone and confirm the tank calculator and management budget snapshot display correctly.
