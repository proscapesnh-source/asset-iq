# Asset IQ Smart Registration Sprint

## Install

1. Open this folder in VS Code.
2. In Terminal run:

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev -- --host
```

3. Open the Network URL on the laptop and phone.

## Test

1. Tap **Add asset**.
2. Choose an asset template.
3. Add an overall photo using camera or photo library.
4. Optionally add a nameplate photo.
5. Review and edit the suggestions.
6. Review suggested child components.
7. Create the passport.
8. Confirm the new asset appears first in the registry and its QR opens on the phone.

## Important

The current analysis step is a simulated workflow. It demonstrates the user experience and confidence controls. Real image classification and OCR require a secure server-side AI integration; API keys must never be placed in browser code.
