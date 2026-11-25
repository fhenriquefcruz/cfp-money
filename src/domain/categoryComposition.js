// Linguagem cromática do Meu Real. Identidade do produto (bronze/grafite) é
// independente da cor categórica: cada categoria usa sempre a mesma assinatura.
// Paleta qualitativa intencional, não sequencial ou vinculada ao risco financeiro.
export const CATEGORY_PALETTE = Object.freeze([
  '#56B4E9', // azul claro
  '#0072B2', // azul profundo
  '#A78BFA', // violeta
  '#E879A9', // rosa
  '#F0E442', // amarelo
])

export const UNCATEGORIZED_COLOR = '#94A3B8'

// Os registros de categorias globais antigas usam cores saturadas do seed.
// Eles não podem ser personalizados pela interface; harmonizar apenas a
// apresentação evita uma migração desnecessária e preserva cores individuais.
const DEFAULT_CATEGORY_COLORS = Object.freeze({
  alimentacao: CATEGORY_PALETTE[0],
  transporte: CATEGORY_PALETTE[1],
  moradia: CATEGORY_PALETTE[1],
  saude: CATEGORY_PALETTE[3],
  educacao: CATEGORY_PALETTE[4],
  lazer: CATEGORY_PALETTE[2],
  roupas: CATEGORY_PALETTE[4],
  vestuario: CATEGORY_PALETTE[4],
  tecnologia: CATEGORY_PALETTE[0],
  consorcio: CATEGORY_PALETTE[4],
  presente: CATEGORY_PALETTE[2],
  outros: UNCATEGORIZED_COLOR,
})

const categorySlug = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

function stableHash(value) {
  return Array.from(String(value || 'categoria')).reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0,
  )
}

// A paleta visual é independente das cores históricas salvas. Os dados não são alterados.
export function getCategoryColor(category = {}, fallbackKey = '') {
  const curated = DEFAULT_CATEGORY_COLORS[categorySlug(category?.name)]
  if (curated) return curated
  if (CATEGORY_PALETTE.includes(String(category?.color || '').toUpperCase())) {
    return String(category.color).toUpperCase()
  }
  const key = category?.id || category?.name || fallbackKey
  if (!key) return UNCATEGORIZED_COLOR
  return CATEGORY_PALETTE[stableHash(key) % CATEGORY_PALETTE.length]
}

export function categoryAccentStyle(category = {}, fallbackKey = '') {
  return { '--category-accent': getCategoryColor(category, fallbackKey) }
}

export function categoryCompositionFromTransactions(transactions = [], categories = []) {
  const byId = new Map(categories.map((category) => [String(category.id), category]))
  const buckets = new Map()

  for (const transaction of transactions) {
    if (
      transaction.type !== 'expense' ||
      transaction.isSavings ||
      transaction.paymentStatus === 'cancelled' ||
      transaction.flowType === 'transfer' ||
      transaction.kind === 'transfer'
    )
      continue

    const amount = Number(transaction.amount)
    if (!Number.isFinite(amount) || amount <= 0) continue

    const id = String(transaction.categoryId || '')
    const category = byId.get(id)
    const categoryName = category?.name || transaction.categoryName || 'Sem categoria'
    const bucketKey = id || `name:${categoryName}`
    const bucket = buckets.get(bucketKey) || {
      categoryId: id,
      categoryName,
      icon: category?.icon || transaction.categoryIcon || '◈',
      color: getCategoryColor(category || { color: transaction.categoryColor }, id || categoryName),
      total: 0,
      count: 0,
    }
    bucket.total += amount
    bucket.count += 1
    buckets.set(bucketKey, bucket)
  }

  const total = [...buckets.values()].reduce((value, row) => value + row.total, 0)
  return [...buckets.values()]
    .map((row) => ({ ...row, sharePercent: total ? (row.total / total) * 100 : 0 }))
    .sort(
      (left, right) =>
        right.total - left.total || left.categoryName.localeCompare(right.categoryName, 'pt-BR'),
    )
}

// O dashboard mantém seu cálculo financeiro existente e recebe apenas a
// projeção cromática, preservando comparação histórica e semântica de competências.
export function decorateCategoryBreakdown(breakdown = [], categories = []) {
  const byId = new Map(categories.map((category) => [String(category.id), category]))
  return breakdown.map((item) => {
    const saved = byId.get(String(item.categoryId || ''))
    return {
      ...item,
      categoryName: saved?.name || item.categoryName || 'Sem categoria',
      icon: saved?.icon || item.icon || '◈',
      color: getCategoryColor(
        saved || { color: item.color || item.categoryColor },
        item.categoryId || item.categoryName,
      ),
    }
  })
}
