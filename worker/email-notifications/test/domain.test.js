import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeTransactions as summarizeCanonicalTransactions } from '../../../src/domain/finance.js'
import { getGoalEffectiveCurrent } from '../../../src/domain/savings.js'
import {
  effectiveGoalForNotifications,
  goalAlertCandidates,
  highestBudgetAlert,
  isPremiumUser,
  isReportDue,
  reportRange,
  summarizeTransactions,
} from '../src/domain.js'

test('valida premium e trial ativo', () => {
  const now = new Date('2026-07-27T12:00:00Z')
  assert.equal(
    isPremiumUser(
      {
        plan: 'premium',
        premiumUntil: '2026-08-01T00:00:00Z',
      },
      now,
    ),
    true,
  )
  assert.equal(
    isPremiumUser(
      {
        plan: 'trial',
        trialStart: '2026-07-25T00:00:00Z',
      },
      now,
    ),
    true,
  )
  assert.equal(
    isPremiumUser(
      {
        plan: 'trial',
        trialStart: '2026-07-01T00:00:00Z',
      },
      now,
    ),
    false,
  )
})

test('detecta relatório semanal no fuso', () => {
  const date = new Date('2026-07-27T12:00:00Z')
  assert.equal(
    isReportDue(
      {
        enabled: true,
        frequency: 'weekly',
        weekday: 1,
        reportHour: 8,
        timeZone: 'America/Campo_Grande',
      },
      date,
    ),
    true,
  )
})

test('seleciona somente o alerta de orçamento mais alto', () => {
  assert.equal(
    highestBudgetAlert({
      percentage: 95,
      thresholds: [70, 90, 100],
    }),
    90,
  )
  assert.equal(
    highestBudgetAlert({
      percentage: 112,
      thresholds: [70, 90, 100],
    }),
    'over',
  )
})

test('identifica progresso e prazo da meta', () => {
  const alerts = goalAlertCandidates(
    {
      targetAmount: 1000,
      currentAmount: 850,
      deadline: '2026-08-02',
    },
    new Date('2026-07-27T12:00:00Z'),
  )
  assert.deepEqual(alerts, ['progress-80', 'deadline-7'])
})

test('resume lançamentos do período', () => {
  const range = reportRange('weekly', new Date('2026-07-27T12:00:00Z'))
  const summary = summarizeTransactions(
    [
      {
        date: '2026-07-25',
        type: 'income',
        amount: 1000,
      },
      {
        date: '2026-07-26',
        type: 'expense',
        amount: 250,
        categoryName: 'Alimentação',
      },
    ],
    range,
  )

  assert.equal(summary.income, 1000)
  assert.equal(summary.expenses, 250)
  assert.equal(summary.balance, 750)
  assert.equal(summary.topCategories[0].name, 'Alimentação')
})

test('Worker usa a mesma atividade e elegibilidade que o aplicativo para compras parceladas', () => {
  const transactions = [
    ...['2026-12-10', '2027-01-10', '2027-02-10', '2027-03-10'].map((date) => ({
      type: 'expense',
      amount: '300.00',
      date,
      purchaseDate: '2026-10-21',
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      categoryName: 'Compras',
    })),
    { type: 'income', amount: '500.00', date: '2026-10-05' },
    { type: 'expense', amount: '900.00', date: '2026-10-06', paymentStatus: 'cancelled' },
    { type: 'expense', amount: 800, date: '2026-10-07', flowType: 'transfer' },
    { type: 'income', amount: 700, date: '2026-10-08', kind: 'transfer' },
    { type: 'expense', amount: '300.00', date: '2026-10-09', isSavings: true },
    {
      type: 'income',
      amount: '100.00',
      date: '2026-10-10',
      isSavings: true,
      savingsMovement: 'withdrawal',
    },
    { type: 'expense', amount: 700, createdAt: '2026-10-11T10:00:00Z' },
  ]
  const before = structuredClone(transactions)
  const range = {
    start: new Date('2026-10-01T00:00:00.000Z'),
    end: new Date('2026-10-31T23:59:59.999Z'),
  }
  const report = summarizeTransactions(transactions, range)
  const expected = summarizeCanonicalTransactions([
    ...transactions.slice(0, 4),
    transactions[4],
    transactions[8],
    transactions[9],
  ])

  assert.deepEqual(
    {
      income: report.income,
      expenses: report.expenses,
      balance: report.balance,
      savings: report.savings,
      count: report.count,
    },
    expected,
  )
  assert.deepEqual(report.topCategories, [{ name: 'Compras', amount: 1200 }])
  assert.deepEqual(
    {
      income: report.income,
      expenses: report.expenses,
      balance: report.balance,
      savings: report.savings,
      count: report.count,
    },
    { income: 500, expenses: 1200, balance: -700, savings: 200, count: 7 },
  )
  const december = summarizeTransactions(transactions, {
    start: new Date('2026-12-01T00:00:00Z'),
    end: new Date('2026-12-31T23:59:59.999Z'),
  })
  assert.equal(december.expenses, 0)
  assert.deepEqual(transactions, before)
})

