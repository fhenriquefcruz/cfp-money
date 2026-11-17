import { summarizeTransactions, transactionsForMonth } from './finance'
import { analyzeMoney } from './money'
import { buildMoneyAssistantResponse, parseMoneyAssistantIntent } from './moneyAssistant'

const categories = [
  { id: 'food', name: 'Alimentação' },
  { id: 'transport', name: 'Transporte' },
]

const transactions = [
  {
    type: 'income',
    amount: 5000,
    date: '2026-04-05',
    categoryId: 'salary',
    categoryName: 'Salário',
  },
  {
    type: 'expense',
    amount: 400,
    date: '2026-04-10',
    categoryId: 'food',
    categoryName: 'Alimentação',
  },
  {
    type: 'expense',
    amount: 100,
    date: '2026-04-15',
    categoryId: 'transport',
    categoryName: 'Transporte',
  },
  {
    type: 'expense',
    amount: 250,
    date: '2026-07-10',
    categoryId: 'food',
    categoryName: 'Alimentação',
  },
  {
    type: 'expense',
    amount: 200,
    date: '2026-06-10',
    categoryId: 'food',
    categoryName: 'Alimentação',
  },
]

const now = new Date(2026, 6, 26, 12)

test('entende relatório de mês explícito sem exigir ano', () => {
  expect(
    parseMoneyAssistantIntent('Money, quero o relatório de abril', categories, transactions, now),
  ).toMatchObject({
    type: 'monthly_report',
    requestedMonth: { year: 2026, month: 3 },
  })
})

test('resolve mês futuro sem ano como o ano anterior', () => {
  expect(
    parseMoneyAssistantIntent('Quero o relatório de dezembro', categories, transactions, now),
  ).toMatchObject({
    requestedMonth: { year: 2025, month: 11 },
  })
})

test('gera relatório mensal sem modificar transações', () => {
  const original = structuredClone(transactions)
  const response = buildMoneyAssistantResponse({
    message: 'Quero o relatório de abril',
    transactions,
    categories,
    now,
    analyze: analyzeMoney,
  })

  expect(response).toMatchObject({
    type: 'monthly_report',
    reportMonth: '2026-04',
  })
  expect(response.metrics[0]).toEqual({ label: 'Receitas', value: 5000 })
  expect(response.metrics[1]).toEqual({ label: 'Despesas', value: 500 })
  expect(transactions).toEqual(original)
})

test('consulta gastos por categoria e mês', () => {
  const response = buildMoneyAssistantResponse({
    message: 'Quanto gastei com alimentação em abril?',
    transactions,
    categories,
    now,
    analyze: analyzeMoney,
  })

  expect(response).toMatchObject({
    type: 'category_report',
    reportMonth: '2026-04',
  })
  expect(response.metrics[0]).toEqual({ label: 'Total', value: 400 })
})

test('analisa o ciclo atual usando o núcleo do Money', () => {
  const response = buildMoneyAssistantResponse({
    message: 'Como estão minhas finanças?',
    transactions,
    categories,
    settings: {},
    now,
    analyze: analyzeMoney,
  })

  expect(response.type).toBe('cycle_summary')
  expect(response.metrics.find((metric) => metric.label === 'Despesas').value).toBe(250)
})

test('responde com ajuda para pedidos não reconhecidos', () => {
  const response = buildMoneyAssistantResponse({
    message: 'Faça uma transferência bancária',
    transactions,
    categories,
    now,
    analyze: analyzeMoney,
  })

  expect(response.type).toBe('help')
  expect(response.text).toContain('sem alterar')
})

test('responde quanto foi gasto no mês atual', () => {
  const response = buildMoneyAssistantResponse({
    message: 'Quanto gastei este mês?',
    transactions,
    categories,
    now,
    analyze: analyzeMoney,
  })

  expect(response.type).toBe('monthly_report')
  expect(response.metrics.find((metric) => metric.label === 'Despesas')).toEqual({
    label: 'Despesas',
    value: 250,
  })
  expect(response.reportMonth).toBe('2026-07')
})

