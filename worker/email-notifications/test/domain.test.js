import test from 'node:test'
import assert from 'node:assert/strict'
import {
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

test('Gate 1: atividade de compra no crédito, cancelamento, transferência e reserva não inflam consumo', () => {
  const installments = Array.from({ length: 4 }, (_, index) => ({
    type: 'expense',
    paymentMethod: 'credit_card',
    isCreditPurchase: true,
    purchaseDate: '2026-10-21',
    date: ['2026-12-10', '2027-01-10', '2027-02-10', '2027-03-10'][index],
    invoiceMonth: ['2026-12', '2027-01', '2027-02', '2027-03'][index],
    categoryName: 'Moradia',
    amount: 300,
  }))
  const range = {
    start: new Date('2026-10-01T00:00:00Z'),
    end: new Date('2026-10-31T23:59:59Z'),
  }
  const actual = summarizeTransactions(
    [
      ...installments,
      { type: 'income', date: '2026-10-02', amount: '2.000,00' },
      { type: 'expense', date: '2026-10-03', amount: '100,50', categoryName: 'Alimentação' },
      {
        type: 'income',
        isSavings: true,
        savingsMovement: 'deposit',
        amount: 200,
        date: '2026-10-10',
      },
      {
        type: 'income',
        isSavings: true,
        savingsMovement: 'withdrawal',
        amount: 50,
        date: '2026-10-11',
      },
      { type: 'expense', date: '2026-10-08', amount: 900, paymentStatus: 'cancelled' },
      { type: 'expense', date: '2026-10-09', amount: 999, kind: 'transfer' },
    ],
    range,
  )
  assert.equal(actual.income, 2000)
  assert.equal(actual.expenses, 1300.5)
  assert.equal(actual.savings, 150)
  assert.equal(actual.balance, 699.5)
  assert.equal(actual.count, 8)
  assert.deepEqual(actual.topCategories[0], { name: 'Moradia', amount: 1200 })
})

test('Gate 1: meta por ID utiliza saldo inicial, aporte e retirada e ignora cancelados', () => {
  const goal = { id: 'synthetic-goal', targetAmount: 1000, currentAmount: 650 }
  const rows = [
    { type: 'income', isSavings: true, goalId: 'synthetic-goal', amount: 200 },
    {
      type: 'income',
      isSavings: true,
      goalId: 'synthetic-goal',
      savingsMovement: 'withdrawal',
      amount: 50,
    },
    {
      type: 'income',
      isSavings: true,
      goalId: 'synthetic-goal',
      amount: 900,
      paymentStatus: 'cancelled',
    },
    { type: 'income', isSavings: true, goalId: 'other', amount: 999 },
  ]
  assert.deepEqual(goalAlertCandidates(goal, new Date('2026-10-30T12:00:00Z'), rows), [
    'progress-80',
  ])
  assert.deepEqual(goalAlertCandidates(goal, new Date('2026-10-30T12:00:00Z'), []), [])
})