test('Worker respeita data de atividade, vencimento legado e limite dos períodos', () => {
  const data = [
    {
      type: 'expense',
      amount: '1.01',
      date: '2026-12-01',
      purchaseDate: '2026-11-30',
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      categoryName: 'Alimentação',
    },
    {
      type: 'expense',
      amount: '1.02',
      date: '2026-11-30',
      categoryName: 'Alimentação',
    },
    { type: 'income', amount: '2.03', dueDate: '2026-11-01' },
    { type: 'expense', amount: 999, date: '2026-11-31' },
    { type: 'expense', amount: 888, createdAt: '2026-11-20T12:00:00Z' },
  ]
  const report = summarizeTransactions(data, {
    start: new Date('2026-11-01T00:00:00.000Z'),
    end: new Date('2026-11-30T23:59:59.999Z'),
  })
  assert.equal(report.income, 2.03)
  assert.equal(report.expenses, 2.03)
  assert.equal(report.balance, 0)
  assert.equal(report.count, 3)
  assert.deepEqual(report.topCategories, [{ name: 'Alimentação', amount: 2.03 }])
})

test('alertas de metas utilizam saldo inicial e aportes menos retiradas vinculadas', () => {
  const goal = {
    id: 'goal-emergency',
    name: 'Reserva de emergência',
    targetAmount: 3000,
    currentAmount: 2000,
    deadline: '2026-11-30',
  }
  const transactions = [
    { id: 'deposit', goalId: goal.id, isSavings: true, amount: '650.20', savingsMovement: 'deposit' },
    { id: 'withdrawal', goalId: goal.id, isSavings: true, amount: '150.10', savingsMovement: 'withdrawal' },
    { id: 'cancelled', goalId: goal.id, isSavings: true, amount: 800, paymentStatus: 'cancelled' },
    { id: 'transfer', goalId: goal.id, isSavings: true, amount: 500, flowType: 'transfer' },
    { id: 'other-goal', goalId: 'another-goal', isSavings: true, amount: 700 },
    { id: 'wrong-kind', goalId: goal.id, type: 'expense', amount: 100, isSavings: false },
  ]
  const original = structuredClone(goal)
  const effective = effectiveGoalForNotifications(goal, transactions)
  assert.equal(effective.currentAmount, getGoalEffectiveCurrent(goal, transactions))
  assert.equal(Math.round(effective.currentAmount * 100), 250010)
  assert.equal(Math.round((goal.targetAmount - effective.currentAmount) * 100), 49990)
  assert.deepEqual(
    goalAlertCandidates(effective, new Date('2026-11-15T12:00:00Z')),
    ['progress-80', 'deadline-30'],
  )
  assert.deepEqual(goal, original)
})

test('retiradas válidas impedem falso alerta de meta concluída', () => {
  const goal = { id: 'goal-travel', currentAmount: 900, targetAmount: 1000, deadline: '2026-11-17' }
  const transactions = [
    { goalId: goal.id, isSavings: true, amount: 200, savingsMovement: 'deposit' },
    { goalId: goal.id, isSavings: true, amount: 250, savingsMovement: 'withdrawal' },
  ]
  const effective = effectiveGoalForNotifications(goal, transactions)
  assert.equal(effective.currentAmount, 850)
  assert.deepEqual(
    goalAlertCandidates(effective, new Date('2026-11-15T12:00:00Z')),
    ['progress-80', 'deadline-7'],
  )
  assert.equal(goalAlertCandidates(effective, new Date('2026-11-18T12:00:00Z')).includes('progress-100'), false)
})

test('saldo legado não é somado duas vezes sem movimentação vinculada', () => {
  const goal = { id: 'goal-legacy', targetAmount: 5000, currentAmount: 3000 }
  assert.equal(effectiveGoalForNotifications(goal, []).currentAmount, 3000)
  assert.deepEqual(
    goalAlertCandidates(effectiveGoalForNotifications(goal, []), new Date('2026-11-15T12:00:00Z')),
    [],
  )
})
