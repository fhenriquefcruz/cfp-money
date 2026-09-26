const clean = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const row = (label, to, terms = '') => [label, to, clean(`${label} ${terms}`)]

export function searchGlobal({
  query = '',
  pages = [],
  transactions = [],
  categories = [],
  goals = [],
  creditCards = [],
} = {}) {
  const rows = [
    ...pages.map(([label, to]) => row(label, to)),
    ...transactions.map((item) => {
      const label = item.description || item.categoryName || 'Transação'
      return row(
        label,
        `/transactions?search=${encodeURIComponent(label)}`,
        item.categoryName,
      )
    }),
    ...categories.map((item) => row(item.name || 'Categoria', '/categories')),
    ...goals.map((item) => row(item.name || 'Meta', '/goals')),
    ...creditCards.map((item) => row(item.name || 'Cartão', '/cards', item.last4)),
  ]
  const normalized = clean(query)
  if (!normalized) return rows.slice(0, 8).map(([label, to]) => ({ label, to }))

  const words = normalized.split(/\s+/)
  return rows
    .filter((item) => words.every((word) => item[2].includes(word)))
    .sort(
      (a, b) =>
        Number(clean(b[0]).startsWith(normalized)) - Number(clean(a[0]).startsWith(normalized)),
    )
    .slice(0, 8)
    .map(([label, to]) => ({ label, to }))
}

export { clean as normalizeGlobalSearchText }
