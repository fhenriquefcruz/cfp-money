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

  return budgets.find((budget) => budget.categoryId === categoryId && !budget.monthKey) || null
}

export const getBudgetTransactionMonth = (transaction = {}) =>
  getTransactionActivityDate(transaction)?.slice(0, 7) || ''

export function getBudgetTransactions(transactions = [], categoryId, monthKey) {
  if (!MONTH.test(monthKey || '')) return []

  return transactions.filter(
    (transaction) =>
      transaction.type === 'expense' &&
      !transaction.isSavings &&
      transaction.paymentStatus !== 'cancelled' &&
      transaction.flowType !== 'transfer' &&
      transaction.kind !== 'transfer' &&
      (!categoryId || transaction.categoryId === categoryId) &&
      getBudgetTransactionMonth(transaction) === monthKey,
  )
}

export const getBudgetSpent = (transactions = [], categoryId, monthKey) =>
  getBudgetTransactions(transactions, categoryId, monthKey).reduce(
    (total, transaction) => total + (+transaction.amount || 0),
    0,
  )

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
  const monthBudgets = getBudgetsForMonth(budgets, monthKey, currentMonthKey)
  const monthTransactions = getBudgetTransactions(transactions, null, monthKey)
  const budgetedCategoryIds = new Set(monthBudgets.map(({ categoryId }) => categoryId))
  let totalBudgeted = 0
  let totalSpent = 0
  let totalExceeded = 0

  for (const budget of monthBudgets) {
    const amount = +budget.amount || 0
    const spent = getBudgetSpent(transactions, budget.categoryId, monthKey)
    totalBudgeted += amount
    totalSpent += spent
    totalExceeded += Math.max(0, spent - amount)
  }

  const totalUnbudgetedSpent = monthTransactions.reduce(
    (total, transaction) =>
      budgetedCategoryIds.has(transaction.categoryId)
        ? total
        : total + (+transaction.amount || 0),
    0,
  )

  return {
    totalBudgeted,
    totalSpent,
    totalUnbudgetedSpent,
    totalExceeded,
  }
}
