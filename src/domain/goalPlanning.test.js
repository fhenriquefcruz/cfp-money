import { buildGoalPlan, buildGoalsOverview } from './goalPlanning'

test('calcula o que falta e o aporte mensal necessário até o prazo', () => {
  const plan = buildGoalPlan(
    {
      targetAmount: 12000,
      currentAmount: 3000,
      deadline: '2026-12-31',
    },
    new Date(2026, 8, 26),
  )

  expect(plan.remaining).toBe(9000)
  expect(plan.progress).toBe(25)
  expect(plan.completed).toBe(false)
  expect(plan.monthsLeft).toBe(4)
  expect(plan.suggestedMonthlyContribution).toBe(2250)
})

test('não gera ritmo artificial quando a meta não possui prazo', () => {
  const plan = buildGoalPlan({
    targetAmount: 5000,
    currentAmount: 1000,
  })

  expect(plan.remaining).toBe(4000)
  expect(plan.monthsLeft).toBeNull()
  expect(plan.suggestedMonthlyContribution).toBeNull()
})

test('identifica conclusão e atraso de forma separada', () => {
  expect(
    buildGoalPlan(
      {
        targetAmount: 1000,
        currentAmount: 1000,
        deadline: '2026-01-01',
      },
      new Date(2026, 8, 26),
    ),
  ).toMatchObject({
    completed: true,
    overdue: false,
    remaining: 0,
  })

  expect(
    buildGoalPlan(
      {
        targetAmount: 1000,
        currentAmount: 500,
        deadline: '2026-01-01',
      },
      new Date(2026, 8, 26),
    ),
  ).toMatchObject({
    completed: false,
    overdue: true,
  })
})

test('resume metas ativas, concluídas e valor restante', () => {
  const overview = buildGoalsOverview(
    [
      { targetAmount: 1000, currentAmount: 1000 },
      { targetAmount: 5000, currentAmount: 2000 },
      { targetAmount: 3000, currentAmount: 0 },
    ],
    new Date(2026, 8, 26),
  )

  expect(overview).toMatchObject({
    total: 3,
    active: 2,
    completed: 1,
    totalRemaining: 6000,
  })
})
