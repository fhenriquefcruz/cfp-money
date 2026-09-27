const LIMIT = 4
const key = (uid) => `meu_real_navigation_${uid}`

export function readNavigationFavorites(uid, allowed, storage = globalThis.localStorage) {
  if (!uid || !storage) return []

  try {
    const values = JSON.parse(storage.getItem(key(uid)) || '[]')
    return [...new Set(Array.isArray(values) ? values : [])]
      .filter((path) => allowed.includes(path))
      .slice(0, LIMIT)
  } catch {
    return []
  }
}

export function toggleNavigationFavorite(uid, path, allowed, storage = globalThis.localStorage) {
  const current = readNavigationFavorites(uid, allowed, storage)
  if (!uid || !allowed.includes(path)) return current

  const next = current.includes(path)
    ? current.filter((item) => item !== path)
    : [path, ...current].slice(0, LIMIT)

  try {
    storage?.setItem(key(uid), JSON.stringify(next))
  } catch {
    // Preferências locais não podem bloquear a navegação.
  }

  return next
}

export function prioritizeNavigationPages(pages, favorites = []) {
  const map = new Map(pages.map((page) => [page[1], page]))
  const order = [...new Set([...favorites, ...map.keys()])]
  return order.map((path) => map.get(path)).filter(Boolean)
}

export const FAVORITE_LIMIT = LIMIT
