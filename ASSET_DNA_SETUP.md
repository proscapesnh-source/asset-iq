# Asset DNA v1.6 setup

1. In Supabase SQL Editor, open a new query.
2. Paste the contents of `supabase/migrations/20260810_v1_6_asset_dna.sql`.
3. Run the migration once. RLS should remain enabled.
4. Keep your existing local `.env` file from the working project. Do not replace its values.
5. Run `npm install` if needed, then `npm run dev`.
6. Open an asset. The new **Asset DNA** panel appears below the equipment record.

For an existing/legacy tank, leave unavailable fields blank and keep their source status as **Unknown**. When a documented repair or rehabilitation is completed, add a service event and check **This work establishes a new verified coating/repair baseline** when appropriate.
