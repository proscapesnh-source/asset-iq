# PolyShield Asset IQ v2.8.0 — Field Planning and Budget Control

## Technician upgrades
- Added mobile tank surface-area calculations for round and rectangular tanks.
- Calculates walls/shell, floor, roof/ceiling, appendage allowance, waste allowance, and theoretical coating gallons.
- Defaults to a 20% material contingency while remaining editable for field conditions.
- Includes an explicit verification warning so the calculator supports estimating without replacing manufacturer coverage data or field verification.

## Organization upgrades
- Added estimated repair cost, approved budget, vendor, and purchase-order number to work orders.
- Added a management budget snapshot showing open estimated work, approved budget, items awaiting approval, and work orders missing estimates.
- Budget information is shown only to owner, admin, manager, and supervisor roles on the Planning page.

## Database update
Run `supabase/migrations/20260904_v2_8_planning_tools.sql` before deploying this release.
