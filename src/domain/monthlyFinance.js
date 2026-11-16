import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getTransactionActivityDate } from './transactionDates'
import {
  isFinanciallyEffectiveTransaction,
  summarizeTransactions,
  transactionsForMonth,
} from './finance'

const capitalizeMonth = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : '')

export function groupTransactionsByActivityMonth(transactions = []) {
  const groups = {}

  transactions.filter(isFinanciallyEffectiveTransaction).forEach((transaction) => {
    const activityDate = getTransactionActivityDate(transaction)
    if (!activityDate) return
    const key = activityDate.slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(transaction)
  })

  return groups
}

export function getMonthlyFinancialData(transactions = [], months = 6, baseDate = new Date()) {
  const result = []

  for (let index = months - 1; index >= 0; index -= 1) {
    const date = subMonths(baseDate, index)
    const year = date.getFullYear()
    const month = date.getMonth()
    const { income, expenses, savings, balance } = summarizeTransactions(
      transactionsForMonth(transactions, year, month),
    )

    result.push({
      monthKey: format(date, 'yyyy-MM'),
      month: capitalizeMonth(format(date, 'MMM', { locale: ptBR })),
      fullMonth: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      income,
      expenses,
      savings,
      balance,
    })
  }

  return result
}
