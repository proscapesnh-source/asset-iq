# PolyShield Asset IQ v1.6 — Asset DNA

## Added
- Legacy-friendly Asset DNA on every asset passport.
- Unknown / not documented is a first-class state; no original history is required.
- Provenance labels: Documented, Inspector Confirmed, Customer Reported, AI Inferred, Unknown.
- Original / earliest-known coating and current documented coating records.
- Repair, rehabilitation, recoat, replacement, and other dated service-history events.
- A repair/rehab can establish a new verified baseline and automatically update the current coating record.
- Asset DNA and service history are supplied to AI photo analysis.
- AI confidence normalization: model values such as 0.86 are displayed as 86%.

## Fixed
- Removed the duplicate Analyze with AI button from the uploaded working source.

## Database
Run `supabase/migrations/20260810_v1_6_asset_dna.sql` once before opening v1.6.
The migration is additive and does not delete or replace existing asset, inspection, photo, report, work-order, or Knowledge Center data.
