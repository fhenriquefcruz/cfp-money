import {
  buildSavingsOverview,
  getGoalEffectiveCurrent,
  getSavingsSignedAmount,
  getUnclassifiedSavingsTransactions,
  UNCLASSIFIED_SAVINGS_DESTINATION,
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

test('MR-006: reserva e meta usam centavos em saldos legados mistos', () => {
  const source = [
    {
      id: 'save-legacy-1',
      isSavings: true,
      amount: 'R$ 1.234,56',
      savingsMovement: 'deposit',
      savingsDestination: 'Viagem',
      goalId: 'trip',
      date: '2026-07-01',
    },
    {
      id: 'save-legacy-2',
      isSavings: true,
      amount: '0,10',
      savingsMovement: 'deposit',
      savingsDestination: 'Viagem',
      goalId: 'trip',
      date: '2026-07-02',
    },
    {
      id: 'save-legacy-3',
      isSavings: true,
      amount: 0.2,
      savingsMovement: 'withdrawal',
      savingsDestination: 'Viagem',
      goalId: 'trip',
      date: '2026-07-03',
    },
  ]
  const original = structuredClone(source)
  const goal = { id: 'trip', currentAmount: '100,05' }
  const overview = buildSavingsOverview(source, { start: '2026-07-01', end: '2026-07-31' })
  expect(getSavingsSignedAmount(source[0])).toBe(1234.56)
  expect(getGoalEffectiveCurrent(goal, source)).toBe(1334.51)
  expect(overview.totalBalance).toBe(1234.46)
  expect(overview.periodDeposits).toBe(1234.66)
  expect(overview.periodWithdrawals).toBe(0.2)
  expect(overview.periodNet).toBe(1234.46)
  expect(overview.destinations[0].balance).toBe(1234.46)
  expect(source).toEqual(original)
})

test('MR-006: saldos inválidos geram erro consultivo, sem regravar dados', () => {
  expect(() =>
    getGoalEffectiveCurrent({ id: 'goal', currentAmount: '1.234' }, []),
  ).toThrow('Valor monetário inválido')
  expect(() =>
    buildSavingsOverview([{ isSavings: true, amount: '1,234', date: '2026-07-01' }]),
  ).toThrow('Valor monetário inválido')
})
