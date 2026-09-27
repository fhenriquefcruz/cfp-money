import {
  budgetMonthKey,
  getBudgetForMonth,
  getBudgetSpent,
  getBudgetTransactionMonth,
} from './budgetCore'

export {
  budgetMonthKey,
  getBudgetForMonth,
  getBudgetSpent,
  getBudgetTransactionMonth,
} from './budgetCore'

export function shiftBudgetMonth(monthKey, amount) {
  if (!/^\d{4}-\d{2}$/.test(monthKey || '')) return ''
  const [year, month] = monthKey.split('-').map(Number)
  return budgetMonthKey(new Date(year, month - 1 + amount, 1))
}

export function getBudgetsForMonth(
  budgets = [],
  monthKey,
  currentMonthKey = budgetMonthKey(),
) {
  return [
    ...new Set(budgets.map((budget) => budget.categoryId).filter(Boolean)),
  ]
    .map((categoryId) => getBudgetForMonth(budgets, categoryId, monthKey, currentMonthKey))
    .filter(Boolean)
}

export function buildMonthlyBudgetOverview({
  budgets = [],
  transactions = [],
  monthKey = budgetMonthKey(),
  currentMonthKey = budgetMonthKey(),
} = {}) {
  const items = getBudgetsForMonth(budgets, monthKey, currentMonthKey).map((budget) => {
    const spent = getBudgetSpent(transactions, budget.categoryId, monthKey)
    const amount = Number(budget.amount) || 0

    return {
      ...budget,
      spent,
      amount,
      percent: amount > 0 ? (spent / amount) * 100 : 0,
      remaining: Math.max(0, amount - spent),
      excess: Math.max(0, spent - amount),
      isOver: amount > 0 && spent > amount,
    }
  })

  return {
    monthKey,
    items,
    totalBudgeted: items.reduce((total, item) => total + item.amount, 0),
    totalSpent: items.reduce((total, item) => total + item.spent, 0),
    totalOver: items.reduce((total, item) => total + item.excess, 0),
    overCount: items.filter((item) => item.isOver).length,
  }
}
