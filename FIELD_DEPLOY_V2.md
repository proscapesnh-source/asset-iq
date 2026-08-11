# PolyShield Asset IQ v2.0 — Field Deployment

This build is installable as a phone PWA when served from the deployed HTTPS site.

## Required one-time database step
Run this migration in the Supabase SQL editor:
`supabase/migrations/20260811_v2_0_asset_components.sql`

That turns on vessel child components.

## Deploy today
1. Replace the current project with this folder.
2. Keep the existing `.env` values from the working project.
3. Run `npm install`.
4. Run `npm run build`.
5. Push/deploy to the existing Vercel project.
6. Open the HTTPS Vercel address on each worker's phone.
7. iPhone: Safari → Share → Add to Home Screen.
8. Android: Chrome → Install app / Add to Home screen.

Do not distribute the local `192.168.x.x` address. It only works on the same Wi-Fi and is not the field deployment URL.

## Field acceptance test
- Sign in.
- Open vessel.
- Edit and save asset.
- Add a vessel component.
- Edit component condition and verify health changes.
- Start inspection.
- Test talk-to-text.
- Take a photo.
- Select a photo from library.
- Complete inspection.
- Generate report.
- Open QR / Tag.
- Install app to Home Screen and reopen it from the icon.
