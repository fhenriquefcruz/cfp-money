export const TRIAL_DAYS = 7
const DAY_MS = 86_400_000

export function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function isPremiumUser(user, now = new Date()) {
  if (!user || user.blocked) return false

  if (user.plan === 'premium') {
    const until = toDate(user.premiumUntil)
    return Boolean(until && until.getTime() > now.getTime())
  }

  if (user.plan === 'trial' || !user.plan) {
    const start = toDate(user.trialStart)
    if (!start) return true

    return now.getTime() - start.getTime() < TRIAL_DAYS * DAY_MS
  }

  return false
}

export function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  const weekdays = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: weekdays[map.weekday],
    hour: Number(map.hour),
    minute: Number(map.minute),
    dateKey: `${map.year}-${map.month}-${map.day}`,
    monthKey: `${map.year}-${map.month}`,
  }
}

export function isReportDue(settings, date) {
  if (!settings?.enabled) return false

  const local = localParts(date, settings.timeZone || 'America/Campo_Grande')

  if (local.hour !== Number(settings.reportHour || 8)) {
    return false
  }

  if (local.minute >= 15) return false

  if (settings.frequency === 'weekly') {
    return local.weekday === Number(settings.weekday || 1)
  }

  if (settings.frequency === 'fortnightly') {
    return local.day === 1 || local.day === 15
  }

  if (settings.frequency === 'monthly') {
    return local.day === Number(settings.monthDay || 1)
  }

  return false
}

export function highestBudgetAlert({ percentage, thresholds = [70, 90, 100], overLimit = true }) {
  if (overLimit && percentage > 100) {
    return 'over'
  }

  const reached = thresholds
    .map(Number)
    .filter((value) => percentage >= value)
    .sort((a, b) => b - a)

  return reached[0] || null
}

export function goalAlertCandidates(goal, now = new Date()) {
  const result = []
  const target = Number(goal.targetAmount || 0)
  const current = Number(goal.currentAmount || 0)
  const progress = target > 0 ? (current / target) * 100 : 0

  if (progress >= 100) result.push('progress-100')
  else if (progress >= 80) {
    result.push('progress-80')
  }

  const deadline = toDate(goal.deadline)
  if (deadline && progress < 100) {
    const days = Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS)

    if (days < 0) result.push('deadline-overdue')
    else if (days <= 1) result.push('deadline-1')
    else if (days <= 7) result.push('deadline-7')
    else if (days <= 30) result.push('deadline-30')
  }

  return result
}

export function reportRange(frequency, now = new Date()) {
  const end = new Date(now)
  end.setUTCHours(23, 59, 59, 999)

  if (frequency === 'monthly') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999))
    return { start, end: monthEnd }
  }

  const days = frequency === 'fortnightly' ? 15 : 7
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days + 1)
  start.setUTCHours(0, 0, 0, 0)
  return { start, end }
}

export function summarizeTransactions(transactions, range) {
  const included = transactions.filter((item) => {
    const date = toDate(item.date ? `${item.date}T12:00:00.000Z` : item.createdAt)
    return date && date >= range.start && date <= range.end
  })

  let income = 0
  let expenses = 0
  const categories = new Map()

  for (const item of included) {
    const amount = Number(item.amount || 0)
    if (item.type === 'income' && !item.isSavings) {
      income += amount
      continue
    }

    if (item.type === 'expense') {
      expenses += amount
      const name = item.categoryName || item.category || 'Outros'
      categories.set(name, (categories.get(name) || 0) + amount)
    }
  }

  return {
    income,
    expenses,
    balance: income - expenses,
    count: included.length,
    topCategories: [...categories.entries()]
      .map(([name, amount]) => ({
        name,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
  }
}