test('lista as maiores despesas sem criar lançamento', () => {
  const response = buildMoneyAssistantResponse({
    message: 'Quais são minhas maiores despesas?',
    transactions,
    categories,
    now,
    analyze: analyzeMoney,
  })

  expect(response.type).toBe('top')
  expect(response.text).toContain('250,00')
})

test('responde comparação com o período anterior', () => {
  const response = buildMoneyAssistantResponse({
    message: 'Como estou comparado ao período anterior?',
    transactions,
    categories,
    now,
    analyze: analyzeMoney,
  })

  expect(response.type).toBe('cycle_summary')
  expect(response.text).toContain('período equivalente anterior')
  expect(response.metrics.some((metric) => metric.label === 'Despesas')).toBe(true)
})

test('responde o que merece atenção usando as prioridades já calculadas', () => {
  const response = buildMoneyAssistantResponse({
    message: 'O que merece minha atenção agora?',
    transactions,
    categories,
    now,
    analyze: analyzeMoney,
    priority: 'Combustível ultrapassou o orçamento',
  })

  expect(response.type).toBe('priority')
  expect(response.text).toContain('Combustível ultrapassou o orçamento')
})

test('reconhece pergunta sobre aprendizado individual do Money', () => {
  expect(
    parseMoneyAssistantIntent(
      'O que você aprendeu sobre meus gastos?',
      categories,
      transactions,
      now,
    ),
  ).toMatchObject({
    type: 'personalization_profile',
  })
})

test('explica quando a personalização está desativada', () => {
  const response = buildMoneyAssistantResponse({
    message: 'O que você aprendeu sobre meus gastos?',
    transactions,
    categories,
    settings: { personalizationEnabled: false },
    now,
    analyze: analyzeMoney,
    personalizationProfile: null,
  })

  expect(response).toMatchObject({
    type: 'personalization_profile',
    title: 'Personalização desativada',
  })
  expect(response.text).toContain('Preferências do Money')
})

test('apresenta perfil individual com evidências agregadas e rótulos legíveis', () => {
  const response = buildMoneyAssistantResponse({
    message: 'Como eu costumo gastar?',
    transactions,
    categories,
    settings: { personalizationEnabled: true },
    now,
    analyze: analyzeMoney,
    personalizationProfile: {
      sampleSize: 12,
      confidence: 'medium',
      topCategory: {
        name: 'Alimentação',
        share: 0.45,
      },
      preferredPaymentMethod: {
        id: 'credit_card',
        label: 'Cartão de crédito',
        count: 8,
      },
    },
  })

  expect(response).toMatchObject({
    type: 'personalization_profile',
    title: 'O que aprendi com seu histórico',
  })
  expect(response.text).toContain('Alimentação')
  expect(response.text).toContain('Cartão de crédito')
  expect(response.metrics).toEqual(
    expect.arrayContaining([
      { label: 'Amostra', rawValue: '12 despesas' },
      { label: 'Categoria principal', rawValue: 'Alimentação · 45%' },
      { label: 'Mais usado', rawValue: 'Cartão de crédito' },
    ]),
  )
})

test('não afirma padrão quando a amostra ainda é insuficiente', () => {
  const response = buildMoneyAssistantResponse({
    message: 'Meu perfil financeiro',
    transactions,
    categories,
    settings: { personalizationEnabled: true },
    now,
    analyze: analyzeMoney,
    personalizationProfile: {
      sampleSize: 3,
      confidence: 'insufficient',
      topCategory: null,
      preferredPaymentMethod: null,
    },
  })

  expect(response).toMatchObject({
    type: 'personalization_profile',
    title: 'Ainda estou formando seu perfil',
  })
  expect(response.metrics).toEqual([{ label: 'Amostra', rawValue: '3 despesas' }])
})

