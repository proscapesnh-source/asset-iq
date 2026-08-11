# PolyShield Asset IQ v1

Clean React/Vite + Supabase build for the new PolyShield Asset IQ Supabase project.

## Included core workflow

- Email/password authentication and sign-out
- Automatic organization bootstrap for the first signed-in user
- Asset registry with search/filtering
- Asset creation with real private Storage cover photos
- Correct `object-fit: cover` thumbnails from signed Supabase Storage URLs
- Asset passport with QR code, equipment details, photo gallery, and inspection history
- Multi-photo field inspections with categories, notes, and markup notes
- Health score/status updates after inspections
- Automatic work orders for Repair / Engineering Review findings
- Manual work-order creation and status workflow
- Dashboard metrics and recent inspection activity
- Mobile/desktop responsive layout
- Vercel SPA rewrite configuration

## Fresh Supabase setup

Run `supabase/setup.sql` once in the new Supabase project's SQL Editor.

Then create `.env` from `.env.example`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_STORAGE_BUCKET=inspection-photos
```

Never put the Supabase secret/service-role key in the browser app.

## Local run

```bash
npm install
npm run dev
```

## Production check

```bash
npm run build
```

Then deploy the repository/project folder to Vercel and add the same `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_STORAGE_BUCKET` environment variables in Vercel.

## Scope note

AI visual analysis and true draw-on-photo markup are intentionally not faked. The inspection/photo schema already has a place for annotation notes; those can be extended with a secure server-side AI/annotation layer after the production core is live.

## Report Engine v2
The asset passport now includes a modular professional inspection report under `src/reports/`.
Open any asset with an inspection and use **Generate latest report** or **Generate report** on a historical inspection.
Use **Generate PDF** and choose **Save as PDF** in the browser print dialog.

## AI Photo Intelligence (v1.3)
See `AI_SETUP.md` for the one-time server-side API key setup. After that, use **Analyze with AI** on any new inspection photo and review the draft before applying it.
