import { isFinanciallyEffectiveTransaction, toTransactionCents } from './finance.js'

export function summarizeExpenseCategories(transactions = []) {
  const categories = new Map()
  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || transaction.isSavings || !isFinanciallyEffectiveTransaction(transaction)) continue
    const categoryId = String(transaction.categoryId || 'without-category')
    const current = categories.get(categoryId) || {
      categoryId,
      categoryName: transaction.categoryName || 'Sem categoria',
      categoryColor: transaction.categoryColor || '',
      categoryIcon: transaction.categoryIcon || '',
      cents: 0,
      count: 0,
    }
    current.cents += toTransactionCents(transaction.amount)
    current.count += 1
    categories.set(categoryId, current)
  }
  return [...categories.values()]
    .map(({ cents, ...category }) => ({ ...category, total: cents / 100 }))
    .sort((first, second) => second.total - first.total)
}
