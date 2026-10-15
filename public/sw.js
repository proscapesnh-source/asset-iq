const CACHE = 'polyshield-field-v2.9.1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('polyshield-field-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  event.respondWith((async () => {
    try {
      const response = await fetch(request)
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE)
        await cache.put(request, response.clone()).catch(() => {})
      }
      return response
    } catch (error) {
      const cached = await caches.match(request)
      if (cached) return cached
      if (request.mode === 'navigate') {
        const fallback = await caches.match('/index.html')
        if (fallback) return fallback
      }
      throw error
    }
  })())
})
