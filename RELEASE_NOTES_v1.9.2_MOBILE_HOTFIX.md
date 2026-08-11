# PolyShield Asset IQ v1.9.2 Mobile Hotfix

Fixes the iPhone LAN-development error:
`crypto.randomUUID is not a function`

Cause: Safari can omit `crypto.randomUUID()` when the app is opened from a plain-HTTP local network address such as `http://192.168.x.x:5173`.

Repair:
- Added a shared `randomId()` helper.
- Uses native `crypto.randomUUID()` when available.
- Falls back to `crypto.getRandomValues()` UUID generation.
- Includes a final non-cryptographic temporary-ID fallback.
- Replaced direct randomUUID use in image uploads.
- Replaced direct randomUUID use in inspection photo staging.

This fixes both Edit Asset photo saves and inspection photo additions on the phone.
