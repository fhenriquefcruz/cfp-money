// Contrato puro: sem DOM, React, Firebase ou dependências do bundle.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function moneyToCents(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0
    // Converter pela representação decimal evita 1.005 * 100 = 100.4999…
    const raw = String(Math.abs(value))
    if (!/^\d+(?:\.\d+)?$/.test(raw)) return 0
    const [whole, fraction = ''] = raw.split('.')
    const cents =
      Number(whole) * 100 +
      Number(fraction.slice(0, 2).padEnd(2, '0')) +
      (Number(fraction[2] || '0') >= 5 ? 1 : 0)
    return Number.isSafeInteger(cents) ? (value < 0 ? -cents : cents) : 0
  }
  if (typeof value !== 'string') return 0
  let text = value.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '')
  if (!text) return 0
  const negative = text.startsWith('-')
  text = text.replace(/^[+-]/, '')
  if (/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(text)) {
    text = text.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(text)) {
    text = text.replace(/,/g, '')
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '')
  } else if (/^\d{1,3}(?:,\d{3})+$/.test(text)) {
    text = text.replace(/,/g, '')
  } else if (/^\d+,\d{1,2}$/.test(text)) {
    text = text.replace(',', '.')
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return 0
  const [units, fraction = ''] = text.split('.')
  const cents = Number(units) * 100 + Number(fraction.padEnd(2, '0'))
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
