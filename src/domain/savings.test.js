import {
  buildSavingsOverview,
  getGoalEffectiveCurrent,
  getSavingsSignedAmount,
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
