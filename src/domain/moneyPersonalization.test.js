import {
  buildMoneyPersonalizationProfile,
  getMoneyPersonalizationSummary,
} from './moneyPersonalization'

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
        description: 'iFood',
      },
      {
        type: 'expense',
        amount: 80,
        date: '2026-09-05',
        categoryId: 'food',
        categoryName: 'Alimentação',
        paymentMethod: 'pix',
        description: 'iFood',
      },
      {
        type: 'expense',
        amount: 60,
        date: '2026-09-08',
        categoryId: 'food',
        categoryName: 'Alimentação',
        paymentMethod: 'pix',
        description: 'iFood',
      },
      {
        type: 'expense',
        amount: 40,
        date: '2026-09-09',
        categoryId: 'transport',
        categoryName: 'Transporte',
        paymentMethod: 'debit_card',
        description: 'Uber',
      },
      {
        type: 'income',
        amount: 5000,
        date: '2026-09-01',
        categoryId: 'salary',
        categoryName: 'Salário',
        paymentMethod: 'pix',
        description: 'Salário',
      },
      {
        type: 'expense',
        amount: 999,
        date: '2026-01-01',
        categoryId: 'other',
        categoryName: 'Outros',
        paymentMethod: 'cash',
        description: 'Antigo',
      },
    ],
    { now },
  )

  expect(profile.sampleSize).toBe(4)
  expect(profile.totalExpenses).toBe(280)
  expect(profile.confidence).toBe('low')
  expect(profile.topCategories[0]).toMatchObject({
    id: 'food',
    name: 'Alimentação',
    amount: 240,
    count: 3,
  })
  expect(profile.preferredPaymentMethod).toMatchObject({
    id: 'pix',
    count: 3,
  })
  expect(profile.recurringDescriptions[0]).toMatchObject({
    label: 'iFood',
    count: 3,
  })
})

test('ignora poupança, parcelas e recorrências ao procurar descrições repetidas', () => {
  const profile = buildMoneyPersonalizationProfile(
    [
      ...Array.from({ length: 3 }, (_, index) => ({
        type: 'expense',
        amount: 50,
        date: `2026-09-0${index + 1}`,
        categoryId: 'home',
        categoryName: 'Moradia',
        paymentMethod: 'pix',
        description: 'Aluguel',
        isRecurring: true,
      })),
      {
        type: 'expense',
        amount: 300,
        date: '2026-09-10',
        categoryId: 'saving',
        categoryName: 'Reserva',
        isSavings: true,
        description: 'Reserva',
      },
    ],
    { now },
  )

  expect(profile.sampleSize).toBe(3)
  expect(profile.recurringDescriptions).toEqual([])
})

test('não apresenta perfil quando há histórico insuficiente', () => {
  const profile = buildMoneyPersonalizationProfile(
    [
      {
        type: 'expense',
        amount: 100,
        date: '2026-09-10',
        categoryId: 'food',
        categoryName: 'Alimentação',
      },
    ],
    { now },
  )

  expect(profile.confidence).toBe('insufficient')
  expect(getMoneyPersonalizationSummary(profile)).toMatchObject({
    ready: false,
  })
})

test('resume o perfil com evidências transparentes', () => {
  const profile = buildMoneyPersonalizationProfile(
    Array.from({ length: 8 }, (_, index) => ({
      type: 'expense',
      amount: index < 6 ? 100 : 30,
      date: `2026-09-${String(index + 1).padStart(2, '0')}`,
      categoryId: index < 6 ? 'food' : 'transport',
      categoryName: index < 6 ? 'Alimentação' : 'Transporte',
      paymentMethod: index < 5 ? 'pix' : 'debit_card',
      description: index < 4 ? 'iFood' : `Despesa ${index}`,
    })),
    { now },
  )

  const summary = getMoneyPersonalizationSummary(profile)
  expect(profile.confidence).toBe('medium')
  expect(summary.ready).toBe(true)
  expect(summary.text).toContain('Alimentação')
  expect(summary.text).toContain('pix')
  expect(summary.text).toContain('iFood')
})
