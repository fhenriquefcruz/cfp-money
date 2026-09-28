import { buildMoneyPriorities } from './moneyPriorities'

test('prioriza atrasos, orçamento estourado e saldo negativo', () => {
  const report = buildMoneyPriorities({
    paymentSummary: {
      overdueCount: 2,
      overdueAmount: 350,
      dueNext7DaysCount: 1,
      dueNext7DaysAmount: 100,
    },
    budgetAlerts: [
      {
        pct: 130,
        spent: 650,
        budget: { categoryId: 'food', amount: 500 },
        cat: { name: 'Alimentação' },
      },
    ],
    balance: -200,
    goals: [{ id: 'g1' }],
  })

  expect(report.priorities.map((item) => item.id)).toEqual([
    'payments-overdue',
    'budget-over-food',
    'negative-balance',
  ])
  expect(report.hasCritical).toBe(true)
})

test('não repete área de pagamentos quando já existe atraso mais urgente', () => {
  const report = buildMoneyPriorities({
    paymentSummary: {
      overdueCount: 1,
      overdueAmount: 100,
      dueNext7DaysCount: 3,
      dueNext7DaysAmount: 900,
    },
    goals: [{ id: 'g1' }],
  })

  expect(report.priorities.filter((item) => item.area === 'payments')).toHaveLength(1)
  expect(report.priorities[0].id).toBe('payments-overdue')
})

test('inclui diagnóstico de vazamento quando ele é relevante', () => {
  const report = buildMoneyPriorities({
    spendingLeakReport: {
      status: 'attention',
      findings: [
        {
          id: 'small-expenses',
          title: 'Pequenos gastos estão somando',
          detail: '8 lançamentos somam R$ 200,00.',
          actionLabel: 'Ver pequenos gastos',
          to: '/transactions',
        },
      ],
    },
    goals: [{ id: 'g1' }],
  })

  expect(report.priorities[0]).toMatchObject({
    id: 'leak-small-expenses',
    source: 'diagnostic',
    area: 'spending',
  })
})

test('usa a oportunidade de saúde sem duplicar um orçamento já em atenção', () => {
  const report = buildMoneyPriorities({
    budgetAlerts: [
      {
        pct: 90,
        spent: 450,
        budget: { categoryId: 'food', amount: 500 },
        cat: { name: 'Alimentação' },
      },
    ],
    healthReport: {
      nextAction: {
        id: 'budgets',
        label: 'Orçamentos',
        missingPoints: 20,
        actionLabel: 'Revisar orçamentos',
        to: '/budgets',
      },
    },
    goals: [{ id: 'g1' }],
  })

  expect(report.priorities.filter((item) => item.area === 'budget')).toHaveLength(1)
  expect(report.priorities[0].id).toBe('budget-attention-food')
})

test('quando não há alertas, sugere meta como oportunidade em vez de inventar urgência', () => {
  const report = buildMoneyPriorities({
    healthReport: { nextAction: null },
    spendingLeakReport: { status: 'clear', findings: [] },
    goals: [],
  })

  expect(report.hasCritical).toBe(false)
  expect(report.priorities).toEqual([
    expect.objectContaining({
      id: 'goals-empty',
      level: 'opportunity',
    }),
  ])
})
