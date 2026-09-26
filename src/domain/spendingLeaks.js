import {
  calculateCategoryChanges,
  filterTransactionsForPeriod,
  getEquivalentPeriods,
} from './money'

const MIN_CURRENT_EXPENSE_COUNT = 5
const MAX_FINDINGS = 3

const toAmount = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.max(0, amount) : 0
}

const sumAmounts = (items) => items.reduce((total, item) => total + toAmount(item.amount), 0)

const normalizeDescription = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const GENERIC_DESCRIPTIONS = new Set([
  '',
  'compra',
  'despesa',
  'pagamento',
  'outros',
  'sem descricao',
  'sem descrição',
])

function buildRepeatedDescriptionFinding(expenses, totalExpenses) {
  const groups = new Map()

  expenses.forEach((transaction) => {
    if (transaction.isRecurring || transaction.isInstallment) return

    const key = normalizeDescription(transaction.description)
    if (GENERIC_DESCRIPTIONS.has(key) || key.length < 3) return

    const current = groups.get(key) || {
      key,
      label: String(transaction.description || '').trim(),
      items: [],
      total: 0,
    }

    current.items.push(transaction)
    current.total += toAmount(transaction.amount)
    groups.set(key, current)
  })

  const materialTotal = Math.max(80, totalExpenses * 0.1)

  const best = [...groups.values()]
    .filter((group) => group.items.length >= 3 && group.total >= materialTotal)
    .sort((a, b) => b.total - a.total)[0]

  if (!best) return null

  return {
    id: `repeated-description-${best.key}`,
    type: 'repeated_description',
    severity: 'warning',
    title: `${best.label} aparece com frequência`,
    detail: `${best.items.length} lançamentos somam R$ ${best.total
      .toFixed(2)
      .replace('.', ',')} neste período.`,
    amount: best.total,
    count: best.items.length,
    shareOfExpenses: totalExpenses > 0 ? best.total / totalExpenses : 0,
    to: '/transactions',
    actionLabel: 'Revisar lançamentos',
    impact: totalExpenses > 0 ? best.total / totalExpenses : 0,
  }
}

function buildSmallExpensesFinding(expenses, totalExpenses, currentIncome) {
  const threshold =
    currentIncome > 0
      ? Math.min(75, Math.max(20, currentIncome * 0.01))
      : Math.min(50, Math.max(20, totalExpenses * 0.05))

  const items = expenses.filter((transaction) => {
    if (transaction.isRecurring || transaction.isInstallment) return false
    const amount = toAmount(transaction.amount)
    return amount > 0 && amount <= threshold
  })

  const total = sumAmounts(items)
  const materialTotal = Math.max(80, totalExpenses * 0.12)

  if (items.length < 6 || total < materialTotal) return null

  return {
    id: 'small-expenses',
    type: 'small_expenses',
    severity: 'warning',
    title: 'Pequenos gastos estão somando',
    detail: `${items.length} lançamentos de até R$ ${threshold
      .toFixed(2)
      .replace('.', ',')} somam R$ ${total.toFixed(2).replace('.', ',')}.`,
    amount: total,
    count: items.length,
    threshold,
    shareOfExpenses: totalExpenses > 0 ? total / totalExpenses : 0,
    to: '/transactions',
    actionLabel: 'Ver pequenos gastos',
    impact: totalExpenses > 0 ? total / totalExpenses : 0,
  }
}

function buildCategoryAccelerationFinding(
  currentTransactions,
  previousTransactions,
  totalExpenses,
) {
  const previousExpenses = previousTransactions.filter(
    (transaction) => transaction.type === 'expense' && !transaction.isSavings,
  )
  if (previousExpenses.length < 3 || sumAmounts(previousExpenses) <= 0) return null

  const changes = calculateCategoryChanges(currentTransactions, previousTransactions)
  const materialDifference = Math.max(80, totalExpenses * 0.08)
  const materialCurrentTotal = Math.max(120, totalExpenses * 0.15)

  const best = changes
    .filter((category) => {
      if (category.currentTotal < materialCurrentTotal) return false
      if (category.difference < materialDifference) return false

      const share = totalExpenses > 0 ? category.currentTotal / totalExpenses : 0
      if (share < 0.18) return false

      if (category.previousTotal === 0) return category.currentTotal >= materialCurrentTotal
      return Number(category.percentChange || 0) >= 35
    })
    .sort((a, b) => b.difference - a.difference)[0]

  if (!best) return null

  const share = totalExpenses > 0 ? best.currentTotal / totalExpenses : 0
  const comparison =
    best.previousTotal > 0 && best.percentChange !== null
      ? ` ${Math.abs(best.percentChange).toFixed(0)}% acima do período equivalente anterior.`
      : ' Não havia gasto equivalente relevante no período anterior.'

  return {
    id: `category-acceleration-${best.categoryId || best.categoryName}`,
    type: 'category_acceleration',
    severity: 'warning',
    title: `${best.categoryName} ganhou peso no período`,
    detail: `R$ ${best.currentTotal.toFixed(2).replace('.', ',')} nesta categoria representam ${(
      share * 100
    ).toFixed(0)}% das despesas.${comparison}`,
    amount: best.currentTotal,
    difference: best.difference,
    shareOfExpenses: share,
    categoryId: best.categoryId,
    to: '/transactions',
    actionLabel: 'Revisar categoria',
    impact: share,
  }
}

function removeOverlappingFindings(findings) {
  const repeated = findings.find((finding) => finding?.type === 'repeated_description')
  const small = findings.find((finding) => finding?.type === 'small_expenses')

  if (
    repeated &&
    small &&
    repeated.amount > 0 &&
    small.amount > 0 &&
    repeated.amount / small.amount >= 0.7
  ) {
    return findings.filter((finding) => finding?.type !== 'small_expenses')
  }

  return findings
}

export function analyzeSpendingLeaks(transactions = [], settings = {}, referenceDate = new Date()) {
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

  const currentExpenses = currentTransactions.filter(
    (transaction) => transaction.type === 'expense' && !transaction.isSavings,
  )
  const totalExpenses = sumAmounts(currentExpenses)
  const currentIncome = sumAmounts(
    currentTransactions.filter(
      (transaction) => transaction.type === 'income' && !transaction.isSavings,
    ),
  )

  const hasEnoughData = currentExpenses.length >= MIN_CURRENT_EXPENSE_COUNT && totalExpenses > 0

  if (!hasEnoughData) {
    return {
      status: 'insufficient',
      findings: [],
      currentExpenseCount: currentExpenses.length,
      minimumExpenseCount: MIN_CURRENT_EXPENSE_COUNT,
      totalExpenses,
      periods,
    }
  }

  const candidates = [
    buildCategoryAccelerationFinding(currentTransactions, previousTransactions, totalExpenses),
    buildRepeatedDescriptionFinding(currentExpenses, totalExpenses),
    buildSmallExpensesFinding(currentExpenses, totalExpenses, currentIncome),
  ].filter(Boolean)

  const findings = removeOverlappingFindings(candidates)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, MAX_FINDINGS)

  return {
    status: findings.length > 0 ? 'attention' : 'clear',
    findings,
    currentExpenseCount: currentExpenses.length,
    minimumExpenseCount: MIN_CURRENT_EXPENSE_COUNT,
    totalExpenses,
    periods,
  }
}
