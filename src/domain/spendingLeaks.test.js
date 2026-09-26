import { analyzeSpendingLeaks } from './spendingLeaks'

const tx = (overrides = {}) => ({
  type: 'expense',
  amount: 50,
  date: '2026-09-10',
  description: 'Despesa',
  categoryId: 'other',
  categoryName: 'Outros',
  ...overrides,
})

test('não força alerta quando ainda não há dados suficientes', () => {
  const report = analyzeSpendingLeaks(
    [
      tx({ amount: 40 }),
      tx({ amount: 30 }),
      tx({ amount: 20 }),
      tx({ amount: 10 }),
    ],
    {},
    new Date(2026, 8, 20),
  )

  expect(report.status).toBe('insufficient')
  expect(report.findings).toEqual([])
})

test('identifica repetição material de uma mesma descrição', () => {
  const report = analyzeSpendingLeaks(
    [
      tx({ description: 'Delivery', amount: 90, categoryId: 'food', categoryName: 'Alimentação' }),
      tx({ description: 'Delivery', amount: 85, categoryId: 'food', categoryName: 'Alimentação' }),
      tx({ description: 'Delivery', amount: 95, categoryId: 'food', categoryName: 'Alimentação' }),
      tx({ description: 'Combustível', amount: 400, categoryId: 'car', categoryName: 'Transporte' }),
      tx({ description: 'Mercado', amount: 500, categoryId: 'market', categoryName: 'Alimentação' }),
      tx({ type: 'income', amount: 4000, description: 'Salário' }),
    ],
    {},
    new Date(2026, 8, 20),
  )

  const finding = report.findings.find((item) => item.type === 'repeated_description')
  expect(report.status).toBe('attention')
  expect(finding?.count).toBe(3)
  expect(finding?.amount).toBe(270)
})

test('identifica acúmulo de pequenos gastos quando o total se torna relevante', () => {
  const expenses = Array.from({ length: 8 }, (_, index) =>
    tx({
      id: `small-${index}`,
      description: `Café ${index}`,
      amount: 25,
      categoryId: 'food',
      categoryName: 'Alimentação',
    }),
  )

  const report = analyzeSpendingLeaks(
    [
      ...expenses,
      tx({ description: 'Aluguel', amount: 1000, categoryId: 'home', categoryName: 'Moradia' }),
      tx({ type: 'income', amount: 3000, description: 'Salário' }),
    ],
    {},
    new Date(2026, 8, 20),
  )

  const finding = report.findings.find((item) => item.type === 'small_expenses')
  expect(finding?.count).toBe(8)
  expect(finding?.amount).toBe(200)
})

test('sinaliza categoria que ganhou peso material em relação ao período anterior', () => {
  const report = analyzeSpendingLeaks(
    [
      tx({
        date: '2026-09-05',
        amount: 600,
        description: 'Restaurantes',
        categoryId: 'food',
        categoryName: 'Alimentação',
      }),
      tx({
        date: '2026-09-08',
        amount: 400,
        description: 'Mercado',
        categoryId: 'food',
        categoryName: 'Alimentação',
      }),
      tx({
        date: '2026-09-12',
        amount: 900,
        description: 'Aluguel',
        categoryId: 'home',
        categoryName: 'Moradia',
      }),
      tx({
        date: '2026-09-15',
        amount: 250,
        description: 'Transporte',
        categoryId: 'car',
        categoryName: 'Transporte',
      }),
      tx({
        date: '2026-09-16',
        amount: 80,
        description: 'Farmácia',
        categoryId: 'health',
        categoryName: 'Saúde',
      }),
      tx({
        date: '2026-08-05',
        amount: 450,
        description: 'Restaurantes',
        categoryId: 'food',
        categoryName: 'Alimentação',
      }),
      tx({
        date: '2026-08-12',
        amount: 900,
        description: 'Aluguel',
        categoryId: 'home',
        categoryName: 'Moradia',
      }),
    ],
    {},
    new Date(2026, 8, 20),
  )

  const finding = report.findings.find((item) => item.type === 'category_acceleration')
  expect(finding?.categoryId).toBe('food')
  expect(finding?.difference).toBe(550)
})

test('não classifica automaticamente gastos recorrentes ou parcelas como vazamento repetido', () => {
  const report = analyzeSpendingLeaks(
    [
      tx({ description: 'Academia', amount: 100, isRecurring: true }),
      tx({ description: 'Academia', amount: 100, isRecurring: true }),
      tx({ description: 'Academia', amount: 100, isRecurring: true }),
      tx({ description: 'Parcela notebook', amount: 150, isInstallment: true }),
      tx({ description: 'Parcela notebook', amount: 150, isInstallment: true }),
      tx({ description: 'Parcela notebook', amount: 150, isInstallment: true }),
    ],
    {},
    new Date(2026, 8, 20),
  )

  expect(report.findings.some((item) => item.type === 'repeated_description')).toBe(false)
})
