# Payroll Google Sheets integration

This feature retains the existing time clock, supervisor time correction audit trail, and GPS capture. It does **not** approve payroll automatically.

## Supervisor actions

In Time Clock > Crew timesheets, a supervisor can:
- **Export for Google Sheets (CSV)**: download detailed shift records and GPS fields.
- **Last week payroll CSV**: download grouped completed hours for the previous Monday–Sunday in the browser's local time zone. Open shifts and corrections are flagged for manual review.
- **Send last week to Google Sheets**: send an idempotent weekly snapshot (three sheets: Payroll, Shifts, GPS) via the backend.

Only authenticated owner/admin/manager/supervisor roles can invoke the remote Sheets sync. The service account has access only to the spreadsheet that is explicitly shared with it. No service key or Google private key goes to the browser.

## Required setup (before direct sync can work)

1. Create or choose a **private** Google spreadsheet for payroll.
2. In a Google Cloud project, enable **Google Sheets API** and create a service account. Share the spreadsheet with the service account email as an Editor. Do not make the sheet public.
3. Set these **Supabase Edge Function secrets** on the PolyShield project:
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: full service account JSON with private key.
   - `GOOGLE_SHEET_ID`: spreadsheet ID from its URL.
   - `PAYROLL_ORG_ID`: PolyShield organization UUID that owns these time entries.
   - `PAYROLL_SYNC_TOKEN`: a long, random, secret value for the weekly scheduler.
   - Standard `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be available to the function.
4. Deploy `supabase/functions/payroll-google-sheets/index.ts` as `payroll-google-sheets` with platform JWT verification disabled **only because the function verifies supervisor JWTs itself or checks the scheduling secret**.
5. Add the same `PAYROLL_SYNC_TOKEN` value to the GitHub Actions repository secret. This turns on `.github/workflows/weekly-payroll-sheets.yml`.
6. Test a manual export as a supervisor, and verify the three sheets in Google Sheets before trusting automation. Test a technician account; it should receive HTTP 403.

The weekly GitHub Action runs Mondays at **14:00 UTC** (8 AM CST / 9 AM CDT) and exports the previous **America/Chicago Monday–Sunday** interval. GitHub Actions scheduled runs may be delayed. If the GitHub secret is absent, it skips safely.

Each run replaces the three **week-specific** tabs and does not modify other tabs or historical payroll weeks. It includes completed hours clipped to the calendar week and flags unclosed shifts and corrections. It is a report for review, not a certified payroll calculation. Break deduction, overtime rules, payroll approvals, and tax deductions are **not** automated.

## Operational caveats

- The currently configured integration supports **one organization and one spreadsheet**, via project secrets. Multi-organization Google Sheets connection management requires a separate enhancement.
- Rotating the service account key, changing the spreadsheet, or moving organizations requires updating server secrets.
- Triggering manual sync before setup returns a configuration error and leaves existing time entries untouched.
- The CSV exports do **not** write to Google Sheets; they can be imported manually in Google Sheets.
- Do not share the GPS sheet broadly; location is sensitive employee data. Payroll operators should control spreadsheet sharing.
