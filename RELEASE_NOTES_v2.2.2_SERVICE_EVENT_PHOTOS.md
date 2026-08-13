# PolyShield Asset IQ v2.2.2 — Service Event Photos

- Service Event now supports field photo evidence.
- Separate **Take photo** and **Photo library** actions for mobile use.
- Up to 12 photos can be attached to one service event.
- Photos can be previewed and removed before saving.
- Saved photos are tagged to the exact service-event ID and shown in the coating/repair history.
- Uses the existing asset photo storage and policies; no new Supabase migration is required.
- Photo upload failures no longer cause a duplicate service event if the tech retries.
