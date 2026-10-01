import { getTransactionActivityDate } from './transactionDates'

const PAYMENT_METHOD_LABELS = Object.freeze({
  pix: 'Pix',
  debit_card: 'Cartão de débito',
  credit_card: 'Cartão de crédito',
  cash: 'Dinheiro',
  bank_transfer: 'Transferência',
  boleto: 'Boleto',
})

const iso = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')

const isEffectiveExpense = (item) =>
  item?.type === 'expense' &&
  !item.isSavings &&
  item.paymentStatus !== 'cancelled' &&
  item.flowType !== 'transfer' &&
  item.kind !== 'transfer' &&
  Number(item.amount) > 0

const paymentLabel = (id = '') =>
  PAYMENT_METHOD_LABELS[id] ||
  String(id)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())

export function buildMoneyPersonalizationProfile(
  transactions = [],
  { now = new Date(), windowDays = 120 } = {},
) {
  const days = Math.max(30, Math.min(365, Number(windowDays) || 120))
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - days + 1)

  const start = iso(startDate)
  const end = iso(endDate)
  const expenses = transactions.filter((item) => {
    if (!isEffectiveExpense(item)) return false
    const activityDate = getTransactionActivityDate(item)
    return activityDate >= start && activityDate <= end
  })

  const categories = new Map()
  const payments = new Map()
  let totalExpenses = 0

  for (const item of expenses) {
    const amount = Number(item.amount)
    totalExpenses += amount

    const name = String(item.categoryName || item.categoryId || 'Sem categoria').trim()
    const key = String(item.categoryId || name || 'sem-categoria')
    const category = categories.get(key) || { id: key, name: name || 'Sem categoria', amount: 0, count: 0 }
    category.amount += amount
    category.count += 1
    categories.set(key, category)

    if (item.paymentMethod) {
      const payment = payments.get(item.paymentMethod) || {
        id: item.paymentMethod,
        label: paymentLabel(item.paymentMethod),
        count: 0,
      }
      payment.count += 1
      payments.set(item.paymentMethod, payment)
    }
  }

  const topCategory = [...categories.values()].sort((a, b) => b.amount - a.amount)[0] || null
  if (topCategory) {
    topCategory.share = totalExpenses > 0 ? topCategory.amount / totalExpenses : 0
  }

  const preferredPaymentMethod =
    [...payments.values()].sort((a, b) => b.count - a.count)[0] || null

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
