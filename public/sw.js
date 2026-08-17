const SW_VERSION = '__SW_VERSION__'
const BASE_PATH = new URL(self.registration.scope).pathname
const OFFLINE_PATH = `${BASE_PATH}offline.html`
const SHELL_CACHE = `meu-real-shell-${SW_VERSION}`
const ASSET_CACHE = `meu-real-assets-${SW_VERSION}`
const CACHE_PREFIXES = ['meu-real-shell-', 'meu-real-assets-']

const SHELL_URLS = [
  BASE_PATH,
  OFFLINE_PATH,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}icon.svg`,
  `${BASE_PATH}icon-192.png`,
  `${BASE_PATH}icon-512.png`,
]

const PRECACHE_URLS = /* __PRECACHE_MANIFEST__ */ []
const PRECACHE_URL_SET = new Set(
  PRECACHE_URLS.map((url) => new URL(url, self.registration.scope).pathname),
)
const SHELL_URL_SET = new Set(SHELL_URLS)

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)),
      caches.open(ASSET_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
    ]),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
                key !== SHELL_CACHE &&
                key !== ASSET_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  if (event.data?.type === 'GET_VERSION') {
    event.ports?.[0]?.postMessage({
      version: SW_VERSION,
      shellCache: SHELL_CACHE,
      assetCache: ASSET_CACHE,
    })
  }
})

const isBlockedRequest = (request, url) => {
  if (request.method !== 'GET') return true
  if (url.origin !== self.location.origin) return true
  if (!url.pathname.startsWith(BASE_PATH)) return true
  if (request.headers.has('authorization')) return true

  return [
    `${BASE_PATH}api/`,
    `${BASE_PATH}__/`,
    `${BASE_PATH}functions/`,
    `${BASE_PATH}firestore/`,
  ].some((prefix) => url.pathname.startsWith(prefix))
}

const cacheForPath = (pathname) => {
  if (SHELL_URL_SET.has(pathname)) return SHELL_CACHE
  if (PRECACHE_URL_SET.has(pathname)) return ASSET_CACHE
  return null
}

const respondToNavigation = async (request) => {
  try {
    const response = await fetch(request)

    if (response.ok) {
      const shell = await caches.open(SHELL_CACHE)
      await shell.put(BASE_PATH, response.clone())
    }

    return response
  } catch {
    return (await caches.match(BASE_PATH)) || caches.match(OFFLINE_PATH)
  }
}

const respondToStaticAsset = async (request, cacheName) => {
  const cached = await caches.match(request, { ignoreSearch: true })
  if (cached) return cached

  const response = await fetch(request)

  if (response.ok) {
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
  }

  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (isBlockedRequest(request, url)) return

  if (request.mode === 'navigate') {
    event.respondWith(respondToNavigation(request))
    return
  }

  const cacheName = cacheForPath(url.pathname)
  if (!cacheName) return

  event.respondWith(respondToStaticAsset(request, cacheName))
})
