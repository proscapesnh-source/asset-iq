# PolyShield Asset IQ v2.4.3 — Coating Failure Intelligence Pack

## Added
- Curated built-in visual reasoning guide covering 26 coating/corrosion/concrete/FRP failure patterns.
- Organization-scoped Knowledge Center migration that installs the same failure vocabulary plus authoritative public-source inspection guidance without overwriting customer records.
- Stronger systematic image scan instructions for welds, seams, edges, penetrations, liquid lines, repair boundaries, supports, and color/texture changes.
- Stronger rule against vague labels such as “dark spots” when rust/corrosion morphology is visually supported.
- Larger Knowledge Center context window sent to photo analysis.

## Database step
Run `supabase/migrations/20260813_v2_4_3_coating_failure_intelligence.sql` after the v2.4.2 activity migration. It is additive and idempotent.

## Important
This is curated inspection intelligence, not a claim that every web image was copied or used for model fine-tuning. Visual findings remain hypotheses until field verification when required.
