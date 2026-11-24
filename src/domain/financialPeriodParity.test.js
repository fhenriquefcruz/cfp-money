import { expect, test } from 'vitest'
import { buildInstallmentTransactions } from './creditCards'
import { summarizeTransactions, transactionsForMonth } from './finance'
import { getBudgetSpent } from './budgetPeriods'
import { getMonthlyFinancialData } from './monthlyFinance'
import { buildMoneyAssistantResponse } from './moneyAssistant'
import { summarizeTransactions as summarizeWorkerTransactions } from '../../worker/email-notifications/src/domain.js'

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

test('Money e Worker compartilham competência, cancelamentos, reservas e centavos', () => {
  const rows = [
    ...buildInstallmentTransactions({
      baseData: { description: 'Bike', categoryId: 'transport', categoryName: 'Transporte' },
      totalAmount: 1200.01,
      installments: 3,
      purchaseDate: '2026-12-01',
      card: { id: 'card', name: 'Cartão', closingDay: 2, dueDay: 5 },
      groupId: 'parity-p1',
    }),
    { type: 'expense', amount: '100,50', date: '2026-12-02', categoryName: 'Transporte' },
    { type: 'expense', amount: 900, date: '2026-12-03', paymentStatus: 'cancelled' },
    { type: 'expense', amount: 200, date: '2026-12-03', kind: 'transfer' },
    { type: 'income', isSavings: true, amount: 250, date: '2026-12-03' },
  ]

  for (const [year, month, label] of [
    [2026, 11, 'dezembro'],
    [2027, 0, 'janeiro'],
    [2027, 1, 'fevereiro'],
  ]) {
    const period = new Date(year, month, 15)
    const range = {
      start: new Date(Date.UTC(year, month, 1, 0, 0, 0)),
      end: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)),
    }
    const ledger = summarizeTransactions(transactionsForMonth(rows, year, month))
    const reports = getMonthlyFinancialData(rows, 1, period)[0]
    const worker = summarizeWorkerTransactions(rows, range)
    const money = buildMoneyAssistantResponse({
      message: `Relatório de ${label} de ${year}`,
      transactions: rows,
      now: period,
      settings: { excludeSavings: true },
    })

    expect(worker).toMatchObject({
      income: ledger.income,
      expenses: ledger.expenses,
      savings: ledger.savings,
      balance: ledger.balance,
      count: ledger.count,
    })
    expect(reports).toMatchObject({
      income: ledger.income,
      expenses: ledger.expenses,
      savings: ledger.savings,
      balance: ledger.balance,
    })
    expect(money.type).toBe('monthly_report')
    expect(money.metrics.find((item) => item.label === 'Despesas')?.value).toBe(ledger.expenses)
  }
})
