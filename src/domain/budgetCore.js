import { getTransactionActivityDate } from './transactionDates'

const MONTH = /^\d{4}-\d{2}$/

export function budgetMonthKey(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}/.test(value)) return value.slice(0, 7)

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
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

export function getBudgetTransactionMonth(transaction = {}) {
  return getTransactionActivityDate(transaction)?.slice(0, 7) || ''
}

export function getBudgetSpent(transactions = [], categoryId, monthKey) {
  if (!MONTH.test(monthKey || '')) return 0

  return transactions
    .filter(
      (transaction) =>
        transaction.type === 'expense' &&
        !transaction.isSavings &&
        transaction.paymentStatus !== 'cancelled' &&
        transaction.categoryId === categoryId &&
        getBudgetTransactionMonth(transaction) === monthKey,
    )
    .reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0)
}
