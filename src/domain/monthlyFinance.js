import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getTransactionActivityDate } from './transactionDates'
import { getSavingsSignedCents } from './savings'
import { addMoneyCents, fromMoneyCents, toMoneyCents } from './moneyCents'

const capitalizeMonth = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : '')
const isEffective = (transaction) =>
  transaction.paymentStatus !== 'cancelled' &&
  transaction.flowType !== 'transfer' &&
  transaction.kind !== 'transfer'

export function groupTransactionsByActivityMonth(transactions = []) {
  const groups = {}

  transactions.filter(isEffective).forEach((transaction) => {
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

    let incomeCents = 0
    let expenseCents = 0
    let savingsCents = 0

    for (const transaction of periodTransactions) {
      if (transaction.isSavings) {
        savingsCents = addMoneyCents(savingsCents, getSavingsSignedCents(transaction))
      } else if (transaction.type === 'income') {
        incomeCents = addMoneyCents(incomeCents, toMoneyCents(transaction.amount))
      } else if (transaction.type === 'expense') {
        expenseCents = addMoneyCents(expenseCents, toMoneyCents(transaction.amount))
      }
    }

    result.push({
      monthKey: format(date, 'yyyy-MM'),
      month: capitalizeMonth(format(date, 'MMM', { locale: ptBR })),
      fullMonth: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      income: fromMoneyCents(incomeCents),
      expenses: fromMoneyCents(expenseCents),
      savings: fromMoneyCents(savingsCents),
      balance: fromMoneyCents(addMoneyCents(incomeCents, -expenseCents)),
    })
  }

  return result
}
