const CACHE_NAME = 'direto-na-porta-shell-v4-logo-padded'
const APP_SHELL = ['/', '/index.html', '/logo-pwa.png', '/manifest.webmanifest']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  // O catálogo sempre tenta buscar dados novos; o cache serve apenas como fallback offline.
  if (new URL(request.url).pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
        return response
      }).catch(() => caches.match(request))
    )
    return
  }

  // Para a página, prioriza a versão nova do deploy e usa o cache se estiver sem conexão.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
        return response
      }).catch(() => caches.match('/index.html'))
    )
    return
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone()
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
      return response
    }))
  )
})
