// Linguagem cromática do Meu Real. Identidade do produto (bronze/grafite) é
// independente da cor categórica: cada categoria usa sempre a mesma assinatura.
// Paleta qualitativa intencional, não sequencial ou vinculada ao risco financeiro.
export const CATEGORY_PALETTE = Object.freeze([
  '#B47750', // argila · alimento
  '#4C8192', // oceano · mobilidade
  '#806AA0', // ametista · lazer
  '#3C897B', // jade · saúde
  '#A56780', // vinho claro · pessoal
  '#A08A45', // oliva · moradia
  '#4976A0', // safira · educação
  '#995F57', // terracota · compras
  '#647B58', // musgo · rotina
  '#846D59', // pedra · compromissos
  '#4F8A91', // turquesa · serviços
  '#9B6A9A', // orquídea · outros
])

const VALID_HEX = /^#(?:[\da-f]{6}|[\da-f]{3})$/i
export const UNCATEGORIZED_COLOR = '#747A80'

// Os registros de categorias globais antigas usam cores saturadas do seed.
// Eles não podem ser personalizados pela interface; harmonizar apenas a
// apresentação evita uma migração desnecessária e preserva cores individuais.
const DEFAULT_CATEGORY_COLORS = Object.freeze({
  alimentacao: CATEGORY_PALETTE[0],
  transporte: CATEGORY_PALETTE[1],
  moradia: CATEGORY_PALETTE[5],
  saude: CATEGORY_PALETTE[3],
  educacao: CATEGORY_PALETTE[6],
  lazer: CATEGORY_PALETTE[2],
  roupas: CATEGORY_PALETTE[4],
  vestuario: CATEGORY_PALETTE[4],
  tecnologia: CATEGORY_PALETTE[10],
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

// Cores já personalizadas prevalecem; jamais regravamos os dados do usuário.
export function getCategoryColor(category = {}, fallbackKey = '') {
  if (category?.isDefault && category?.type !== 'income') {
    const curated = DEFAULT_CATEGORY_COLORS[categorySlug(category.name)]
    if (curated) return curated
  }
  if (VALID_HEX.test(category?.color || '')) return category.color
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
