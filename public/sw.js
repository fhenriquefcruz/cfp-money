const CACHE_VERSION = 'meu-real-shell-v1'
const BASE_PATH = '/cfp-money/'
const OFFLINE_PATH = `${BASE_PATH}offline.html`
const APP_SHELL = [
  BASE_PATH,
  OFFLINE_PATH,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}icon.svg`,
  `${BASE_PATH}icon-192.png`,
  `${BASE_PATH}icon-512.png`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

const isStaticAppAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith(`${BASE_PATH}assets/`) ||
    url.pathname === `${BASE_PATH}manifest.json` ||
    url.pathname.startsWith(`${BASE_PATH}icon`))

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_VERSION).then((cache) => cache.put(BASE_PATH, copy))
          }
          return response
        })
        .catch(async () => (await caches.match(BASE_PATH)) || caches.match(OFFLINE_PATH)),
    )
    return
  }

  if (!isStaticAppAsset(url)) return

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
