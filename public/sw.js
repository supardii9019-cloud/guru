const CACHE_NAME = 'sekolah-v3'
const STATIC_ASSETS = [
  '/guru/',
  '/guru/index.html',
  '/guru/manifest.json',
  '/guru/icon-192.png',
  '/guru/icon-512.png'
]

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS))
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('supabase.co')) return
  if (e.request.url.includes('fonts.googleapis')) return
  if (e.request.url.includes('fonts.gstatic')) return

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
          }
          return res
        })
        .catch(() => cached)

      return cached || fetchPromise
    })
  )
})
