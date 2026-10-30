// Contrato puro: sem DOM, React, Firebase ou dependências do bundle.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function moneyToCents(value) {
  if (value == null) return 0
  const numeric = typeof value === 'number'
  if (numeric && !Number.isFinite(value)) return 0
  const text = String(value)
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '')
  const negative = text.startsWith('-')
  const unsigned = text.replace(/^[+-]/, '')
  const match = numeric
    ? unsigned.match(/^(\d+)(?:\.(\d+))?$/)
    : unsigned.match(/^(\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d+)(?:[.,](\d{1,2}))?$/)
  if (!match) return 0
  const fraction = (match[2] || '').padEnd(3, '0')
  const cents =
    Number(match[1].replace(/[.,]/g, '')) * 100 +
    Number(fraction.slice(0, 2)) +
    (numeric && fraction[2] >= '5' ? 1 : 0)
  return Number.isSafeInteger(cents) ? (negative ? -cents : cents) : 0
}

export const centsToMoney = (cents) => cents / 100

export function isFinanciallyEffectiveTransaction(transaction = {}) {
  return (
    transaction.paymentStatus !== 'cancelled' &&
    transaction.flowType !== 'transfer' &&
    transaction.kind !== 'transfer'
  )
}

function isCalendarDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const utc = new Date(Date.UTC(year, month - 1, day))
  return !Number.isNaN(utc.getTime()) && utc.toISOString().slice(0, 10) === value
}

export function getFinancialActivityDate(transaction = {}) {
  const structured =
    transaction.type === 'expense' &&
    transaction.paymentMethod === 'credit_card' &&
    transaction.isCreditPurchase
  const candidate = structured
    ? transaction.purchaseDate || transaction.originalPurchaseDate || transaction.date
    : transaction.date || transaction.dueDate
  return isCalendarDate(candidate) ? candidate : ''
}

export function selectActivityRange(transactions = [], start = '', end = '') {
  return transactions.filter((transaction) => {
    if (!isFinanciallyEffectiveTransaction(transaction)) return false
    const date = getFinancialActivityDate(transaction)
    return Boolean(date && (!start || date >= start) && (!end || date <= end))
  })
}

export function selectActivityMonth(transactions = [], year, month) {
  const key = String(year) + '-' + String(month + 1).padStart(2, '0')
  return selectActivityRange(transactions, key + '-01', key + '-31')
}

export function getSavingsSignedCents(transaction = {}) {
  if (!transaction.isSavings || !isFinanciallyEffectiveTransaction(transaction)) return 0
  const amount = Math.abs(moneyToCents(transaction.amount))
  return transaction.savingsMovement === 'withdrawal' ? -amount : amount
}

export function getGoalEffectiveCents(goal = {}, transactions = []) {
  const opening = moneyToCents(goal.currentAmount)
  const movements = transactions.reduce(
    (sum, transaction) =>
      sum + (goal.id && transaction.goalId === goal.id ? getSavingsSignedCents(transaction) : 0),
    0,
  )
  return Math.max(0, opening + movements)
}

export function summarizeActivityTransactions(transactions = []) {
  let income = 0
  let expenses = 0
  let savings = 0
  let count = 0
  for (const transaction of transactions) {
    if (!isFinanciallyEffectiveTransaction(transaction)) continue
    const amount = moneyToCents(transaction.amount)
    if (transaction.isSavings) savings += getSavingsSignedCents(transaction)
    else if (transaction.type === 'income') income += amount
    else if (transaction.type === 'expense') expenses += amount
    count += 1
  }
  return {
    income: centsToMoney(income),
    expenses: centsToMoney(expenses),
    savings: centsToMoney(savings),
    balance: centsToMoney(income - expenses),
    count,
  }
}
