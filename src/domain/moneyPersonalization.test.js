import { buildMoneyPersonalizationProfile } from './moneyPersonalization'

const now = new Date(2026, 8, 29, 12)

test('deriva perfil somente das despesas recentes do próprio histórico', () => {
  const profile = buildMoneyPersonalizationProfile(
    [
      {
        type: 'expense',
        amount: 100,
        date: '2026-09-01',
        categoryId: 'food',
        categoryName: 'Alimentação',
        paymentMethod: 'pix',
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
      name: 'Alimentação',
      amount: 240,
      count: 3,
    },
    preferredPaymentMethod: {
      id: 'pix',
      count: 3,
    },
  })
  expect(profile.topCategory.share).toBeCloseTo(240 / 280)
})

test('ignora poupança e exige amostra mínima para personalização', () => {
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
