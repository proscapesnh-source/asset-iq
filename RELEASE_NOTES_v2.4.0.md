# PolyShield Asset IQ v2.4.0 — Inspection Intelligence + Multi-Site

## Included
- Organization → Sites → Assets hierarchy.
- Existing asset `facility` names migrate into formal Sites.
- Site filtering in the asset registry.
- Dashboard Active Assets and Needs Attention cards open filtered asset views.
- Cross-site “Similar repairs” intelligence on asset records.
- Organization report branding with uploaded customer logo and report display name.
- AI photo analysis now looks for subtle indicators, alternate causes, specific “inspect next” actions, inspector challenges, and potential standards/code concerns.
- Compliance findings are treated as potential concerns requiring applicability and field verification, not automatic code-violation declarations.

## Database step
Run `supabase/migrations/20260813_v2_4_sites_branding.sql` in Supabase SQL Editor after the existing migrations.

## Deployment
After the SQL migration, push this source to the existing GitHub repository. Vercel can redeploy from the repository as before.
