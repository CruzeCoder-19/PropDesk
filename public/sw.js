// PropDesk Service Worker — network-first with static asset caching
const CACHE_NAME = 'propdesk-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Never intercept API calls or authentication flows
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/auth/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache immutable static Next.js chunks and media assets
        if (
          response.ok &&
          (url.pathname.startsWith('/_next/static/') ||
            /\.(ico|svg|png|jpg|jpeg|webp|woff2|css)$/.test(url.pathname))
        ) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
