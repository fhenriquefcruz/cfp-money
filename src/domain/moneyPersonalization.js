const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const iso = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')

export function buildMoneyPersonalizationProfile(
  transactions = [],
  { now = new Date(), windowDays = 120 } = {},
) {
  const days = Math.max(30, Math.min(365, Number(windowDays) || 120))
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  startDate.setDate(startDate.getDate() - days + 1)
  const start = iso(startDate)
  const end = iso(now)

  const expenses = transactions.filter(
    (item) =>
      item?.type === 'expense' &&
      !item.isSavings &&
      item.date >= start &&
      item.date <= end &&
      Number(item.amount) > 0,
  )

  const categories = new Map()
  const payments = new Map()
  let totalExpenses = 0

  expenses.forEach((item) => {
    const amount = Number(item.amount)
    totalExpenses += amount

    const name = String(item.categoryName || 'Sem categoria').trim() || 'Sem categoria'
    const key = item.categoryId || normalize(name) || 'sem-categoria'
    const category = categories.get(key) || { name, amount: 0, count: 0 }
    category.amount += amount
    category.count += 1
    categories.set(key, category)

    if (item.paymentMethod) {
      const payment = payments.get(item.paymentMethod) || { id: item.paymentMethod, count: 0 }
      payment.count += 1
      payments.set(item.paymentMethod, payment)
    }
  })

  const topCategory = [...categories.values()].sort((a, b) => b.amount - a.amount)[0] || null

  if (topCategory) {
    topCategory.share = totalExpenses > 0 ? topCategory.amount / totalExpenses : 0
  }

  const preferredPaymentMethod = [...payments.values()].sort((a, b) => b.count - a.count)[0] || null

  return {
    windowDays: days,
    sampleSize: expenses.length,
    confidence:
      expenses.length >= 20
        ? 'high'
        : expenses.length >= 8
          ? 'medium'
          : expenses.length >= 4
            ? 'low'
            : 'insufficient',
    topCategory,
    preferredPaymentMethod,
  }
}
