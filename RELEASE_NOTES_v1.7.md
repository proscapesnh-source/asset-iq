# PolyShield Asset IQ v1.7 — Field Lifecycle

## Added
- Lifecycle & ownership history for sale/transfer, decommissioning, replacement, out-of-service, return-to-service and retirement/scrap.
- Current lifecycle status stored in Asset DNA without deleting historical records.
- Asset registry lifecycle filter; dashboard active-fleet counts exclude decommissioned/sold/replaced/retired assets.
- Installable Progressive Web App (PWA) manifest and production service worker.
- Phone camera capture for inspection and asset photos.
- Online/offline field indicator.
- Inspection form autosaves locally on the device. If connectivity is lost, form fields remain available; photo upload, AI analysis and final Supabase sync still require connectivity in v1.7.
- Larger field touch targets and five-item mobile navigation.

## Database
Run `supabase/migrations/20260810_v1_7_field_lifecycle.sql` once after v1.6. The migration is additive and does not delete existing asset data.

## Field installation
Deploy over HTTPS (for example Vercel). On Android/Chrome use the Install prompt when offered. On iPhone/Safari use Share → Add to Home Screen.
