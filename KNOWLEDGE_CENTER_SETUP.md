# PolyShield Knowledge Center v1.4

This version adds organization-specific AI grounding for coating systems, failure modes, repair methods, and inspection standards.

## One-time Supabase migration

Open your existing Supabase project -> SQL Editor -> New query.
Paste the full contents of:

`supabase/knowledge_center_v1_4.sql`

Run it once.

## Start the app

```bash
npm install
npm run dev
```

Open **Knowledge** in the PolyShield navigation. You can load the safe starter knowledge set, then replace/add records with the exact products, repair procedures, and standards your organization uses.

## AI behavior

The photo analyzer now receives a compact copy of your Knowledge Center records. It is explicitly instructed to:

- separate visible observations from inference;
- classify coating family cautiously;
- avoid naming an exact product from appearance alone;
- name an exact product only when the supplied knowledge/context supports the match;
- flag possible previous repairs cautiously;
- use company failure/repair vocabulary as guidance, not as proof.
