# PolyShield AI Photo Intelligence — One-time setup

The application code is already wired for AI photo analysis. You only need to add a server-side OpenAI API key.

## Localhost (VS Code)

Open the existing `.env` file and add ONE new line at the bottom:

```text
OPENAI_API_KEY=your_api_key_here
```

Important: do **not** name it `VITE_OPENAI_API_KEY`. Keeping `VITE_` off the name prevents Vite from exposing the secret to browser code.

Restart the local server after saving:

```bash
npm run dev
```

Open an inspection, add a photo, and click **Analyze with AI**.

## Vercel production

In Vercel, add an Environment Variable named:

```text
OPENAI_API_KEY
```

Then redeploy. The serverless function at `/api/analyze-photo` will use that key without sending it to the browser.

## Inspector workflow

1. Add an inspection photo.
2. Tap **Analyze with AI**.
3. Review the proposed title, visible defects, severity, confidence, and suggested next steps.
4. Tap **Apply AI draft to photo** only if the inspector agrees.
5. Edit any field as needed.
6. Complete the inspection.
7. Generate the report. Reviewed AI findings appear in the Photo Intelligence section.

## Guardrails built into v1.3

The AI is instructed not to infer wall thickness, structural integrity, remaining service life, leak probability, or fitness for service from a photograph alone. It can suggest measurements, UT testing, maintenance review, or engineering review, but the inspector remains responsible for accepting or correcting the draft.
