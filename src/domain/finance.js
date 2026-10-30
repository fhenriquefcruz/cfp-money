import {
  centsToMoney,
  moneyToCents,
  selectActivityMonth,
  summarizeActivityTransactions,
} from './financialCore'

export { getFinancialActivityDate, isFinanciallyEffectiveTransaction } from './financialCore'

export const summarizeTransactions = summarizeActivityTransactions

export const calculateCurrentBalance = (transactions = []) =>
  summarizeActivityTransactions(transactions).balance

export const transactionsForMonth = selectActivityMonth

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
  const budgetCents = moneyToCents(budget?.amount)
  if (!budget || budgetCents <= 0) return { spent: 0, percent: 0 }

  const spentCents = selectActivityMonth(
    transactions,
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
  )
    .filter(
      (transaction) =>
        transaction.type === 'expense' &&
        !transaction.isSavings &&
        transaction.categoryId === budget.categoryId,
    )
    .reduce((sum, transaction) => sum + moneyToCents(transaction.amount), 0)

  return {
    spent: centsToMoney(spentCents),
    percent: (spentCents / budgetCents) * 100,
  }
}
