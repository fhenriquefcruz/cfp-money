import { getTransactionActivityDate } from './transactionDates'
import {
  isFinanciallyEffectiveTransaction,
  summarizeTransactions,
  transactionsForMonth,
} from './finance'

const shortMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const fullMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

const capitalizeMonth = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : ''

export function groupTransactionsByActivityMonth(transactions = []) {
  const groups = {}
  for (const transaction of transactions) {
    if (!isFinanciallyEffectiveTransaction(transaction)) continue
    const activityDate = getTransactionActivityDate(transaction)
    if (!activityDate) continue
    const key = activityDate.slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(transaction)
  }
  return groups
}

export function getMonthlyFinancialData(transactions = [], months = 6, baseDate = new Date()) {
  const result = []

  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - index, 1)
    const { income, expenses, savings, balance } = summarizeTransactions(
      transactionsForMonth(transactions, date.getFullYear(), date.getMonth()),
    )

    result.push({
      monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      month: capitalizeMonth(shortMonth.format(date).replace(/\.$/, '')),
      fullMonth: fullMonth.format(date),
      income,
      expenses,
      savings,
      balance,
    })
  }

  return result
}
