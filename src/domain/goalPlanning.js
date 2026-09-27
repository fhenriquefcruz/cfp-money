const DAY_MS = 86400000

const amount = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function parseDeadline(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

export function buildGoalPlan(goal = {}, now = new Date()) {
  const target = amount(goal.targetAmount)
  const current = amount(goal.currentAmount)
  const remaining = Math.max(0, target - current)
  const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0
  const completed = target > 0 && current >= target
  const deadline = parseDeadline(goal.deadline)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - today.getTime()) / DAY_MS)
    : null
  const overdue = !completed && daysLeft !== null && daysLeft < 0
  const monthsLeft =
    !completed && daysLeft !== null && daysLeft >= 0
      ? Math.max(1, Math.ceil(daysLeft / 30))
      : null
  const suggestedMonthlyContribution =
    monthsLeft && remaining > 0 ? remaining / monthsLeft : null

  return {
    target,
    current,
    remaining,
    progress,
    completed,
    deadline: goal.deadline || null,
    daysLeft,
    overdue,
    monthsLeft,
    suggestedMonthlyContribution,
  }
}

export function buildGoalsOverview(goals = [], now = new Date()) {
  const plans = goals.map((goal) => ({
    goal,
    plan: buildGoalPlan(goal, now),
  }))

  return {
    total: goals.length,
    active: plans.filter(({ plan }) => !plan.completed).length,
    completed: plans.filter(({ plan }) => plan.completed).length,
    totalTarget: plans.reduce((sum, { plan }) => sum + plan.target, 0),
    totalCurrent: plans.reduce((sum, { plan }) => sum + plan.current, 0),
    totalRemaining: plans.reduce((sum, { plan }) => sum + plan.remaining, 0),
    overdue: plans.filter(({ plan }) => plan.overdue).length,
  }
}
