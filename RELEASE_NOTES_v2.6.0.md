# PolyShield Asset IQ v2.6.0 — Device Photos & Nameplate Reading

This release builds on the complete v2.5.0 field-stabilization release.

## Added
- Camera photos remain attached to the PolyShield record and can be saved through the explicit **Save to Phone** action.
- Vessel nameplate/data-tag scanning on Add Asset uses AI to draft visible manufacturer, model, serial number, asset tag, date, capacity, pressure, temperature, material, and other legible ratings for technician review.
- Nameplate captures remain available in PolyShield and can be saved through the photo viewer.
- Tapping any photo in PolyShield opens a full-screen viewer with **Save to Phone**. On iPhone this opens the native share sheet so the user can choose **Save Image** and place the photo in the Photos gallery.

## Preserved from v2.5.0
- Forgot-password and production auth redirect fixes.
- QR deep links for organization members and protected new-user passports.
- Technician AI correction and Correct + re-analyze.
- Print-safe letter report layout.

## Platform note
- Android browsers normally store automatic PWA saves in Downloads. iOS may store them in Files because Safari does not permit a web/PWA app to silently write directly to the Photos album.
