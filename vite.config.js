import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { analyzePhotoPayload } from './api/analyze-photo.js'

function localAIPlugin(env) {
  return {
    name: 'polyshield-local-ai',
    configureServer(server) {
      server.middlewares.use('/api/analyze-photo', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }
        try {
          let raw = ''
          for await (const chunk of req) {
            raw += chunk
            if (raw.length > 4_500_000) throw Object.assign(new Error('Request is too large.'), { statusCode: 413 })
          }
          const payload = JSON.parse(raw || '{}')
          const analysis = await analyzePhotoPayload(payload, env)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ analysis }))
        } catch (error) {
          res.statusCode = error.statusCode || 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error.message || 'Photo analysis failed.' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
  return {
    plugins: [react(), localAIPlugin(env)],
  }
})
