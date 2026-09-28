import { buildMoneyCreditDraft } from './moneyCreditDraft'

const categories = [
  {
    id: 'food',
    name: 'Alimentação',
    type: 'expense',
    color: '#f97316',
    icon: '🍔',
  },
  {
    id: 'education',
    name: 'Educação',
    type: 'expense',
    color: '#06b6d4',
    icon: '📚',
  },
]

const cards = [
  {
    id: 'nubank',
    name: 'Nubank',
    last4: '1234',
    closingDay: 24,
    dueDay: 1,
    active: true,
  },
  {
    id: 'inter',
    name: 'Inter',
    last4: '9876',
    closingDay: 10,
    dueDay: 17,
    active: true,
  },
]

const now = new Date(2026, 6, 26, 12)

test('identifica cartão, parcelas e primeira fatura', () => {
  const response = buildMoneyCreditDraft({
    message: 'Comprei 600 no Nubank em 3 vezes no mercado ontem',
    categories,
    creditCards: cards,
    transactions: [],
    now,
  })

  expect(response).toMatchObject({
    type: 'credit_transaction_draft',
    draft: {
      amount: 600,
      categoryId: 'food',
      purchaseDate: '2026-07-25',
      cardId: 'nubank',
      installments: 3,
      paymentMethod: 'credit_card',
    },
    schedule: {
      dueDate: '2026-09-01',
      invoiceMonth: '2026-09',
    },
  })
  expect(response.installmentAmounts).toEqual([200, 200, 200])
  expect(response.missingFields).toEqual([])
})

test('seleciona automaticamente quando existe apenas um cartão ativo', () => {
  const response = buildMoneyCreditDraft({
    message: 'Paguei 180 no cartão no dentista hoje',
    categories: [
      ...categories,
      {
        id: 'health',
        name: 'Saúde',
        type: 'expense',
        color: '#10b981',
        icon: '❤️',
      },
    ],
    creditCards: [cards[0]],
    transactions: [],
    now,
  })

  expect(response.draft.cardId).toBe('nubank')
  expect(response.draft.installments).toBe(1)
})

test('pede cadastro quando não existe cartão ativo', () => {
  const response = buildMoneyCreditDraft({
    message: 'Comprei 300 no cartão',
    categories,
    creditCards: [],
    transactions: [],
    now,
  })

  expect(response.type).toBe('credit_card_setup_required')
})

test('não escolhe cartão arbitrariamente quando há mais de um', () => {
  const response = buildMoneyCreditDraft({
    message: 'Comprei 300 no cartão no mercado',
    categories,
    creditCards: cards,
    transactions: [],
    now,
  })

  expect(response.draft.cardId).toBe('')
  expect(response.missingFields).toContain('cardId')
  expect(response.warnings[0]).toContain('Selecione')
})

test('mantém quantidade de parcelas pendente quando não informada', () => {
  const response = buildMoneyCreditDraft({
    message: 'Comprei 900 parcelado no Nubank em educação',
    categories,
    creditCards: cards,
    transactions: [],
    now,
  })

  expect(response.draft.installments).toBe('')
  expect(response.missingFields).toContain('installments')
})

test('ignora mensagens que não envolvem cartão', () => {
  expect(
    buildMoneyCreditDraft({
      message: 'Paguei 80 por Pix no mercado',
      categories,
      creditCards: cards,
      transactions: [],
      now,
    }),
  ).toBeNull()
})

test('avisa sobre possível compra duplicada', () => {
  const response = buildMoneyCreditDraft({
    message: 'Comprei 600 no Nubank em 3 vezes no mercado ontem',
    categories,
    creditCards: cards,
    transactions: [
      {
        isCreditPurchase: true,
        cardId: 'nubank',
        originalPurchaseDate: '2026-07-25',
        originalAmount: 600,
        categoryId: 'food',
      },
    ],
    now,
  })

  expect(response.warnings.some((warning) => warning.includes('duplicidade'))).toBe(true)
})
