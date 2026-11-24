import { getTransactionLedgerDate } from './transactionDates.js'

// Normaliza entradas históricas; os cálculos acumulam apenas centavos inteiros.
export function moneyToCents(value) {
  const numeric = typeof value === 'number'
  const text = String(value).replace(/R\$|\s/g, '')
  const match = numeric
    ? text.match(/^([+-]?)(\d+)(?:\.(\d+))?$/)
    : text.match(/^([+-]?)(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,2}))?$/)
  if (!match) return 0
  const fraction = (match[3] || '') + '000'
  const cents =
    Number(match[2].replace(/[.,]/g, '')) * 100 +
    Number(fraction.slice(0, 2)) +
    (numeric && fraction[2] >= '5' ? 1 : 0)
  return Number.isSafeInteger(cents) ? (match[1] === '-' ? -cents : cents) : 0
}

export const centsToMoney = (cents) => cents / 100

export const getFinancialActivityDate = getTransactionLedgerDate

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
    const cents = moneyToCents(transaction.amount)
    if (transaction.isSavings) {
      savingsCents += (transaction.savingsMovement === 'withdrawal' ? -1 : 1) * Math.abs(cents)
    } else if (transaction.type === 'income') {
      incomeCents += cents
    } else if (transaction.type === 'expense') {
      expenseCents += cents
    }
    count += 1
  }

  return {
    income: centsToMoney(incomeCents),
    expenses: centsToMoney(expenseCents),
    savings: centsToMoney(savingsCents),
    balance: centsToMoney(incomeCents - expenseCents),
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
  const limitCents = budget ? moneyToCents(budget.amount) : 0
  if (limitCents <= 0) {
    return { spent: 0, percent: 0 }
  }

  const monthItems = transactionsForMonth(
    transactions,
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
  )
  const spent = summarizeTransactions(
    monthItems.filter((transaction) =>
        transaction.type === 'expense' &&
        !transaction.isSavings &&
        transaction.categoryId === budget.categoryId,
    ),
  ).expenses

  return {
    spent,
    percent: (spent * 10000) / limitCents,
  }
}
