import { buildMoneyPersonalizationProfile } from './moneyPersonalization'

const now = new Date(2026, 8, 29, 12)

test('deriva perfil somente de despesas efetivas e recentes pela data real da movimentação', () => {
  const profile = buildMoneyPersonalizationProfile(
    [
      {
        type: 'expense',
        amount: 100,
        date: '2026-10-10',
        purchaseDate: '2026-09-01',
        isCreditPurchase: true,
        categoryId: 'food',
        categoryName: 'Alimentação',
        paymentMethod: 'credit_card',
      },
      {
        type: 'expense',
        amount: 80,
        date: '2026-09-05',
        categoryId: 'food',
        categoryName: 'Alimentação',
        paymentMethod: 'pix',
      },
      {
        type: 'expense',
        amount: 60,
        date: '2026-09-08',
        categoryId: 'food',
        categoryName: 'Alimentação',
        paymentMethod: 'pix',
      },
      {
        type: 'expense',
        amount: 40,
        date: '2026-09-09',
        categoryId: 'transport',
        categoryName: 'Transporte',
        paymentMethod: 'debit_card',
      },
      {
        type: 'expense',
        amount: 1000,
        date: '2026-09-10',
        categoryId: 'other',
        categoryName: 'Outros',
        paymentStatus: 'cancelled',
      },
      {
        type: 'expense',
        amount: 700,
        date: '2026-09-11',
        categoryId: 'other',
        categoryName: 'Outros',
        flowType: 'transfer',
      },
      {
        type: 'income',
        amount: 5000,
        date: '2026-09-01',
        categoryName: 'Salário',
      },
      {
        type: 'expense',
        amount: 999,
        date: '2026-01-01',
        categoryName: 'Outros',
      },
    ],
    { now },
  )

  expect(profile).toMatchObject({
    sampleSize: 4,
    confidence: 'low',
    topCategory: {
      id: 'food',
      name: 'Alimentação',
      amount: 240,
      count: 3,
    },
    preferredPaymentMethod: {
      id: 'pix',
      label: 'Pix',
      count: 2,
    },
  })
  expect(profile.topCategory.share).toBeCloseTo(240 / 280)
})

test('ignora poupança e exige amostra mínima antes de afirmar padrões', () => {
  const profile = buildMoneyPersonalizationProfile(
    [
      {
        type: 'expense',
        amount: 300,
        date: '2026-09-10',
        categoryName: 'Reserva',
        isSavings: true,
      },
      {
        type: 'expense',
        amount: 100,
        date: '2026-09-11',
        categoryName: 'Alimentação',
      },
    ],
    { now },
  )

  expect(profile.sampleSize).toBe(1)
  expect(profile.confidence).toBe('insufficient')
})

test('aumenta a confiança conforme o histórico cresce', () => {
  const transactions = Array.from({ length: 20 }, (_, index) => ({
    type: 'expense',
    amount: 10,
    date: `2026-09-${String(index + 1).padStart(2, '0')}`,
    categoryName: 'Alimentação',
    paymentMethod: 'pix',
  }))

  expect(buildMoneyPersonalizationProfile(transactions, { now }).confidence).toBe('high')
})

test('normaliza método de pagamento desconhecido para rótulo legível', () => {
  const profile = buildMoneyPersonalizationProfile(
    Array.from({ length: 4 }, (_, index) => ({
      type: 'expense',
      amount: 25,
      date: `2026-09-0${index + 1}`,
      categoryName: 'Serviços',
      paymentMethod: 'wallet_app',
    })),
    { now },
  )

  expect(profile.preferredPaymentMethod).toMatchObject({
    id: 'wallet_app',
    label: 'Wallet App',
    count: 4,
  })
})
