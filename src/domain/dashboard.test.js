import {
  buildCategoryBreakdown,
  buildDashboardActionInsights,
  buildDashboardPriorityActions,
  buildMonthAttentionSignals,
  buildPeriodResultInsight,
  getCalendarMonthBounds,
  getLargestMonthlyExpenseChange,
  getRecentDashboardTransactions,
  summarizeDashboardActivity,
  resolveDashboardActivityScope,
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

test('prioriza atrasos, vencimentos e orçamento antes do saldo negativo', () => {
  const signals = buildMonthAttentionSignals({
    paymentSummary: {
      overdueCount: 2,
      overdueAmount: 350,
      dueNext7DaysCount: 1,
      dueNext7DaysAmount: 120,
    },
    budgetAlerts: [
      {
        budget: { id: 'food', amount: 1000 },
        cat: { name: 'Alimentação' },
        spent: 920,
        pct: 92,
      },
    ],
    balance: -500,
  })

  expect(signals.map((signal) => signal.type)).toEqual(['overdue', 'due-soon', 'budget'])
  expect(signals).toHaveLength(3)
})

test('inclui saldo negativo quando ainda existe espaço na Central do mês', () => {
  expect(
    buildMonthAttentionSignals({
      paymentSummary: {},
      budgetAlerts: [],
      balance: -480,
    }),
  ).toEqual([
    {
      type: 'negative-balance',
      amount: 480,
    },
  ])
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
    tone: 'negative',
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

test('Dashboard v2: corte por atividade não reinterpreta fatura, status ou transferências', () => {
  const transactions = [
    { type: 'income', date: '2026-11-02', amount: '1000' },
    {
      type: 'expense',
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      purchaseDate: '2026-11-05',
      date: '2026-12-10',
      amount: '300',
    },
    { type: 'expense', date: '2026-11-21', amount: 200 },
    { type: 'expense', date: '2026-11-04', amount: 800, paymentStatus: 'cancelled' },
    { type: 'expense', date: '2026-11-07', amount: 700, flowType: 'transfer' },
    { type: 'expense', date: '2026-11-08', amount: 600, kind: 'transfer' },
    {
      type: 'income',
      date: '2026-11-06',
      amount: 50,
      isSavings: true,
      savingsMovement: 'deposit',
    },
  ]
  const before = structuredClone(transactions)
  const toDate = summarizeDashboardActivity(transactions, 2026, 10, '2026-11-12')
  const entireMonth = summarizeDashboardActivity(transactions, 2026, 10)

  expect(toDate).toMatchObject({
    income: 1000,
    expenses: 300,
    balance: 700,
    savings: 50,
    count: 3,
  })
  expect(entireMonth).toMatchObject({
    income: 1000,
    expenses: 500,
    balance: 500,
    savings: 50,
    count: 4,
  })
  expect(summarizeDashboardActivity(transactions, 2026, 9, '2026-11-12').count).toBe(0)
  expect(summarizeDashboardActivity(transactions, 2026, 11, '2026-11-12').count).toBe(0)
  expect(transactions).toEqual(before)
})

test('Dashboard v2 limita a central a duas causas diferentes e prioriza atrasos', () => {
  const summary = {
    overdueCount: 2,
    overdueAmount: 900,
    dueNext7DaysCount: 3,
  }
  const input = {
    paymentSummary: summary,
    categoryReviewCount: 2,
    budgetAlerts: [
      {
        budget: { id: 'food', categoryId: 'food', amount: 1000 },
        cat: { name: 'Alimentação' },
        spent: 1120,
        pct: 112,
      },
    ],
    monthKey: '2026-11',
  }
  const before = structuredClone(input)
  const result = buildDashboardPriorityActions(input)

  expect(result).toEqual([
    {
      cause: 'payment',
      title: '2 pagamentos atrasados',
      detail: 'Confira os compromissos vencidos e a situação de cada pagamento.',
      to: '/transactions?month=2026-11',
    },
    {
      cause: 'budget',
      title: 'Orçamento ultrapassado',
      detail: 'Revise o limite de Alimentação neste mês.',
      to: '/budgets?month=2026-11',
    },
  ])
  expect(input).toEqual(before)
})

test('Dashboard v2 agrupa vencimentos e destaca o orçamento somente no limite ou excedido', () => {
  const actions = buildDashboardPriorityActions({
    paymentSummary: { dueNext7DaysCount: 1 },
    budgetAlerts: [{ budget: { id: 'food', amount: 1000 }, spent: 1100, pct: 110 }],
    monthKey: '2026-11',
  })
  expect(actions.map((action) => action.cause)).toEqual(['payment', 'budget'])
  expect(actions[0].title).toBe('1 vencimento próximo')
  expect(actions[1].title).toBe('Orçamento ultrapassado')
  const noBudgetAlert = buildDashboardPriorityActions({
    budgetAlerts: [{ budget: { amount: 1000 }, spent: 690, pct: 69 }],
    monthKey: '2026-11',
  })
  expect(noBudgetAlert).toEqual([])
  expect(buildDashboardPriorityActions({ categoryReviewCount: 1, limit: 0 })).toEqual([])
})

test('Dashboard v2 preserva a revisão de categoria quando não há alerta financeiro crítico', () => {
  const items = buildDashboardPriorityActions({
    paymentSummary: { overdueCount: 0, dueNext7DaysCount: 0 },
    categoryReviewCount: 2,
    budgetAlerts: [{ budget: { amount: 1000 }, spent: 840, pct: 84 }],
    monthKey: '2026-11',
  })
  expect(items).toEqual([
    {
      cause: 'category',
      title: '2 classificações para revisar',
      detail:
        'Revise manualmente as categorias; nenhum lançamento será modificado automaticamente.',
      to: '/transactions?review=categories&month=2026-11',
    },
  ])

  const withBudget = buildDashboardPriorityActions({
    categoryReviewCount: 2,
    budgetAlerts: [{ budget: { amount: 1000 }, spent: 1000, pct: 100 }],
    monthKey: '2026-11',
  })
  expect(withBudget.map((item) => item.cause)).toEqual(['budget', 'category'])
  expect(withBudget[0].title).toBe('Orçamento no limite')
})

test('Dashboard v2 impede recorte até hoje fora do mês corrente sem mudar transações', () => {
  const now = new Date(2026, 10, 12, 12)
  expect(resolveDashboardActivityScope('to_date', 2026, 10, now)).toBe('to_date')
  expect(resolveDashboardActivityScope('full_month', 2026, 10, now)).toBe('full_month')
  expect(resolveDashboardActivityScope('to_date', 2026, 9, now)).toBe('full_month')
  expect(resolveDashboardActivityScope('to_date', 2026, 11, now)).toBe('full_month')
})
