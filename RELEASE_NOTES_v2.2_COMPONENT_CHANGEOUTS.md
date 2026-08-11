# PolyShield Asset IQ v2.2 — Component Change-outs

Components now support the real maintenance lifecycle:

- Replace / retire: removes the component from the active vessel list while preserving its historical record.
- Removal date and reason are saved.
- Retired components appear under Change-out history.
- Restore: puts a retired component back into active service.
- Delete: permanently removes mistakes/duplicates; users receive a warning that history will be lost.
- AI photo-first component registration from v2.1 remains in place.

For an existing database run:
`supabase/migrations/20260811_v2_2_component_changeouts.sql`
