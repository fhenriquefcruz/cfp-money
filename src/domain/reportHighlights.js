const finite = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function buildReportHighlights({
  periodTotals = {},
  categoryData = [],
  monthlyData = [],
  period = 1,
} = {}) {
  const income = finite(periodTotals.income)
  const expenses = finite(periodTotals.expenses)
  const balance = finite(periodTotals.balance)
  const savings = finite(periodTotals.savings)
  const savingRate = finite(periodTotals.savingRate)

  const topCategory = categoryData[0]
    ? {
        name: categoryData[0].name,
        value: finite(categoryData[0].value),
        count: finite(categoryData[0].count),
        share: expenses > 0 ? (finite(categoryData[0].value) / expenses) * 100 : 0,
      }
    : null

  const monthly = monthlyData.map((item) => {
    const monthIncome = finite(item.income)
    const monthExpenses = finite(item.expenses)

    return {
      ...item,
      income: monthIncome,
      expenses: monthExpenses,
      balance: Number.isFinite(Number(item.balance))
        ? Number(item.balance)
        : monthIncome - monthExpenses,
    }
  })

  const bestMonth = monthly.length
    ? [...monthly].sort((first, second) => second.balance - first.balance)[0]
    : null
  const tightestMonth = monthly.length
    ? [...monthly].sort((first, second) => first.balance - second.balance)[0]
    : null

  return {
    income,
    expenses,
    balance,
    savings,
    savingRate,
    expenseIncomeRatio: income > 0 ? (expenses / income) * 100 : null,
    averageMonthlyExpenses: expenses / Math.max(1, Number(period) || 1),
    averageMonthlyIncome: income / Math.max(1, Number(period) || 1),
    topCategory,
    bestMonth,
    tightestMonth,
  }
}
