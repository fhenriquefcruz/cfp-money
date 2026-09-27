import { getTransactionActivityDate } from './transactionDates'

const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/

export function budgetMonthKey(value = new Date()) {
  if (typeof value === 'string') {
    if (MONTH_KEY_PATTERN.test(value)) return value
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7)
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function shiftBudgetMonth(monthKey, amount) {
  if (!MONTH_KEY_PATTERN.test(monthKey || '')) return ''
  const [year, month] = monthKey.split('-').map(Number)
  return budgetMonthKey(new Date(year, month - 1 + amount, 1))
}

export function getBudgetForMonth(
  budgets = [],
  categoryId,
  monthKey,
  currentMonthKey = budgetMonthKey(),
) {
  const exact = budgets.find(
    (budget) => budget.categoryId === categoryId && budget.monthKey === monthKey,
  )

  if (exact) return { ...exact, legacyFallback: false }

  if (monthKey !== currentMonthKey) return null

  const legacy = budgets.find(
    (budget) => budget.categoryId === categoryId && !budget.monthKey,
  )

  return legacy ? { ...legacy, legacyFallback: true } : null
}

export function getBudgetsForMonth(
  budgets = [],
  monthKey,
  currentMonthKey = budgetMonthKey(),
) {
  const categoryIds = new Set(budgets.map((budget) => budget.categoryId).filter(Boolean))

  return [...categoryIds]
    .map((categoryId) => getBudgetForMonth(budgets, categoryId, monthKey, currentMonthKey))
    .filter(Boolean)
}

export function getBudgetSpent(transactions = [], categoryId, monthKey) {
  if (!MONTH_KEY_PATTERN.test(monthKey || '')) return 0

  return transactions
    .filter((transaction) => {
      if (transaction.type !== 'expense') return false
      if (transaction.isSavings) return false
      if (transaction.paymentStatus === 'cancelled') return false
      if (transaction.categoryId !== categoryId) return false

      const activityDate = getTransactionActivityDate(transaction)
      return activityDate?.slice(0, 7) === monthKey
    })
    .reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0)
}

export function buildMonthlyBudgetOverview({
  budgets = [],
  transactions = [],
  monthKey = budgetMonthKey(),
  currentMonthKey = budgetMonthKey(),
} = {}) {
  const periodBudgets = getBudgetsForMonth(budgets, monthKey, currentMonthKey)
  const items = periodBudgets.map((budget) => {
    const spent = getBudgetSpent(transactions, budget.categoryId, monthKey)
    const amount = Number(budget.amount) || 0
    const percent = amount > 0 ? (spent / amount) * 100 : 0

    return {
      ...budget,
      spent,
      amount,
      percent,
      remaining: Math.max(0, amount - spent),
      excess: Math.max(0, spent - amount),
      isOver: amount > 0 && spent > amount,
    }
  })

  return {
    monthKey,
    items,
    totalBudgeted: items.reduce((total, item) => total + item.amount, 0),
    totalSpent: items.reduce((total, item) => total + item.spent, 0),
    totalOver: items.reduce((total, item) => total + item.excess, 0),
    overCount: items.filter((item) => item.isOver).length,
  }
}
