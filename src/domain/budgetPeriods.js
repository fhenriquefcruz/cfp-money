import { getTransactionActivityDate } from './transactionDates'

const MONTH = /^\d{4}-\d{2}/

export function budgetMonthKey(value = new Date()) {
  if (typeof value === 'string') return MONTH.test(value) ? value.slice(0, 7) : ''

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
  if (exact || monthKey !== currentMonthKey) return exact || null

  return (
    budgets.find((budget) => budget.categoryId === categoryId && !budget.monthKey) || null
  )
}

export const getBudgetTransactionMonth = (transaction = {}) =>
  getTransactionActivityDate(transaction)?.slice(0, 7) || ''

export function getBudgetSpent(transactions = [], categoryId, monthKey) {
  if (!MONTH.test(monthKey || '')) return 0

  return transactions.reduce(
    (total, transaction) =>
      transaction.type === 'expense' &&
      !transaction.isSavings &&
      transaction.paymentStatus !== 'cancelled' &&
      transaction.categoryId === categoryId &&
      getBudgetTransactionMonth(transaction) === monthKey
        ? total + (Number(transaction.amount) || 0)
        : total,
    0,
  )
}

export function shiftBudgetMonth(monthKey, amount) {
  if (!MONTH.test(monthKey || '')) return ''
  const [year, month] = monthKey.split('-').map(Number)
  return budgetMonthKey(new Date(year, month - 1 + amount, 1))
}

function getBudgetsForMonth(budgets, monthKey, currentMonthKey) {
  return [...new Set(budgets.map(({ categoryId }) => categoryId).filter(Boolean))]
    .map((categoryId) => getBudgetForMonth(budgets, categoryId, monthKey, currentMonthKey))
    .filter(Boolean)
}

export function buildMonthlyBudgetOverview({
  budgets = [],
  transactions = [],
  monthKey = budgetMonthKey(),
  currentMonthKey = budgetMonthKey(),
} = {}) {
  const items = getBudgetsForMonth(budgets, monthKey, currentMonthKey).map((budget) => {
    const spent = getBudgetSpent(transactions, budget.categoryId, monthKey)
    const amount = Number(budget.amount) || 0
    return {
      ...budget,
      spent,
      amount,
      percent: amount > 0 ? (spent / amount) * 100 : 0,
    }
  })

  return {
    monthKey,
    items,
    totalBudgeted: items.reduce((total, item) => total + item.amount, 0),
    totalSpent: items.reduce((total, item) => total + item.spent, 0),
    overCount: items.filter((item) => item.amount > 0 && item.spent > item.amount).length,
  }
}
