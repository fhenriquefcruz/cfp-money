import { endOfMonth, format, startOfMonth } from 'date-fns'
import { getTransactionAccountingDate, getTransactionActivityDate } from './transactionDates'

export function getCalendarMonthBounds(referenceDate = new Date()) {
  const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)

  if (Number.isNaN(date.getTime())) {
    throw new Error('Data de referência inválida.')
  }

  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  }
}

export function getRecentDashboardTransactions(transactions = [], bounds, limit = 6) {
  if (!bounds?.start || !bounds?.end || limit <= 0) return []

  return transactions
    .filter((transaction) => {
      const accountingDate = getTransactionAccountingDate(transaction)
      return (
        !transaction?.isSavings && accountingDate >= bounds.start && accountingDate <= bounds.end
      )
    })
    .sort((a, b) => {
      const activityDifference = getTransactionActivityDate(b).localeCompare(
        getTransactionActivityDate(a),
      )

      if (activityDifference !== 0) return activityDifference
      return String(b.id || '').localeCompare(String(a.id || ''))
    })
    .slice(0, limit)
}
