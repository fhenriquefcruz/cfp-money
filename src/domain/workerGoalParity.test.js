import { getGoalEffectiveCurrent } from './savings'
import { goalAlertCandidates, goalAlertSnapshot } from '../../worker/email-notifications/src/domain.js'

test('MR-004: alertas e reserva exibem o mesmo saldo efetivo para a meta', () => {
  const goal = {
    id: 'goal-1',
    targetAmount: 1000,
    currentAmount: '350.00',
    deadline: '2026-12-30',
  }
  const transactions = [
    { goalId: 'goal-1', isSavings: true, amount: '500', savingsMovement: 'deposit' },
    { goalId: 'goal-1', isSavings: true, amount: '100', savingsMovement: 'withdrawal' },
    { goalId: 'goal-2', isSavings: true, amount: '1000', savingsMovement: 'deposit' },
    {
      goalId: 'goal-1',
      isSavings: true,
      amount: '400',
      paymentStatus: 'cancelled',
      savingsMovement: 'deposit',
    },
  ]
  const original = structuredClone(goal)
  const expected = getGoalEffectiveCurrent(goal, transactions)
  const workerGoal = goalAlertSnapshot(goal, transactions)

  expect(expected).toBe(750)
  expect(workerGoal.currentAmount).toBe(expected)
  expect(goalAlertCandidates(workerGoal, new Date('2026-11-15T12:00:00.000Z'))).toEqual(
    [],
  )
  expect(goal).toEqual(original)

  const afterDeposit = [
    ...transactions,
    { goalId: 'goal-1', isSavings: true, amount: '50', savingsMovement: 'deposit' },
  ]
  const updated = goalAlertSnapshot(goal, afterDeposit)
  expect(updated.currentAmount).toBe(getGoalEffectiveCurrent(goal, afterDeposit))
  expect(goalAlertCandidates(updated, new Date('2026-11-15T12:00:00.000Z'))).toEqual([
    'progress-80',
  ])
})
