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
        premiumUntil:
          '2026-08-01T00:00:00Z',
      },
      now,
    ),
    true,
  )
  assert.equal(
    isPremiumUser(
      {
        plan: 'trial',
        trialStart:
          '2026-07-25T00:00:00Z',
      },
      now,
    ),
    true,
  )
  assert.equal(
    isPremiumUser(
      {
        plan: 'trial',
        trialStart:
          '2026-07-01T00:00:00Z',
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
  assert.deepEqual(alerts, [
    'progress-80',
    'deadline-7',
  ])
})

test('resume lançamentos do período', () => {
  const range = reportRange(
    'weekly',
    new Date('2026-07-27T12:00:00Z'),
  )
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
  assert.equal(
    summary.topCategories[0].name,
    'Alimentação',
  )
})
