import { analyzeMoney } from './money'
import {
  buildMoneyAssistantResponse,
  parseMoneyAssistantIntent,
} from './moneyAssistant'

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
