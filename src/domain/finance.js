import { getSavingsSignedAmount } from './savings.js'

export const getFinancialActivityDate = (transaction = {}) =>
  transaction.type === 'expense' &&
  transaction.paymentMethod === 'credit_card' &&
  transaction.isCreditPurchase
    ? transaction.purchaseDate || transaction.originalPurchaseDate || transaction.date || ''
    : transaction.date || transaction.dueDate || ''

export const isFinanciallyEffectiveTransaction = (transaction = {}) =>
  transaction.paymentStatus !== 'cancelled' &&
  transaction.flowType !== 'transfer' &&
  transaction.kind !== 'transfer'

export function toTransactionCents(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number * 100) : 0
}

export function summarizeTransactions(transactions = []) {
  const totals = transactions.reduce(
    (summary, transaction) => {
      if (!isFinanciallyEffectiveTransaction(transaction)) return summary
      const amountCents = toTransactionCents(transaction.amount)

      if (transaction.isSavings) {
        summary.savingsCents += Math.round(getSavingsSignedAmount(transaction) * 100)
      } else if (transaction.type === 'income') {
        summary.incomeCents += amountCents
      } else if (transaction.type === 'expense') {
        summary.expenseCents += amountCents
      }

      summary.count += 1
      return summary
    },
    { incomeCents: 0, expenseCents: 0, savingsCents: 0, count: 0 },
  )

  return {
    income: totals.incomeCents / 100,
    expenses: totals.expenseCents / 100,
    savings: totals.savingsCents / 100,
    balance: (totals.incomeCents - totals.expenseCents) / 100,
    count: totals.count,
  }
}

export function calculateCurrentBalance(transactions = []) {
  return summarizeTransactions(transactions).balance
}

export function transactionsForMonth(transactions = [], year, month) {
  return transactions.filter((transaction) => {
    if (!isFinanciallyEffectiveTransaction(transaction)) return false
    const activityDate = getFinancialActivityDate(transaction)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(activityDate || '')) return false
    const date = new Date(activityDate + 'T00:00:00')
    return date.getFullYear() === year && date.getMonth() === month
  })
}

export function defaultDateRangeEnd(startDate, days = 30) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || '')) return ''

  const date = new Date(startDate + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return ''

  date.setDate(date.getDate() + days)

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function calculateBudgetUsage(transactions = [], budget, referenceDate = new Date()) {
  const budgetCents = toTransactionCents(budget?.amount)
  if (budgetCents <= 0) return { spent: 0, percent: 0 }

  const spentCents = transactionsForMonth(
    transactions,
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
  ).reduce(
    (cents, transaction) =>
      transaction.type === 'expense' &&
      !transaction.isSavings &&
      transaction.categoryId === budget.categoryId
        ? cents + toTransactionCents(transaction.amount)
        : cents,
    0,
  )

  return {
    spent: spentCents / 100,
    percent: (spentCents / budgetCents) * 100,
  }
}
