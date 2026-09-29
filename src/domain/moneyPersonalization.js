const GENERIC_DESCRIPTIONS = new Set([
  '',
  'compra',
  'despesa',
  'pagamento',
  'outros',
  'sem descricao',
  'sem descrição',
])

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function toIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function addDays(date, amount) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  value.setDate(value.getDate() + amount)
  return value
}

function sortByAmountDesc(first, second) {
  return second.amount - first.amount || second.count - first.count
}

export function buildMoneyPersonalizationProfile(
  transactions = [],
  { now = new Date(), windowDays = 120 } = {},
) {
  const safeWindowDays = Math.max(30, Math.min(365, Number(windowDays) || 120))
  const end = toIsoDate(now)
  const start = toIsoDate(addDays(now, -(safeWindowDays - 1)))

  const expenses = transactions.filter((transaction) => {
    if (transaction?.type !== 'expense' || transaction?.isSavings) return false
    if (!transaction?.date || transaction.date < start || transaction.date > end) return false
    return toAmount(transaction.amount) > 0
  })

  const totalExpenses = expenses.reduce((total, item) => total + toAmount(item.amount), 0)
  const categoryGroups = new Map()
  const paymentGroups = new Map()
  const descriptionGroups = new Map()

  expenses.forEach((transaction) => {
    const amount = toAmount(transaction.amount)
    const categoryName = String(transaction.categoryName || 'Sem categoria').trim() || 'Sem categoria'
    const categoryKey = transaction.categoryId || normalizeText(categoryName) || 'sem-categoria'
    const category = categoryGroups.get(categoryKey) || {
      id: transaction.categoryId || '',
      name: categoryName,
      amount: 0,
      count: 0,
    }
    category.amount += amount
    category.count += 1
    categoryGroups.set(categoryKey, category)

    const paymentMethod = String(transaction.paymentMethod || '').trim()
    if (paymentMethod) {
      const payment = paymentGroups.get(paymentMethod) || {
        id: paymentMethod,
        count: 0,
        amount: 0,
      }
      payment.count += 1
      payment.amount += amount
      paymentGroups.set(paymentMethod, payment)
    }

    if (transaction.isRecurring || transaction.isInstallment) return
    const descriptionKey = normalizeText(transaction.description)
    if (GENERIC_DESCRIPTIONS.has(descriptionKey) || descriptionKey.length < 3) return

    const description = descriptionGroups.get(descriptionKey) || {
      key: descriptionKey,
      label: String(transaction.description || '').trim(),
      count: 0,
      amount: 0,
      categoryId: transaction.categoryId || '',
      categoryName,
    }
    description.count += 1
    description.amount += amount
    descriptionGroups.set(descriptionKey, description)
  })

  const topCategories = [...categoryGroups.values()]
    .sort(sortByAmountDesc)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      share: totalExpenses > 0 ? item.amount / totalExpenses : 0,
    }))

  const preferredPaymentMethod =
    [...paymentGroups.values()].sort(
      (first, second) => second.count - first.count || second.amount - first.amount,
    )[0] || null

  const recurringDescriptions = [...descriptionGroups.values()]
    .filter((item) => item.count >= 3)
    .sort((first, second) => second.count - first.count || second.amount - first.amount)
    .slice(0, 3)

  const confidence =
    expenses.length >= 20 ? 'high' : expenses.length >= 8 ? 'medium' : expenses.length >= 4 ? 'low' : 'insufficient'

  return {
    windowDays: safeWindowDays,
    period: { start, end },
    sampleSize: expenses.length,
    totalExpenses,
    confidence,
    topCategories,
    preferredPaymentMethod,
    recurringDescriptions,
  }
}

export function getMoneyPersonalizationSummary(profile = {}) {
  if (!profile || profile.confidence === 'insufficient') {
    return {
      ready: false,
      text: 'Ainda não há histórico suficiente para formar um perfil individual de gastos.',
    }
  }

  const parts = []
  const topCategory = profile.topCategories?.[0]
  if (topCategory) {
    parts.push(
      `${topCategory.name} representa ${Math.round((topCategory.share || 0) * 100)}% das despesas analisadas`,
    )
  }

  if (profile.preferredPaymentMethod) {
    parts.push(
      `${profile.preferredPaymentMethod.id} aparece em ${profile.preferredPaymentMethod.count} lançamento${profile.preferredPaymentMethod.count === 1 ? '' : 's'}`,
    )
  }

  const recurring = profile.recurringDescriptions?.[0]
  if (recurring) {
    parts.push(
      `${recurring.label} se repetiu ${recurring.count} vezes no período`,
    )
  }

  return {
    ready: true,
    text: parts.length
      ? `Com base no seu próprio histórico, ${parts.join('; ')}.`
      : 'O histórico já permite personalização, mas ainda não existe um padrão dominante confiável.',
  }
}
