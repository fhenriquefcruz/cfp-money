const LIMIT = 4
const key = (uid) => `meu_real_navigation_${uid}`

const filter = (items, allowed) =>
  [...new Set(Array.isArray(items) ? items : [])]
    .filter((item) => allowed.includes(item))
    .slice(0, LIMIT)

export function readNavigationPreferences(uid, allowed, storage = globalThis.localStorage) {
  if (!uid || !storage) return { favorites: [], recents: [] }

  try {
    const value = JSON.parse(storage.getItem(key(uid)) || '{}')
    return {
      favorites: filter(value.favorites, allowed),
      recents: filter(value.recents, allowed),
    }
  } catch {
    return { favorites: [], recents: [] }
  }
}

const write = (uid, value, storage) => {
  try {
    storage?.setItem(key(uid), JSON.stringify(value))
  } catch {
    // Preferências locais não podem bloquear a navegação.
  }
  return value
}

export function registerRecentNavigation(uid, path, allowed, storage = globalThis.localStorage) {
  const value = readNavigationPreferences(uid, allowed, storage)
  if (!uid || !allowed.includes(path)) return value

  return write(
    uid,
    { ...value, recents: [path, ...value.recents.filter((item) => item !== path)].slice(0, LIMIT) },
    storage,
  )
}

export function toggleFavoriteNavigation(uid, path, allowed, storage = globalThis.localStorage) {
  const value = readNavigationPreferences(uid, allowed, storage)
  if (!uid || !allowed.includes(path)) return value

  const favorites = value.favorites.includes(path)
    ? value.favorites.filter((item) => item !== path)
    : [path, ...value.favorites].slice(0, LIMIT)

  return write(uid, { ...value, favorites }, storage)
}

export function prioritizeNavigationPages(pages, favorites = [], recents = [], current = '') {
  const map = new Map(pages.map((page) => [page[1], page]))
  const paths = [...new Set([...favorites, ...recents.filter((path) => path !== current), ...map.keys()])]
  return paths.map((path) => map.get(path)).filter(Boolean)
}

export const FAVORITE_LIMIT = LIMIT
