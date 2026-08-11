# PolyShield Asset IQ v1.9 — QR Tags

## Added
- **Print QR tag** on each Digital Asset Passport.
- Dedicated 3-inch print layout with QR code, organization, asset name and asset tag.
- **Order QR tag** modal tied directly to the asset.
- Materials: vinyl sticker, laminated outdoor sticker, anodized aluminum plaque, stainless steel plaque.
- Tag size and quantity selection.
- Asset-linked production request stored in `qr_tag_orders`.
- Supervisor/audit log entry when an order is submitted.

## Database
Run `supabase/migrations/20260810_v1_9_qr_tags.sql` once after v1.8.

## Fulfillment boundary
v1.9 records a real production/order request inside PolyShield. It does **not** charge a credit card or transmit the job to a physical tag manufacturer yet. A vendor/commerce integration can be attached to these requests later without changing the asset workflow.
