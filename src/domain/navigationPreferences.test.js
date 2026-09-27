import {
  FAVORITE_LIMIT,
  prioritizeNavigationPages,
  readNavigationPreferences,
  registerRecentNavigation,
  toggleFavoriteNavigation,
} from './navigationPreferences'

const allowed = ['/dashboard', '/transactions', '/goals', '/reports', '/profile']

const createStorage = () => {
  const values = new Map()

  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  }
}

test('isola preferências por usuário e ignora rotas não autorizadas', () => {
  const storage = createStorage()

  toggleFavoriteNavigation('u1', '/goals', allowed, storage)
  toggleFavoriteNavigation('u1', '/admin', allowed, storage)

  expect(readNavigationPreferences('u1', allowed, storage).favorites).toEqual(['/goals'])
  expect(readNavigationPreferences('u2', allowed, storage).favorites).toEqual([])
})

test('mantém recentes sem duplicidade e com o mais novo primeiro', () => {
  const storage = createStorage()

  registerRecentNavigation('u1', '/dashboard', allowed, storage)
  registerRecentNavigation('u1', '/goals', allowed, storage)
  registerRecentNavigation('u1', '/dashboard', allowed, storage)

  expect(readNavigationPreferences('u1', allowed, storage).recents).toEqual([
    '/dashboard',
    '/goals',
  ])
})

test('limita favoritos para manter a experiência simples', () => {
  const storage = createStorage()

  for (const path of allowed) toggleFavoriteNavigation('u1', path, allowed, storage)

  expect(readNavigationPreferences('u1', allowed, storage).favorites).toHaveLength(FAVORITE_LIMIT)
})

test('prioriza favoritos e recentes sem repetir a página atual antes dos módulos restantes', () => {
  const pages = [
    ['Dashboard', '/dashboard'],
    ['Transações', '/transactions'],
    ['Metas', '/goals'],
    ['Relatórios', '/reports'],
  ]

  expect(
    prioritizeNavigationPages(pages, ['/reports'], ['/dashboard', '/goals'], '/dashboard').map(
      ([, path]) => path,
    ),
  ).toEqual(['/reports', '/goals', '/dashboard', '/transactions'])
})
