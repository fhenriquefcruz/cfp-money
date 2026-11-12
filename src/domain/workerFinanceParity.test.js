import {
  summarizeTransactions as summarizeApp,
  transactionsForMonth,
} from './finance'
import { summarizeTransactions as summarizeWorker } from '../../worker/email-notifications/src/domain.js'

const range = (year, month) => ({
  start: new Date(Date.UTC(year, month - 1, 1)),
  end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
})

test('MR-002: Worker e app coincidem em competência, filtros e saldos', () => {
  const transactions = [
    { type: 'income', date: '2026-10-02', amount: '3000' },
    {
      type: 'expense',
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      purchaseDate: '2026-10-21',
      date: '2026-12-10',
      amount: '1200',
      categoryName: 'Moradia',
    },
    { type: 'expense', date: '2026-10-04', amount: 950, paymentStatus: 'cancelled' },
    { type: 'expense', date: '2026-10-05', amount: 500, flowType: 'transfer' },
    { type: 'income', date: '2026-10-06', amount: 900, kind: 'transfer' },
    {
      type: 'expense',
      date: '2026-10-09',
      amount: 200,
      isSavings: true,
      savingsMovement: 'deposit',
      categoryName: 'Reserva',
    },
    {
      type: 'expense',
      date: '2026-10-11',
      amount: '50',
      isSavings: true,
      savingsMovement: 'withdrawal',
    },
    { type: 'expense', date: '2026-10-12', amount: '120.25', categoryName: 'Alimentação' },
    { type: 'expense', createdAt: '2026-10-13T09:00:00Z', amount: 180 },
  ]
  const before = structuredClone(transactions)

  const app = summarizeApp(transactionsForMonth(transactions, 2026, 9))
  const worker = summarizeWorker(transactions, range(2026, 10))

  expect(worker).toMatchObject({
    income: app.income,
    expenses: app.expenses,
    savings: app.savings,
    balance: app.balance,
    count: app.count,
  })
  expect(worker.topCategories).toEqual([
    { name: 'Moradia', amount: 1200 },
    { name: 'Alimentação', amount: 120.25 },
  ])
  expect(transactions).toEqual(before)
})

test('MR-002: mês de vencimento não reconhece compra feita em outubro', () => {
  const transactions = [
    {
      type: 'expense',
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      purchaseDate: '2026-10-21',
      date: '2026-12-10',
      amount: 300,
    },
  ]
  const app = summarizeApp(transactionsForMonth(transactions, 2026, 11))
  const worker = summarizeWorker(transactions, range(2026, 12))
  expect(worker.expenses).toBe(app.expenses)
  expect(worker.count).toBe(app.count)
})

test('MR-002: paridade em janela semanal dentro do mês', () => {
  const transactions = [
    { type: 'income', date: '2026-10-19', amount: 500 },
    {
      type: 'expense',
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      purchaseDate: '2026-10-21',
      date: '2026-12-10',
      amount: 250,
    },
    { type: 'expense', date: '2026-10-22', amount: 90, flowType: 'transfer' },
    { type: 'expense', date: '2026-10-24', amount: 100 },
    { type: 'expense', date: '2026-10-27', amount: 150 },
  ]
  const weeklyRange = {
    start: new Date('2026-10-20T00:00:00.000Z'),
    end: new Date('2026-10-26T23:59:59.999Z'),
  }
  const activity = transactionsForMonth(transactions, 2026, 9).filter((transaction) => {
    const date = transaction.purchaseDate || transaction.date || ''
    return date >= '2026-10-20' && date <= '2026-10-26'
  })
  const app = summarizeApp(activity)
  const worker = summarizeWorker(transactions, weeklyRange)
  expect(worker).toMatchObject({
    income: app.income,
    expenses: app.expenses,
    savings: app.savings,
    balance: app.balance,
    count: app.count,
  })
})
