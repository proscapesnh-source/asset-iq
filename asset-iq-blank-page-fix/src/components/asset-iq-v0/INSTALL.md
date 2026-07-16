# Asset IQ Working Build

This build includes:
- Stable asset creation with no blank passport screen
- Defensive handling for incomplete older asset records
- Compressed photos to reduce browser-storage failures
- Digital Asset Passport and QR panel
- Inspection records saved to the asset timeline
- Detailed repair records with contractor, work, materials, testing, verification, warranty, and before/during/after photos
- Production build verified with `npm run build`

## Install
1. Stop the development server with Control+C.
2. Back up your current project or commit it to Git.
3. Copy the contents of this folder into the existing `asset-iq-smart-registration` folder and replace matching files.
4. Run:
   npm install
   npm run dev
5. Open the exact Local address shown by Vite.

## Test
Add Asset → add an overall photo → review details → Create asset passport.
The new passport should open immediately. Then test New Inspection and Repair Record.
