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

const clean = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const row = (label, to, terms = '') => [label, to, clean(`${label} ${terms}`)]

export function searchGlobal({
  query = '',
  transactions = [],
  categories = [],
  goals = [],
  creditCards = [],
  isAdmin = false,
  limit = 8,
} = {}) {
  const pages = isAdmin ? [...PAGES, ['Admin', '/admin']] : PAGES
  const rows = [
    ...pages.map(([label, to]) => row(label, to)),
    ...transactions.map((item) => {
      const label = item.description || item.categoryName || 'Transação'
      return row(
        label,
        `/transactions?search=${encodeURIComponent(label)}`,
        [item.categoryName, item.notes, item.paymentMethod, item.date, item.amount].join(' '),
      )
    }),
    ...categories.map((item) => row(item.name || 'Categoria', '/categories', item.type)),
    ...goals.map((item) =>
      row(item.name || 'Meta', '/goals', [item.deadline, item.targetAmount].join(' ')),
    ),
    ...creditCards.map((item) =>
      row(item.name || 'Cartão', '/cards', [item.brand, item.last4].join(' ')),
    ),
  ]
  const normalized = clean(query)
  if (!normalized) return rows.slice(0, limit).map(([label, to]) => ({ label, to }))

  const words = normalized.split(/\s+/)
  return rows
    .filter((item) => words.every((word) => item[2].includes(word)))
    .sort((a, b) => Number(clean(b[0]).startsWith(normalized)) - Number(clean(a[0]).startsWith(normalized)))
    .slice(0, limit)
    .map(([label, to]) => ({ label, to }))
}

export { clean as normalizeGlobalSearchText }
