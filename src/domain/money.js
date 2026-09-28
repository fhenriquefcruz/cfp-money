const DEFAULT_SETTINGS = Object.freeze({
  cycleType: 'calendar_month',
  cycleStartDay: 1,
  comparisonMode: 'elapsed_days',
  excludeSavings: true,
})

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MIN_PROJECTION_ELAPSED_DAYS = 7

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function asDate(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }

  if (typeof value === 'string' && ISO_DATE_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

function asIsoDate(value) {
  const date = asDate(value)
  if (!date) return ''

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function addDays(value, amount) {
  const date = asDate(value)
  date.setDate(date.getDate() + amount)
  return date
}

function addMonthsClamped(value, amount, preferredDay) {
  const date = asDate(value)
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(clamp(preferredDay, 1, lastDay))
  return target
}

function differenceInCalendarDays(later, earlier) {
  const a = asDate(later)
  const b = asDate(earlier)
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((utcA - utcB) / 86400000)
}

function isWithin(dateValue, startValue, endValue) {
  const date = asIsoDate(dateValue)
  return date >= asIsoDate(startValue) && date <= asIsoDate(endValue)
}

function toAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function safePercentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

function sumExpenses(transactions) {
  return transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + toAmount(transaction.amount), 0)
}

function sumIncome(transactions) {
  return transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + toAmount(transaction.amount), 0)
}

export function normalizeMoneySettings(settings = {}) {
  const cycleType =
    settings.cycleType === 'custom_cycle' || settings.cycleType === 'salary_cycle'
      ? settings.cycleType
      : DEFAULT_SETTINGS.cycleType

  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    cycleType,
    cycleStartDay:
      cycleType === 'calendar_month'
        ? 1
        : clamp(Number(settings.cycleStartDay) || DEFAULT_SETTINGS.cycleStartDay, 1, 28),
    comparisonMode:
      settings.comparisonMode === 'full_cycle' ? 'full_cycle' : DEFAULT_SETTINGS.comparisonMode,
    excludeSavings: settings.excludeSavings !== false,
  }
}

export function getFinancialCycle(referenceDate = new Date(), settings = {}) {
  const reference = asDate(referenceDate)
  if (!reference) throw new Error('Data de referência inválida.')

  const normalized = normalizeMoneySettings(settings)
  const startDay = normalized.cycleStartDay

  let start
  if (normalized.cycleType === 'calendar_month') {
    start = new Date(reference.getFullYear(), reference.getMonth(), 1)
  } else if (reference.getDate() >= startDay) {
    start = new Date(reference.getFullYear(), reference.getMonth(), startDay)
  } else {
    start = addMonthsClamped(reference, -1, startDay)
  }

  const nextStart =
    normalized.cycleType === 'calendar_month'
      ? new Date(start.getFullYear(), start.getMonth() + 1, 1)
      : addMonthsClamped(start, 1, startDay)

  return {
    start: asIsoDate(start),
    end: asIsoDate(addDays(nextStart, -1)),
    elapsedEnd: asIsoDate(reference),
    elapsedDays: differenceInCalendarDays(reference, start) + 1,
    totalDays: differenceInCalendarDays(nextStart, start),
    progress: clamp(
      (differenceInCalendarDays(reference, start) + 1) / differenceInCalendarDays(nextStart, start),
      0,
      1,
    ),
    settings: normalized,
  }
}

export function getEquivalentPeriods(referenceDate = new Date(), settings = {}) {
  const current = getFinancialCycle(referenceDate, settings)
  const previousCycleReference = addDays(asDate(current.start), -1)
  const previous = getFinancialCycle(previousCycleReference, settings)

  const previousElapsedEnd =
    current.settings.comparisonMode === 'full_cycle'
      ? previous.end
      : asIsoDate(addDays(previous.start, Math.min(current.elapsedDays, previous.totalDays) - 1))

  return {
    current: {
      start: current.start,
      end: current.settings.comparisonMode === 'full_cycle' ? current.end : current.elapsedEnd,
      cycleEnd: current.end,
      elapsedDays: current.elapsedDays,
      totalDays: current.totalDays,
      progress: current.progress,
    },
    previous: {
      start: previous.start,
      end: previousElapsedEnd,
      cycleEnd: previous.end,
      elapsedDays: Math.min(current.elapsedDays, previous.totalDays),
      totalDays: previous.totalDays,
    },
    settings: current.settings,
  }
}

export function filterTransactionsForPeriod(transactions = [], period, settings = {}) {
  const normalized = normalizeMoneySettings(settings)

  return transactions.filter((transaction) => {
    if (!transaction?.date || !isWithin(transaction.date, period.start, period.end)) return false
    if (normalized.excludeSavings && transaction.isSavings) return false
    return true
  })
}

