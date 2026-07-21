const asAmount = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)

export function summarizeTransactions(transactions = []) {
  return transactions.reduce(
    (summary, transaction) => {
      const amount = asAmount(transaction.amount)
      if (transaction.type === 'income') summary.income += amount
      if (transaction.type === 'expense') summary.expenses += amount
      summary.balance = summary.income - summary.expenses
      summary.count += 1
      return summary
    },
    { income: 0, expenses: 0, balance: 0, count: 0 },
  )
}

export function transactionsForMonth(transactions = [], year, month) {
  return transactions.filter((transaction) => {
    const date = new Date(`${transaction.date}T00:00:00`)
    return date.getFullYear() === year && date.getMonth() === month
  })
}

export function calculateBudgetUsage(transactions = [], budget, referenceDate = new Date()) {
  if (!budget || asAmount(budget.amount) <= 0) return { spent: 0, percent: 0 }
  const spent = transactions
    .filter((transaction) => {
      const date = new Date(`${transaction.date}T00:00:00`)
      return (
        transaction.type === 'expense' &&
        transaction.categoryId === budget.categoryId &&
        date.getFullYear() === referenceDate.getFullYear() &&
        date.getMonth() === referenceDate.getMonth()
      )
    })
    .reduce((total, transaction) => total + asAmount(transaction.amount), 0)
  return { spent, percent: (spent / asAmount(budget.amount)) * 100 }
}
