import {
  FAVORITE_LIMIT,
  prioritizeNavigationPages,
  readNavigationFavorites,
  toggleNavigationFavorite,
} from './navigationPreferences'

const allowed = ['/dashboard', '/transactions', '/goals', '/reports', '/profile']

const createStorage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  }
}

test('isola favoritos por usuário e ignora rotas não autorizadas', () => {
  const storage = createStorage()

  toggleNavigationFavorite('u1', '/goals', allowed, storage)
  toggleNavigationFavorite('u1', '/admin', allowed, storage)

  expect(readNavigationFavorites('u1', allowed, storage)).toEqual(['/goals'])
  expect(readNavigationFavorites('u2', allowed, storage)).toEqual([])
})

test('limita favoritos para manter a experiência simples', () => {
  const storage = createStorage()

  for (const path of allowed) toggleNavigationFavorite('u1', path, allowed, storage)

  expect(readNavigationFavorites('u1', allowed, storage)).toHaveLength(FAVORITE_LIMIT)
})

test('prioriza favoritos sem alterar os módulos restantes', () => {
  const pages = [
    ['Dashboard', '/dashboard'],
    ['Transações', '/transactions'],
    ['Metas', '/goals'],
    ['Relatórios', '/reports'],
  ]

  expect(prioritizeNavigationPages(pages, ['/reports', '/goals']).map(([, path]) => path)).toEqual([
    '/reports',
    '/goals',
    '/dashboard',
    '/transactions',
  ])
})
