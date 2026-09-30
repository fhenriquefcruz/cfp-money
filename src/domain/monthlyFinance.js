import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getTransactionActivityDate } from './transactionDates'

const capitalizeMonth = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
const isEffective = (transaction) =>
  transaction.paymentStatus !== 'cancelled' &&
  transaction.flowType !== 'transfer' &&
  transaction.kind !== 'transfer'

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
    const periodTransactions = transactions.filter((transaction) => {
      if (!isEffective(transaction)) return false
      const activityDate = getTransactionActivityDate(transaction)
      if (!activityDate) return false
      const parsed = new Date(activityDate + 'T00:00:00')
      return parsed.getFullYear() === year && parsed.getMonth() === month
    })

    const income = periodTransactions
      .filter((transaction) => transaction.type === 'income' && !transaction.isSavings)
      .reduce((total, transaction) => total + transaction.amount, 0)
    const expenses = periodTransactions
      .filter((transaction) => transaction.type === 'expense' && !transaction.isSavings)
      .reduce((total, transaction) => total + transaction.amount, 0)
    const savings = periodTransactions
      .filter((transaction) => transaction.isSavings)
      .reduce((total, transaction) => total + transaction.amount, 0)

    result.push({
      month: capitalizeMonth(format(date, 'MMM', { locale: ptBR })),
      fullMonth: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      income,
      expenses,
      savings,
      balance: income - expenses,
    })
  }

  return result
}