export function calculateCategoryChanges(currentTransactions = [], previousTransactions = []) {
  const aggregate = (transactions) => {
    const totals = new Map()

    transactions
      .filter((transaction) => transaction.type === 'expense')
      .forEach((transaction) => {
        const key = transaction.categoryId || transaction.categoryName || 'without-category'
        const existing = totals.get(key) || {
          categoryId: transaction.categoryId || null,
          categoryName: transaction.categoryName || 'Sem categoria',
          total: 0,
        }
        existing.total += toAmount(transaction.amount)
        totals.set(key, existing)
      })

    return totals
  }

  const current = aggregate(currentTransactions)
  const previous = aggregate(previousTransactions)
  const keys = new Set([...current.keys(), ...previous.keys()])

  return [...keys]
    .map((key) => {
      const currentItem = current.get(key)
      const previousItem = previous.get(key)
      const currentTotal = currentItem?.total || 0
      const previousTotal = previousItem?.total || 0

      return {
        categoryId: currentItem?.categoryId || previousItem?.categoryId || null,
        categoryName: currentItem?.categoryName || previousItem?.categoryName || 'Sem categoria',
        currentTotal,
        previousTotal,
        difference: currentTotal - previousTotal,
        percentChange: safePercentChange(currentTotal, previousTotal),
      }
    })
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
}

export function analyzeMoney(transactions = [], settings = {}, referenceDate = new Date()) {
  const periods = getEquivalentPeriods(referenceDate, settings)
  const currentTransactions = filterTransactionsForPeriod(
    transactions,
    periods.current,
    periods.settings,
  )
  const previousTransactions = filterTransactionsForPeriod(
    transactions,
    periods.previous,
    periods.settings,
  )

  const currentExpenses = sumExpenses(currentTransactions)
  const previousExpenses = sumExpenses(previousTransactions)
  const currentIncome = sumIncome(currentTransactions)
  const previousIncome = sumIncome(previousTransactions)
  const expenseChangePercent = safePercentChange(currentExpenses, previousExpenses)
  const incomeChangePercent = safePercentChange(currentIncome, previousIncome)

  const projectionIsPartial = periods.current.progress < 1
  const projectionIsAvailable =
    !projectionIsPartial || periods.current.elapsedDays >= MIN_PROJECTION_ELAPSED_DAYS
  const projectedExpenses =
    projectionIsAvailable && periods.current.progress > 0
      ? currentExpenses / periods.current.progress
      : currentExpenses
  const projectionConfidence = !projectionIsAvailable
    ? 'insufficient'
    : !projectionIsPartial || periods.current.progress >= 0.66
      ? 'high'
      : periods.current.progress >= 0.33
        ? 'medium'
        : 'low'

  const categoryChanges = calculateCategoryChanges(currentTransactions, previousTransactions)
  const largestIncrease = categoryChanges.find((category) => category.difference > 0) || null
  const largestDecrease = categoryChanges.find((category) => category.difference < 0) || null

  const insights = []

  if (expenseChangePercent === null) {
    insights.push({
      type: 'expense_comparison',
      severity: currentExpenses > 0 ? 'info' : 'neutral',
      message:
        previousExpenses === 0
          ? 'Ainda não há despesas no período equivalente anterior para calcular uma variação percentual.'
          : 'Não foi possível calcular a variação das despesas.',
    })
  } else {
    const direction =
      expenseChangePercent > 0 ? 'acima' : expenseChangePercent < 0 ? 'abaixo' : 'igual'
    insights.push({
      type: 'expense_comparison',
      severity:
        expenseChangePercent >= 15
          ? 'warning'
          : expenseChangePercent <= -10
            ? 'positive'
            : 'neutral',
      message:
        direction === 'igual'
          ? 'As despesas estão no mesmo nível do período equivalente anterior.'
          : `As despesas estão ${Math.abs(expenseChangePercent).toFixed(1)}% ${direction} do período equivalente anterior.`,
    })
  }

  if (largestIncrease) {
    insights.push({
      type: 'category_increase',
      severity: 'info',
      categoryId: largestIncrease.categoryId,
      message: `${largestIncrease.categoryName} teve o maior aumento, com diferença de R$ ${largestIncrease.difference.toFixed(2).replace('.', ',')}.`,
    })
  }

  if (projectionIsPartial && currentExpenses > 0 && projectionIsAvailable) {
    insights.push({
      type: 'expense_projection',
      severity: 'neutral',
      message: `Mantendo o ritmo atual, a projeção de despesas para o fechamento do ciclo é de R$ ${projectedExpenses.toFixed(2).replace('.', ',')}.`,
    })
  } else if (projectionIsPartial && currentExpenses > 0) {
    insights.push({
      type: 'expense_projection_pending',
      severity: 'info',
      message: `A projeção ficará disponível após ${MIN_PROJECTION_ELAPSED_DAYS} dias do ciclo para evitar estimativas distorcidas.`,
    })
  }

  return {
    generatedAt: asIsoDate(referenceDate),
    periods,
    current: {
      income: currentIncome,
      expenses: currentExpenses,
      balance: currentIncome - currentExpenses,
      transactionCount: currentTransactions.length,
    },
    previous: {
      income: previousIncome,
      expenses: previousExpenses,
      balance: previousIncome - previousExpenses,
      transactionCount: previousTransactions.length,
    },
    comparison: {
      expenseDifference: currentExpenses - previousExpenses,
      expenseChangePercent,
      incomeDifference: currentIncome - previousIncome,
      incomeChangePercent,
    },
    projection: {
      expenses: projectedExpenses,
      cycleProgress: periods.current.progress,
      isPartial: projectionIsPartial,
      isAvailable: projectionIsAvailable,
      confidence: projectionConfidence,
      minimumElapsedDays: MIN_PROJECTION_ELAPSED_DAYS,
    },
    categories: {
      changes: categoryChanges,
      largestIncrease,
      largestDecrease,
    },
    insights,
  }
}

export { DEFAULT_SETTINGS as DEFAULT_MONEY_SETTINGS }
