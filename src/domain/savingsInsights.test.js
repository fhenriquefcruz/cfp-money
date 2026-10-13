import { buildSavingsInsights } from './savingsInsights'

const transactions = [
  {
    id: 'reserve-aug',
    isSavings: true,
    amount: 300,
    date: '2026-08-10',
    savingsMovement: 'deposit',
    savingsDestination: 'Viagem',
    savingsInstitution: 'Nubank',
    goalId: 'goal-trip',
  },
  {
    id: 'reserve-sep',
    isSavings: true,
    amount: 300,
    date: '2026-09-10',
    savingsMovement: 'deposit',
    savingsDestination: 'Viagem',
    savingsInstitution: 'Nubank',
    goalId: 'goal-trip',
  },
  {
    id: 'reserve-oct',
    isSavings: true,
    amount: 300,
    date: '2026-10-10',
    savingsMovement: 'deposit',
    savingsDestination: 'Viagem',
    savingsInstitution: 'Nubank',
    goalId: 'goal-trip',
  },
  {
    id: 'reserve-itau',
    isSavings: true,
    amount: 500,
    date: '2026-09-15',
    savingsMovement: 'deposit',
    savingsDestination: 'Emergência',
    savingsInstitution: 'Itaú',
  },
  {
    id: 'reserve-withdrawal',
    isSavings: true,
    amount: 100,
    date: '2026-10-12',
    savingsMovement: 'withdrawal',
    savingsDestination: 'Emergência',
    savingsInstitution: 'Itaú',
  },
]

test('consolida instituições e reconstrói a evolução patrimonial', () => {
  const insights = buildSavingsInsights(transactions, [], new Date(2026, 9, 15))

  expect(insights.institutions).toEqual([
    expect.objectContaining({
      institution: 'Nubank',
      balance: 900,
    }),
    expect.objectContaining({
      institution: 'Itaú',
      balance: 400,
    }),
  ])
  expect(insights.history.slice(-3)).toEqual([
    expect.objectContaining({ monthKey: '2026-08', balance: 300 }),
    expect.objectContaining({ monthKey: '2026-09', balance: 1100 }),
    expect.objectContaining({ monthKey: '2026-10', balance: 1300 }),
  ])
})

test('projeta meta pelo ritmo líquido real dos últimos três meses', () => {
  const insights = buildSavingsInsights(
    transactions,
    [
      {
        id: 'goal-trip',
        name: 'Viagem',
        emoji: '✈️',
        targetAmount: 1800,
        currentAmount: 0,
        deadline: '2027-01-31',
      },
    ],
    new Date(2026, 9, 15),
  )

  expect(insights.projections[0]).toMatchObject({
    goalId: 'goal-trip',
    remaining: 900,
    monthlyPace: 300,
    projectedMonths: 3,
  })
})

test('não inventa prazo quando não existe ritmo recente de aporte', () => {
  const insights = buildSavingsInsights(
    [],
    [
      {
        id: 'goal-home',
        name: 'Entrada',
        targetAmount: 5000,
        currentAmount: 1000,
        deadline: '2027-01-31',
      },
    ],
    new Date(2026, 9, 15),
  )

  expect(insights.projections[0]).toMatchObject({
    remaining: 4000,
    monthlyPace: 0,
    projectedMonths: null,
  })
})
