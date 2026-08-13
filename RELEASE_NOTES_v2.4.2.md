# PolyShield Asset IQ v2.4.2 — Report + Corrosion Intelligence

- Removes internal AI-review/confidence metadata from customer-facing reports.
- Removes duplicated inspection narratives from the photo evidence section.
- Recorded Observations remains the technical finding location; photos are evidence/captions only.
- Improves AI recognition of probable rust/corrosion products on steel and tells inspectors how to verify suspected coating breach/substrate exposure without claiming unmeasured metal loss.
- Logs Generate PDF and Print actions to the Supervisor audit trail with asset, inspection, user, timestamp, and format.
- Includes an additive activity-log hardening migration for installations where the v1.8 audit migration was skipped or incomplete.

## Database step
Run `supabase/migrations/20260813_v2_4_2_report_activity.sql` once before live deployment.
