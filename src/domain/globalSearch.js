const PAGES = [
  ['Dashboard', '/dashboard'],
  ['Money', '/money'],
  ['Cartões', '/cards'],
  ['Transações', '/transactions'],
  ['Categorias', '/categories'],
  ['Metas', '/goals'],
  ['Orçamentos', '/budgets'],
  ['Relatórios', '/reports'],
  ['Perfil', '/profile'],
]

export const normalizeGlobalSearchText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const result = (kind, id, label, to, terms = '') => ({
  id: `${kind}-${id}`,
  kind,
  label,
  to,
  searchText: normalizeGlobalSearchText(`${label} ${terms}`),
})

export function buildGlobalSearchIndex({
  transactions = [],
  categories = [],
  goals = [],
  creditCards = [],
  isAdmin = false,
} = {}) {
  const pages = isAdmin ? [...PAGES, ['Admin', '/admin']] : PAGES

  return [
    ...pages.map(([label, to]) => result('module', to, label, to)),
    ...transactions.map((item) => {
      const label = item.description || item.categoryName || 'Transação'
      return result(
        'transaction',
        item.id,
        label,
        `/transactions?search=${encodeURIComponent(label)}`,
        [item.categoryName, item.notes, item.paymentMethod, item.date, item.amount].join(' '),
      )
    }),
    ...categories.map((item) =>
      result('category', item.id, item.name || 'Categoria', '/categories', item.type),
    ),
    ...goals.map((item) =>
      result('goal', item.id, item.name || 'Meta', '/goals', [item.deadline, item.targetAmount].join(' ')),
    ),
    ...creditCards.map((item) =>
      result('card', item.id, item.name || 'Cartão', '/cards', [item.brand, item.last4].join(' ')),
    ),
  ]
}

export function searchGlobalIndex(index = [], query = '', limit = 8) {
  const normalized = normalizeGlobalSearchText(query)
  if (!normalized) return index.filter((item) => item.kind === 'module').slice(0, limit)

  const words = normalized.split(' ').filter(Boolean)

  return index
    .filter((item) => words.every((word) => item.searchText.includes(word)))
    .sort((a, b) => {
      const aLabel = normalizeGlobalSearchText(a.label)
      const bLabel = normalizeGlobalSearchText(b.label)
      const score = (label) =>
        label === normalized ? 3 : label.startsWith(normalized) ? 2 : label.includes(normalized) ? 1 : 0
      return score(bLabel) - score(aLabel)
    })
    .slice(0, limit)
}
