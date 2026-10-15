# PolyShield Asset IQ v2.7.0 — Field Learning and Comparison

## Added
- Technician-corrected AI findings are stored as organization-scoped verified feedback.
- Relevant verified corrections are supplied to future photo analyses as precedent.
- Offline inspection completion stores the full form and photo files safely on the phone using IndexedDB.
- Queued inspections synchronize automatically after connectivity returns.
- Client submission IDs prevent a synchronized inspection from being created twice.
- Asset Passports compare the two latest inspections, including health-score change, first photo, and newly classified findings.

## Database update
Run `supabase/migrations/20260828_v2_7_learning_reliability.sql` in Supabase before deploying.

## Safety
- Learning remains isolated by organization.
- Corrections affect later prompts but do not retrain the underlying foundation model.
- AI findings remain drafts until a technician applies or corrects them.