test('Money usa atividade da compra e os filtros financeiros canônicos no relatório mensal', () => {
  const creditInstallmentDates = ['2026-12-10', '2027-01-10', '2027-02-10', '2027-03-10']
  const creditInstallments = creditInstallmentDates.map((date) => ({
    type: 'expense',
    amount: '300.00',
    date,
    purchaseDate: '2026-10-21',
    paymentMethod: 'credit_card',
    isCreditPurchase: true,
    categoryId: 'food',
    categoryName: 'Alimentação',
  }))
  const entries = [
    ...creditInstallments,
    { type: 'income', amount: '500.00', date: '2026-10-05' },
    { type: 'expense', amount: 900, date: '2026-10-07', paymentStatus: 'cancelled' },
    { type: 'expense', amount: 800, date: '2026-10-08', flowType: 'transfer' },
    { type: 'income', amount: 700, date: '2026-10-09', kind: 'transfer' },
    { type: 'expense', amount: 999, date: '2026-10-10', isSavings: true },
  ]
  const original = structuredClone(entries)
  const expected = summarizeTransactions(
    transactionsForMonth(entries, 2026, 9).filter((entry) => !entry.isSavings),
  )
  const october = buildMoneyAssistantResponse({
    message: 'Relatório de outubro de 2026',
    transactions: entries,
    categories,
    now,
    analyze: analyzeMoney,
  })
  const december = buildMoneyAssistantResponse({
    message: 'Relatório de dezembro de 2026',
    transactions: entries,
    categories,
    now,
    analyze: analyzeMoney,
  })

  expect(expected).toMatchObject({ income: 500, expenses: 1200, balance: -700 })
  expect(october.metrics).toEqual([
    { label: 'Receitas', value: expected.income },
    { label: 'Despesas', value: expected.expenses },
    { label: 'Resultado', value: expected.balance },
  ])
  expect(december.metrics).toEqual([])
  expect(entries).toEqual(original)
})

test('categorias e maiores despesas ignoram poupança, cancelamento e transferência', () => {
  const entries = [
    {
      type: 'expense',
      amount: '100.50',
      date: '2026-10-05',
      categoryId: 'food',
      categoryName: 'Alimentação',
    },
    {
      type: 'expense',
      amount: 900,
      date: '2026-10-06',
      categoryId: 'food',
      categoryName: 'Alimentação',
      paymentStatus: 'cancelled',
    },
    {
      type: 'expense',
      amount: 800,
      date: '2026-10-07',
      categoryId: 'food',
      categoryName: 'Alimentação',
      kind: 'transfer',
    },
    {
      type: 'expense',
      amount: 700,
      date: '2026-10-08',
      categoryId: 'food',
      categoryName: 'Alimentação',
      isSavings: true,
    },
  ]
  const category = buildMoneyAssistantResponse({
    message: 'Quanto gastei com alimentação em outubro de 2026?',
    transactions: entries,
    categories,
    now,
    analyze: analyzeMoney,
  })
  const top = buildMoneyAssistantResponse({
    message: 'Quais são minhas maiores despesas em outubro de 2026?',
    transactions: entries,
    categories,
    now,
    analyze: analyzeMoney,
  })

  expect(category.metrics).toEqual([
    { label: 'Total', value: 100.5 },
    { label: 'Lançamentos', rawValue: '1' },
  ])
  expect(top.text).toContain('100,50')
  expect(top.text).not.toContain('900,00')
  expect(top.text).not.toContain('800,00')
  expect(top.text).not.toContain('700,00')
})

test('reservas incluídas no período nunca viram despesas de consumo do Money', () => {
  const response = buildMoneyAssistantResponse({
    message: 'Relatório de outubro de 2026',
    transactions: [
      { type: 'expense', amount: 300, date: '2026-10-05', isSavings: true },
      {
        type: 'income',
        amount: 100,
        date: '2026-10-06',
        isSavings: true,
        savingsMovement: 'withdrawal',
      },
    ],
    settings: { excludeSavings: false },
    now,
    analyze: analyzeMoney,
  })

  expect(response.metrics).toEqual([
    { label: 'Receitas', value: 0 },
    { label: 'Despesas', value: 0 },
    { label: 'Resultado', value: 0 },
  ])
})
