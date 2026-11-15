import { getSavingsSignedCents } from './savings'
import { addMoneyCents, fromMoneyCents, toMoneyCents } from './moneyCents'

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

export function summarizeTransactions(transactions = []) {
  let incomeCents = 0
  let expenseCents = 0
  let savingsCents = 0
  let count = 0

  for (const transaction of transactions) {
    if (!isFinanciallyEffectiveTransaction(transaction)) continue

    if (transaction.isSavings) {
      savingsCents = addMoneyCents(savingsCents, getSavingsSignedCents(transaction))
    } else if (transaction.type === 'income') {
      incomeCents = addMoneyCents(incomeCents, toMoneyCents(transaction.amount))
    } else if (transaction.type === 'expense') {
      expenseCents = addMoneyCents(expenseCents, toMoneyCents(transaction.amount))
    }
    count += 1
  }

  return {
    income: fromMoneyCents(incomeCents),
    expenses: fromMoneyCents(expenseCents),
    savings: fromMoneyCents(savingsCents),
    balance: fromMoneyCents(addMoneyCents(incomeCents, -expenseCents)),
    count,
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
  if (!budget) return { spent: 0, percent: 0 }
  const budgetCents = toMoneyCents(budget.amount)
  if (budgetCents <= 0) return { spent: 0, percent: 0 }

  const spentCents = transactions
    .filter((transaction) => {
      const activityDate = getFinancialActivityDate(transaction)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(activityDate || '')) return false
      const date = new Date(activityDate + 'T00:00:00')

      return (
        isFinanciallyEffectiveTransaction(transaction) &&
        transaction.type === 'expense' &&
        !transaction.isSavings &&
        transaction.categoryId === budget.categoryId &&
        date.getFullYear() === referenceDate.getFullYear() &&
        date.getMonth() === referenceDate.getMonth()
      )
    })
    .reduce((total, transaction) => addMoneyCents(total, toMoneyCents(transaction.amount)), 0)

  return {
    spent: fromMoneyCents(spentCents),
    percent: (spentCents / budgetCents) * 100,
  }
}
