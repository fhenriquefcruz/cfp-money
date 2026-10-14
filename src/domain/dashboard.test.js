import {
  buildCategoryBreakdown,
  buildDashboardActionInsights,
  buildPeriodResultInsight,
  getCalendarMonthBounds,
  getLargestMonthlyExpenseChange,
  getRecentDashboardTransactions,
} from './dashboard'

test('gera limites mensais em data local sem converter para UTC', () => {
  expect(getCalendarMonthBounds(new Date(2026, 7, 15, 23, 30))).toEqual({
    start: '2026-08-01',
    end: '2026-08-31',
  })
})

test('exclui o mês seguinte e ordena as transações recentes por atividade', () => {
  const transactions = [
    { id: 'older', date: '2026-08-03', type: 'expense', amount: 20 },
    { id: 'next-month', date: '2026-09-01', type: 'expense', amount: 30 },
    { id: 'savings', date: '2026-08-30', type: 'expense', amount: 40, isSavings: true },
    {
      id: 'credit-purchase',
      date: '2026-08-31',
      dueDate: '2026-08-31',
      purchaseDate: '2026-08-20',
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      type: 'expense',
      amount: 50,
    },
    {
      id: 'manual-different-due',
      date: '2026-08-28',
      dueDate: '2026-09-05',
      type: 'expense',
      amount: 70,
    },
    { id: 'newer', date: '2026-08-25', type: 'expense', amount: 60 },
  ]

  expect(
    getRecentDashboardTransactions(transactions, {
      start: '2026-08-01',
      end: '2026-08-31',
    }).map((transaction) => transaction.id),
  ).toEqual(['manual-different-due', 'newer', 'credit-purchase', 'older'])
})

test('ordena categorias por gasto e calcula participação e variação', () => {
  const result = buildCategoryBreakdown(
    [
      { categoryId: 'food', categoryName: 'Alimentação', total: 600 },
      { categoryId: 'transport', categoryName: 'Transporte', total: 400 },
    ],
    [
      { categoryId: 'food', categoryName: 'Alimentação', total: 500 },
      { categoryId: 'transport', categoryName: 'Transporte', total: 500 },
    ],
  )

  expect(result.map((item) => item.categoryId)).toEqual(['food', 'transport'])
  expect(result[0]).toMatchObject({
    sharePercent: 60,
    changePercent: 20,
  })
  expect(result[1]).toMatchObject({
    sharePercent: 40,
    changePercent: -20,
  })
})

test('encontra a maior mudança absoluta de despesas entre meses', () => {
  expect(
    getLargestMonthlyExpenseChange([
      { monthKey: '2026-06', fullMonth: 'junho de 2026', expenses: 1000 },
      { monthKey: '2026-07', fullMonth: 'julho de 2026', expenses: 1600 },
      { monthKey: '2026-08', fullMonth: 'agosto de 2026', expenses: 1200 },
    ]),
  ).toMatchObject({
    monthKey: '2026-07',
    delta: 600,
    percent: 60,
  })
})

test('resume o resultado do período com leitura executiva e comparação mensal', () => {
  expect(
    buildPeriodResultInsight(
      { income: 10000, expenses: 8000, balance: 2000, count: 8 },
      { income: 9000, expenses: 8000, balance: 1000, count: 7 },
    ),
  ).toEqual({
    tone: 'positive',
    statusLabel: 'Período no azul',
    expenseIncomeRatio: 80,
    retainedIncomeRatio: 20,
    comparisonDelta: 1000,
    comparisonTone: 'positive',
    story: 'Resultado positivo equivalente a 20% das receitas do período.',
  })
})

test('sinaliza pressão quando despesas superam receitas', () => {
  expect(
    buildPeriodResultInsight(
      { income: 4000, expenses: 4500, balance: -500, count: 5 },
      { income: 5000, expenses: 4700, balance: 300, count: 6 },
    ),
  ).toMatchObject({
    statusLabel: 'Fluxo pressionado',
    expenseIncomeRatio: 113,
    retainedIncomeRatio: null,
    comparisonDelta: -800,
    comparisonTone: 'negative',
    story: 'As despesas superaram as receitas no período visualizado.',
  })
})

test('não força comparação quando o mês anterior não possui atividade', () => {
  expect(
    buildPeriodResultInsight({ income: 3000, expenses: 2500, balance: 500, count: 3 }, {}),
  ).toMatchObject({
    comparisonDelta: null,
    comparisonTone: 'neutral',
  })
})

test('gera leituras acionáveis com resultado, categoria e proteção financeira', () => {
  const insights = buildDashboardActionInsights({
    currentSummary: { income: 10000, expenses: 7000, balance: 3000, count: 8 },
    previousSummary: { income: 9000, expenses: 7500, balance: 1500, count: 7 },
    categoryBreakdown: [
      {
        categoryId: 'food',
        categoryName: 'Alimentação',
        total: 2100,
        sharePercent: 30,
        changePercent: 20,
      },
    ],
    paymentSummary: {
      overdueCount: 0,
      dueNext7DaysCount: 0,
    },
    savingsOverview: {
      totalBalance: 5000,
      periodNet: 600,
    },
    budgetMonthKey: '2026-10',
  })

  expect(insights).toHaveLength(3)
  expect(insights.map((item) => item.title)).toEqual([
    'Resultado melhorou',
    'Alimentação lidera os gastos',
    'Reservas como proteção',
  ])
  expect(insights[0]).toMatchObject({
    amount: 1500,
  })
  expect(insights[1]).toMatchObject({
    title: 'Alimentação lidera os gastos',
    amount: 2100,
  })
  expect(insights[2]).toMatchObject({
    title: 'Reservas como proteção',
    amount: 5000,
  })
})

test('prioriza compromissos vencidos na leitura de proteção financeira', () => {
  const insights = buildDashboardActionInsights({
    currentSummary: { income: 5000, expenses: 5500, balance: -500, count: 6 },
    previousSummary: { income: 5200, expenses: 5000, balance: 200, count: 5 },
    categoryBreakdown: [],
    paymentSummary: {
      overdueCount: 2,
      overdueAmount: 800,
      dueNext7DaysCount: 1,
      dueNext7DaysAmount: 200,
    },
    savingsOverview: {
      totalBalance: 2000,
      periodNet: 100,
    },
    budgetMonthKey: '2026-10',
  })

  expect(insights.map((item) => item.title)).toEqual([
    'Resultado perdeu força',
    '2 pagamentos atrasados',
  ])
  expect(insights[1]).toMatchObject({
    amount: 800,
    actionLabel: 'Regularizar',
  })
})

test('usa orçamento como próximo passo quando não há alerta de pagamentos nem reserva ativa', () => {
  const insights = buildDashboardActionInsights({
    currentSummary: { income: 3000, expenses: 2500, balance: 500, count: 3 },
    previousSummary: {},
    categoryBreakdown: [],
    paymentSummary: {},
    savingsOverview: {},
    budgetMonthKey: '2026-10',
  })

  expect(insights.at(-1)).toMatchObject({
    title: 'Planejamento do mês',
    to: '/budgets?month=2026-10',
  })
})
