const clean = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const makeResult = ({ id, label, to, kind, context = '', terms = '' }) => ({
  id,
  label,
  to,
  kind,
  context,
  searchable: clean(`${label} ${context} ${terms}`),
})

const result = ({ searchable, ...item }) => item

export function searchGlobal({
  query = '',
  pages = [],
  transactions = [],
  categories = [],
  goals = [],
  creditCards = [],
} = {}) {
  const rows = [
    ...pages.map(([label, to]) =>
      makeResult({
        id: `page:${to}`,
        label,
        to,
        kind: 'page',
        context: 'Área do Meu Real',
      }),
    ),
    ...transactions.map((item, index) => {
      const label = item.description || item.categoryName || 'Transação'
      const contextParts = [
        item.categoryName,
        item.date,
        item.amount != null ? `R$ ${Number(item.amount).toFixed(2).replace('.', ',')}` : '',
      ].filter(Boolean)

      return makeResult({
        id: `transaction:${item.id || index}`,
        label,
        to: `/transactions?search=${encodeURIComponent(label)}&scope=all`,
        kind: 'transaction',
        context: ['Transação', ...contextParts].join(' · '),
        terms: [item.notes, item.paymentMethod].filter(Boolean).join(' '),
      })
    }),
    ...categories.map((item, index) =>
      makeResult({
        id: `category:${item.id || index}`,
        label: item.name || 'Categoria',
        to: '/categories',
        kind: 'category',
        context: item.type === 'income' ? 'Categoria de receita' : 'Categoria de despesa',
      }),
    ),
    ...goals.map((item, index) =>
      makeResult({
        id: `goal:${item.id || index}`,
        label: item.name || 'Meta',
        to: '/goals',
        kind: 'goal',
        context: item.deadline ? `Prazo: ${item.deadline}` : 'Meta financeira',
      }),
    ),
    ...creditCards.map((item, index) =>
      makeResult({
        id: `card:${item.id || index}`,
        label: item.name || 'Cartão',
        to: '/cards',
        kind: 'card',
        context: item.last4 ? `Cartão · Final ${item.last4}` : 'Cartão',
        terms: item.last4,
      }),
    ),
  ]

  const normalized = clean(query)
  if (!normalized) return rows.filter((item) => item.kind === 'page').slice(0, 8).map(result)

  const words = normalized.split(/\s+/)

  return rows
    .filter((item) => words.every((word) => item.searchable.includes(word)))
    .sort((a, b) => {
      const aLabel = clean(a.label)
      const bLabel = clean(b.label)
      const aExact = aLabel === normalized ? 1 : 0
      const bExact = bLabel === normalized ? 1 : 0
      if (aExact !== bExact) return bExact - aExact

      const aPrefix = aLabel.startsWith(normalized) ? 1 : 0
      const bPrefix = bLabel.startsWith(normalized) ? 1 : 0
      if (aPrefix !== bPrefix) return bPrefix - aPrefix

      return aLabel.localeCompare(bLabel, 'pt-BR')
    })
    .slice(0, 10)
    .map(result)
}

export { clean as normalizeGlobalSearchText }
