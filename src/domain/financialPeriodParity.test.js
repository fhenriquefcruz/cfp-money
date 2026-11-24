import { expect, test } from 'vitest'
import { buildInstallmentTransactions } from './creditCards'
import { summarizeTransactions, transactionsForMonth } from './finance'
import { getBudgetSpent } from './budgetPeriods'
import { getMonthlyFinancialData } from './monthlyFinance'

test('Transações, Início, Orçamentos e Relatórios recebem a mesma parcela mensal', () => {
  const installments = buildInstallmentTransactions({
    baseData: { description: 'Bike', categoryId: 'transport' },
    totalAmount: 1200,
    installments: 3,
    purchaseDate: '2026-12-01',
    card: { id: 'card', name: 'Cartão', closingDay: 2, dueDay: 5 },
    groupId: 'bike',
  })

  expect(installments.map((installment) => installment.dueDate)).toEqual([
    '2026-12-05',
    '2027-01-05',
    '2027-02-05',
  ])

  for (const [year, month, monthKey] of [
    [2026, 11, '2026-12'],
    [2027, 0, '2027-01'],
    [2027, 1, '2027-02'],
  ]) {
    const monthlyTransactions = transactionsForMonth(installments, year, month)
    const transactionsTotal = summarizeTransactions(monthlyTransactions)
    const reportsTotal = getMonthlyFinancialData(installments, 1, new Date(year, month, 15))[0]
    const budgetTotal = getBudgetSpent(installments, 'transport', monthKey)

    expect(monthlyTransactions).toHaveLength(1)
    expect(transactionsTotal.expenses).toBe(400)
    expect(transactionsTotal.balance).toBe(-400)
    expect(reportsTotal.expenses).toBe(transactionsTotal.expenses)
    expect(reportsTotal.balance).toBe(transactionsTotal.balance)
    expect(budgetTotal).toBe(transactionsTotal.expenses)
  }
})
