import {
  buildGoalSavingsProjections,
  buildSavingsBalanceHistory,
  buildSavingsInstitutionOverview,
  buildSavingsOverview,
  getGoalEffectiveCurrent,
  getSavingsSignedAmount,
  getUnclassifiedSavingsTransactions,
  UNCLASSIFIED_SAVINGS_DESTINATION,
  UNCLASSIFIED_SAVINGS_INSTITUTION,
} from './savings'

const transactions = [
  {
    id: 'save-1',
    isSavings: true,
    amount: 1000,
    date: '2026-10-02',
    savingsMovement: 'deposit',
    savingsDestination: 'Reserva de emergência',
    savingsInstitution: 'Nubank',
    goalId: 'goal-reserve',
  },
  {
    id: 'save-2',
    isSavings: true,
    amount: 250,
    date: '2026-10-05',
    savingsMovement: 'withdrawal',
    savingsDestination: 'Reserva de emergência',
    savingsInstitution: 'Nubank',
    goalId: 'goal-reserve',
  },
  {
    id: 'legacy',
    isSavings: true,
    amount: 400,
    date: '2026-09-10',
  },
]

test('trata depósitos legados como entrada e retiradas como saída', () => {
  expect(getSavingsSignedAmount(transactions[0])).toBe(1000)
  expect(getSavingsSignedAmount(transactions[1])).toBe(-250)
  expect(getSavingsSignedAmount(transactions[2])).toBe(400)
})

test('separa saldo total de movimento do período e agrega onde o dinheiro está', () => {
  const overview = buildSavingsOverview(transactions, {
    start: '2026-10-01',
    end: '2026-10-31',
  })

  expect(overview.totalBalance).toBe(1150)
  expect(overview.periodDeposits).toBe(1000)
  expect(overview.periodWithdrawals).toBe(250)
  expect(overview.periodNet).toBe(750)
  expect(overview.destinations[0]).toMatchObject({
    label: 'Nubank · Reserva de emergência',
    balance: 750,
  })
  expect(overview.destinations[1]).toMatchObject({
    destination: UNCLASSIFIED_SAVINGS_DESTINATION,
    balance: 400,
  })
})

test('meta preserva saldo inicial e soma apenas movimentos vinculados', () => {
  expect(
    getGoalEffectiveCurrent(
      {
        id: 'goal-reserve',
        currentAmount: 2000,
      },
      transactions,
    ),
  ).toBe(2750)
})

test('lista apenas reservas efetivas sem destino para classificação', () => {
  const items = getUnclassifiedSavingsTransactions([
    ...transactions,
    {
      id: 'classified-later',
      isSavings: true,
      amount: 100,
      date: '2026-10-08',
      savingsDestination: 'Viagem',
    },
    {
      id: 'cancelled-legacy',
      isSavings: true,
      amount: 800,
      date: '2026-10-09',
      paymentStatus: 'cancelled',
    },
  ])

  expect(items.map((item) => item.id)).toEqual(['legacy'])
})


test('consolida patrimônio por instituição sem criar um novo cadastro', () => {
  const institutions = buildSavingsInstitutionOverview([
    ...transactions,
    {
      id: 'save-3',
      isSavings: true,
      amount: 500,
      date: '2026-10-07',
      savingsMovement: 'deposit',
      savingsDestination: 'Viagem',
      savingsInstitution: 'Nubank',
    },
    {
      id: 'save-4',
      isSavings: true,
      amount: 300,
      date: '2026-10-08',
      savingsMovement: 'deposit',
      savingsDestination: 'Entrada apartamento',
      savingsInstitution: 'Itaú',
    },
  ])

  expect(institutions[0]).toMatchObject({
    institution: 'Nubank',
    balance: 1250,
    destinationCount: 2,
  })
  expect(institutions[1]).toMatchObject({
    institution: UNCLASSIFIED_SAVINGS_INSTITUTION,
    balance: 400,
    destinationCount: 1,
  })
  expect(institutions[2]).toMatchObject({
    institution: 'Itaú',
    balance: 300,
    destinationCount: 1,
  })
  expect(institutions.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(100, 5)
})

test('reconstrói a evolução mensal do saldo reservado', () => {
  const history = buildSavingsBalanceHistory(
    [
      {
        id: 'aug',
        isSavings: true,
        amount: 500,
        date: '2026-08-10',
        savingsMovement: 'deposit',
      },
      {
        id: 'sep',
        isSavings: true,
        amount: 200,
        date: '2026-09-05',
        savingsMovement: 'deposit',
      },
      {
        id: 'oct-withdraw',
        isSavings: true,
        amount: 100,
        date: '2026-10-02',
        savingsMovement: 'withdrawal',
      },
    ],
    { months: 3, now: new Date(2026, 9, 15) },
  )

  expect(history).toEqual([
    expect.objectContaining({ monthKey: '2026-08', balance: 500, net: 500 }),
    expect.objectContaining({ monthKey: '2026-09', balance: 700, net: 200 }),
    expect.objectContaining({ monthKey: '2026-10', balance: 600, net: -100 }),
  ])
})

test('projeta metas pelo ritmo líquido real dos últimos meses', () => {
  const goals = [
    {
      id: 'goal-trip',
      name: 'Viagem',
      emoji: '✈️',
      targetAmount: 2000,
      currentAmount: 0,
      deadline: '2027-03-01',
    },
    {
      id: 'goal-home',
      name: 'Entrada',
      targetAmount: 5000,
      currentAmount: 1000,
      deadline: '2027-01-01',
    },
  ]

  const goalTransactions = [
    {
      id: 'trip-aug',
      isSavings: true,
      amount: 300,
      date: '2026-08-10',
      savingsMovement: 'deposit',
      goalId: 'goal-trip',
    },
    {
      id: 'trip-sep',
      isSavings: true,
      amount: 300,
      date: '2026-09-10',
      savingsMovement: 'deposit',
      goalId: 'goal-trip',
    },
    {
      id: 'trip-oct',
      isSavings: true,
      amount: 300,
      date: '2026-10-10',
      savingsMovement: 'deposit',
      goalId: 'goal-trip',
    },
  ]

  const projections = buildGoalSavingsProjections(goals, goalTransactions, {
    months: 3,
    now: new Date(2026, 9, 15),
  })

  const trip = projections.find((item) => item.goalId === 'goal-trip')
  const home = projections.find((item) => item.goalId === 'goal-home')

  expect(trip).toMatchObject({
    current: 900,
    remaining: 1100,
    averageMonthlyContribution: 300,
    projectedMonths: 4,
    projectedDate: '2027-02-15',
    status: 'on-track',
  })
  expect(home).toMatchObject({
    current: 1000,
    remaining: 4000,
    averageMonthlyContribution: 0,
    projectedMonths: null,
    projectedDate: null,
    status: 'no-pace',
  })
})
