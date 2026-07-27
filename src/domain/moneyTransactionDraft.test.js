import {
  buildMoneyTransactionDraft,
  parseMoneyAmount,
} from './moneyTransactionDraft'

const categories = [
  {
    id: 'food',
    name: 'Alimentação',
    type: 'expense',
    color: '#f97316',
    icon: '🍔',
  },
  {
    id: 'health',
    name: 'Saúde',
    type: 'expense',
    color: '#10b981',
    icon: '❤️',
  },
  {
    id: 'salary',
    name: 'Salário',
    type: 'income',
    color: '#10b981',
    icon: '💼',
  },
]

const now = new Date(2026, 6, 26, 12)

test('interpreta valores no padrão brasileiro', () => {
  expect(parseMoneyAmount('Paguei R$ 1.250,90 no mercado')).toBe(1250.9)
  expect(parseMoneyAmount('Gastei 180 reais no dentista')).toBe(180)
})

test('prepara uma despesa por Pix sem gravar dados', () => {
  const response = buildMoneyTransactionDraft({
    message: 'Money, paguei 180 reais no dentista por Pix ontem',
    categories,
    transactions: [],
    now,
  })

  expect(response).toMatchObject({
    type: 'transaction_draft',
    draft: {
      type: 'expense',
      amount: 180,
      description: 'Dentista',
      categoryId: 'health',
      paymentMethod: 'pix',
      date: '2026-07-25',
      source: 'money_assistant',
    },
  })
  expect(response.missingFields).toEqual([])
})

test('prepara receita e mantém pagamento pendente quando não informado', () => {
  const response = buildMoneyTransactionDraft({
    message: 'Recebi 5000 de salário hoje',
    categories,
    transactions: [],
    now,
  })

  expect(response.draft).toMatchObject({
    type: 'income',
    amount: 5000,
    categoryId: 'salary',
    date: '2026-07-26',
  })
  expect(response.missingFields).toContain('paymentMethod')
})

test('não trata consulta como criação de transação', () => {
  expect(
    buildMoneyTransactionDraft({
      message: 'Quanto gastei com alimentação este mês?',
      categories,
      transactions: [],
      now,
    }),
  ).toBeNull()
})

test('bloqueia simplificação indevida de cartão e parcelas', () => {
  const response = buildMoneyTransactionDraft({
    message: 'Comprei 600 no cartão de crédito em 3 vezes',
    categories,
    transactions: [],
    now,
  })

  expect(response.type).toBe('transaction_advanced_required')
})

test('avisa sobre possível duplicidade', () => {
  const response = buildMoneyTransactionDraft({
    message: 'Paguei 180 no dentista por pix ontem',
    categories,
    transactions: [
      {
        type: 'expense',
        amount: 180,
        date: '2026-07-25',
        categoryId: 'health',
      },
    ],
    now,
  })

  expect(response.warnings).toHaveLength(1)
})
