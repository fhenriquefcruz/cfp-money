import {
  FAVORITE_LIMIT,
  prioritizeNavigationPages,
  readNavigationPreferences,
  registerRecentNavigation,
  toggleFavoriteNavigation,
} from './navigationPreferences'

const allowed = ['/dashboard', '/transactions', '/goals', '/reports', '/profile']

const storage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  }
}

test('isola preferências por usuário e ignora rotas não autorizadas', () => {
  const local = storage()

  toggleFavoriteNavigation('u1', '/goals', allowed, local)
  toggleFavoriteNavigation('u1', '/admin', allowed, local)

  expect(readNavigationPreferences('u1', allowed, local).favorites).toEqual(['/goals'])
  expect(readNavigationPreferences('u2', allowed, local).favorites).toEqual([])
})

test('mantém recentes sem duplicidade e com o mais novo primeiro', () => {
  const local = storage()

  registerRecentNavigation('u1', '/dashboard', allowed, local)
  registerRecentNavigation('u1', '/goals', allowed, local)
  registerRecentNavigation('u1', '/dashboard', allowed, local)

  expect(readNavigationPreferences('u1', allowed, local).recents).toEqual([
    '/dashboard',
    '/goals',
  ])
})

test('limita favoritos para manter a experiência simples', () => {
  const local = storage()

  for (const path of allowed) toggleFavoriteNavigation('u1', path, allowed, local)

  expect(readNavigationPreferences('u1', allowed, local).favorites).toHaveLength(FAVORITE_LIMIT)
})

test('prioriza favoritos e recentes sem repetir a página atual', () => {
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
