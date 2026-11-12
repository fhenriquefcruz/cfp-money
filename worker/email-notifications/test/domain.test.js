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

test('MR-002: resumo respeita atividade da compra, estornos e reservas sem misturar consumo', () => {
  const range = {
    start: new Date('2026-10-01T00:00:00.000Z'),
    end: new Date('2026-10-31T23:59:59.999Z'),
  }
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
  const original = structuredClone(transactions)
  const result = summarizeTransactions(transactions, range)

  assert.deepEqual(
    { income: result.income, expenses: result.expenses, savings: result.savings },
    { income: 3000, expenses: 1320.25, savings: 150 },
  )
  assert.equal(result.balance, 1679.75)
  assert.equal(result.count, 5)
  assert.deepEqual(result.topCategories, [
    { name: 'Moradia', amount: 1200 },
    { name: 'Alimentação', amount: 120.25 },
  ])
  assert.deepEqual(transactions, original)
})

test('MR-002: vencimento posterior não desloca compra para o resumo de dezembro', () => {
  const transactions = [
    {
      type: 'expense',
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      purchaseDate: '2026-10-21',
      date: '2026-12-10',
      amount: '300',
    },
  ]
  const december = {
    start: new Date('2026-12-01T00:00:00.000Z'),
    end: new Date('2026-12-31T23:59:59.999Z'),
  }
  assert.equal(summarizeTransactions(transactions, december).expenses, 0)
  assert.equal(summarizeTransactions(transactions, december).count, 0)
})
