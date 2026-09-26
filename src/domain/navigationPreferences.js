const EMPTY = { favorites: [], recents: [] }
const FAVORITE_LIMIT = 4
const RECENT_LIMIT = 4

const keyFor = (uid) => `meu_real_navigation_${uid}`
const unique = (values) => [...new Set(values)]

const validPaths = (values, allowedPaths) => {
  const allowed = new Set(allowedPaths)
  return unique(Array.isArray(values) ? values : []).filter(
    (path) => typeof path === 'string' && allowed.has(path),
  )
}

export function normalizeNavigationPreferences(value, allowedPaths = []) {
  return {
    favorites: validPaths(value?.favorites, allowedPaths).slice(0, FAVORITE_LIMIT),
    recents: validPaths(value?.recents, allowedPaths).slice(0, RECENT_LIMIT),
  }
}

export function readNavigationPreferences(uid, allowedPaths, storage = globalThis.localStorage) {
  if (!uid || !storage) return EMPTY

  try {
    return normalizeNavigationPreferences(
      JSON.parse(storage.getItem(keyFor(uid)) || '{}'),
      allowedPaths,
    )
  } catch {
    return EMPTY
  }
}

const save = (uid, value, storage) => {
  try {
    if (uid && storage) storage.setItem(keyFor(uid), JSON.stringify(value))
  } catch {
    // Preferências locais nunca devem impedir a navegação.
  }
  return value
}

export function registerRecentNavigation(
  uid,
  path,
  allowedPaths,
  storage = globalThis.localStorage,
) {
  const current = readNavigationPreferences(uid, allowedPaths, storage)
  if (!allowedPaths.includes(path)) return current

  return save(
    uid,
    {
      ...current,
      recents: [path, ...current.recents.filter((item) => item !== path)].slice(0, RECENT_LIMIT),
    },
    storage,
  )
}

export function toggleFavoriteNavigation(
  uid,
  path,
  allowedPaths,
  storage = globalThis.localStorage,
) {
  const current = readNavigationPreferences(uid, allowedPaths, storage)
  if (!allowedPaths.includes(path)) return current

  const exists = current.favorites.includes(path)
  return save(
    uid,
    {
      ...current,
      favorites: exists
        ? current.favorites.filter((item) => item !== path)
        : [path, ...current.favorites].slice(0, FAVORITE_LIMIT),
    },
    storage,
  )
}

export function prioritizeNavigationPages(pages, favorites = [], recents = [], currentPath = '') {
  const byPath = new Map(pages.map((page) => [page[1], page]))
  const order = unique([
    ...favorites,
    ...recents.filter((path) => path !== currentPath),
    ...pages.map((page) => page[1]),
  ])

  return order.map((path) => byPath.get(path)).filter(Boolean)
}

export { FAVORITE_LIMIT, RECENT_LIMIT }
