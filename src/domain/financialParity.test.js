import { expect, test } from 'vitest'
import { buildInstallmentTransactions, splitInstallmentAmounts } from './creditCards'
import { moneyToCents, selectActivityMonth, summarizeActivityTransactions } from './financialCore'
import { summarizeTransactions, transactionsForMonth } from './finance'
import { getMonthlyFinancialData } from './monthlyFinance'
import { buildMoneyAssistantResponse } from './moneyAssistant'
import { analyzeMoney } from './money'
import { getGoalEffectiveCurrent } from './savings'
import {
  goalAlertCandidates,
  summarizeTransactions as workerSummary,
} from '../../worker/email-notifications/src/domain.js'

const card = { id: 'synthetic-card', name: 'Cartão teste', closingDay: 20, dueDay: 10 }
const installments = buildInstallmentTransactions({
  baseData: { description: 'Compra sintética', categoryId: 'housing', categoryName: 'Moradia' },
  totalAmount: 1200,
  installments: 4,
  purchaseDate: '2026-10-21',
  card,
  groupId: 'synthetic-installment-group',
})
const rows = [
  ...installments,
  { type: 'income', amount: '2.000,00', date: '2026-10-05' },
  {
    type: 'expense',
    amount: '100,50',
    date: '2026-10-15',
    categoryId: 'food',
    categoryName: 'Alimentação',
  },
  {
    type: 'income',
    isSavings: true,
    savingsMovement: 'deposit',
    goalId: 'goal-1',
    amount: '200,00',
    date: '2026-10-18',
  },
  {
    type: 'income',
    isSavings: true,
    savingsMovement: 'withdrawal',
    goalId: 'goal-1',
    amount: 50,
    date: '2026-10-19',
  },
  { type: 'expense', amount: 900, date: '2026-10-20', paymentStatus: 'cancelled' },
  { type: 'expense', amount: 999, date: '2026-10-24', flowType: 'transfer' },
]

test('Gate 0: compra em 21/10 fecha no ciclo seguinte e compõe faturas dez–mar', () => {
  expect(installments).toHaveLength(4)
  expect(installments.map((tx) => tx.invoiceMonth)).toEqual([
    '2026-12',
    '2027-01',
    '2027-02',
    '2027-03',
  ])
  expect(installments.map((tx) => tx.purchaseDate)).toEqual(Array(4).fill('2026-10-21'))
  expect(installments.reduce((sum, tx) => sum + moneyToCents(tx.amount), 0)).toBe(120000)
  expect(transactionsForMonth(installments, 2026, 9)).toHaveLength(4)
  expect(transactionsForMonth(installments, 2026, 11)).toHaveLength(0)
})

test('Gate 0: divisão de parcelas conserva cada centavo, inclusive resto indivisível', () => {
  const parts = splitInstallmentAmounts(1200.01, 4)
  expect(parts.map(moneyToCents)).toEqual([30001, 30000, 30000, 30000])
  expect(parts.reduce((sum, amount) => sum + moneyToCents(amount), 0)).toBe(120001)
})

test('Gate 0: montantes legados são convertidos sem concatenação e casos inválidos são zero', () => {
  expect(moneyToCents('R$ 1.234,56')).toBe(123456)
  expect(moneyToCents('1,234.56')).toBe(123456)
  expect(moneyToCents('100.50')).toBe(10050)
  expect(moneyToCents(1.005)).toBe(101)
  expect(moneyToCents('valor inválido')).toBe(0)
  expect(moneyToCents(Number.NaN)).toBe(0)
  expect(selectActivityMonth([{ date: '2026-02-31', amount: 5 }], 2026, 1)).toEqual([])
})

test('Gate 1: mesmo dataset e competência geram números iguais em Dashboard, Reports, Money e Worker', () => {
  const month = selectActivityMonth(rows, 2026, 9)
  const expected = { income: 2000, expenses: 1300.5, savings: 150, balance: 699.5, count: 8 }
  const dashboard = summarizeTransactions(transactionsForMonth(rows, 2026, 9))
  const report = getMonthlyFinancialData(rows, 1, new Date(2026, 9, 30))[0]
  const worker = workerSummary(rows, {
    start: new Date('2026-10-01T00:00:00.000Z'),
    end: new Date('2026-10-31T23:59:59.999Z'),
  })
  const money = buildMoneyAssistantResponse({
    message: 'Quero relatório de outubro 2026',
    transactions: rows,
    now: new Date(2026, 9, 30, 12),
    settings: { excludeSavings: false },
  })
  expect(summarizeActivityTransactions(month)).toEqual(expected)
  expect(dashboard).toEqual(expected)
  expect(worker).toMatchObject(expected)
  expect(report).toMatchObject({
    monthKey: '2026-10',
    income: expected.income,
    expenses: expected.expenses,
    savings: expected.savings,
    balance: expected.balance,
  })
  expect(money.type).toBe('monthly_report')
  expect(money.metrics).toEqual([
    { label: 'Receitas', value: 2000 },
    { label: 'Despesas', value: 1300.5 },
    { label: 'Resultado', value: 699.5 },
  ])
  expect(money.text).toContain('8 lançamentos')
  expect(worker.topCategories[0]).toEqual({ name: 'Moradia', amount: 1200 })
})

test('Gate 1: Money por ciclo usa atividade, cancelamento, transferência e montantes em centavos', () => {
  const analysis = analyzeMoney(rows, { excludeSavings: false }, new Date(2026, 9, 31, 12))
  expect(analysis.current.income).toBe(2000)
  expect(analysis.current.expenses).toBe(1300.5)
  expect(analysis.current.balance).toBe(699.5)
})

test('Gate 1: progresso de meta é saldo legado + aportes - retiradas nos dois consumidores', () => {
  const goal = { id: 'goal-1', currentAmount: 650, targetAmount: 1000 }
  expect(getGoalEffectiveCurrent(goal, rows)).toBe(800)
  expect(goalAlertCandidates(goal, new Date('2026-10-30T12:00:00Z'), rows)).toContain('progress-80')
  expect(goalAlertCandidates(goal, new Date('2026-10-30T12:00:00Z'), [])).not.toContain(
    'progress-80',
  )
})
