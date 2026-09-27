const clean = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const row = (id, label, to, kind, context = '') => ({
  id,
  label,
  to,
  kind,
  context,
  searchable: clean(`${label} ${context}`),
})

export function searchGlobal({
  query = '',
  pages = [],
  transactions = [],
  categories = [],
  goals = [],
  creditCards = [],
} = {}) {
  const rows = [
    ...pages.map(([label, to]) => row(`page:${to}`, label, to, 'page')),
    ...transactions.map((item, index) => {
      const label = item.description || item.categoryName || 'Transação'
      const context = item.categoryName ? `Transação · ${item.categoryName}` : 'Transação'

      return row(
        `transaction:${item.id || index}`,
        label,
        `/transactions?search=${encodeURIComponent(label)}&scope=all`,
        'transaction',
        context,
      )
    }),
    ...categories.map((item, index) =>
      row(
        `category:${item.id || index}`,
        item.name || 'Categoria',
        '/categories',
        'category',
      ),
    ),
    ...goals.map((item, index) =>
      row(
        `goal:${item.id || index}`,
        item.name || 'Meta',
        '/goals',
        'goal',
      ),
    ),
    ...creditCards.map((item, index) =>
      row(
        `card:${item.id || index}`,
        item.name || 'Cartão',
        '/cards',
        'card',
        item.last4 ? `Cartão Final ${item.last4}` : 'Cartão',
      ),
    ),
  ]

  const queryText = clean(query)
  if (!queryText) return rows.filter(({ kind }) => kind === 'page').slice(0, 8)

  const words = queryText.split(' ')

  return rows
    .filter(({ searchable }) => words.every((word) => searchable.includes(word)))
    .sort((a, b) => {
      const left = clean(a.label)
      const right = clean(b.label)
      const exact = Number(right === queryText) - Number(left === queryText)
      if (exact) return exact

      const prefix = Number(right.startsWith(queryText)) - Number(left.startsWith(queryText))
      return prefix || left.localeCompare(right)
    })
    .slice(0, 10)
}

export { clean as normalizeGlobalSearchText }
