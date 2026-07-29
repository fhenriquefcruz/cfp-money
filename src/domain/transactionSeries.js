import { splitInstallmentAmounts } from './creditCards'

export const SERIES_SCOPE = {
  SINGLE: 'single',
  FOLLOWING: 'following',
  ALL: 'all',
}

function asAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function toCents(value) {
  return Math.round(asAmount(value) * 100)
}

function fromCents(value) {
  return value / 100
}

function sumAmounts(items = []) {
  return fromCents(items.reduce((total, item) => total + toCents(item.amount), 0))
}

function compareMembers(first, second) {
  const firstPosition = Number(first.installmentNum) || Number(first.recurringNum) || 0
  const secondPosition = Number(second.installmentNum) || Number(second.recurringNum) || 0

  if (firstPosition && secondPosition && firstPosition !== secondPosition) {
    return firstPosition - secondPosition
  }

  const byDate = String(first.date || '').localeCompare(String(second.date || ''))
  if (byDate !== 0) return byDate

  return String(first.id || '').localeCompare(String(second.id || ''))
}

export function getTransactionSeries(transaction = {}) {
  if (transaction.installmentGroupId) {
    return {
      kind: 'installment',
      id: transaction.installmentGroupId,
      label: 'compra parcelada',
    }
  }

  if (transaction.recurringGroupId) {
    return {
      kind: 'recurring',
      id: transaction.recurringGroupId,
      label: transaction.type === 'income' ? 'receita recorrente' : 'despesa recorrente',
    }
  }

  return null
}

export function isTransactionSeries(transaction = {}) {
  return Boolean(getTransactionSeries(transaction))
}

export function getSeriesMembers(transactions = [], anchor = {}) {
  const descriptor = getTransactionSeries(anchor)
  if (!descriptor) return []

  return transactions
    .filter((transaction) => {
      const candidate = getTransactionSeries(transaction)
      return candidate?.kind === descriptor.kind && candidate?.id === descriptor.id
    })
    .sort(compareMembers)
}

export function getSeriesSelection({ transactions = [], anchor, scope = SERIES_SCOPE.SINGLE }) {
  const descriptor = getTransactionSeries(anchor)

  if (!descriptor) {
    throw new Error('A transação selecionada não pertence a uma série.')
  }

  const members = getSeriesMembers(transactions, anchor)
  const anchorIndex = members.findIndex((item) => item.id === anchor.id)

  if (anchorIndex < 0) {
    throw new Error('A transação selecionada não foi encontrada na série.')
  }

  let selected
  if (scope === SERIES_SCOPE.ALL) {
    selected = members
  } else if (scope === SERIES_SCOPE.FOLLOWING) {
    selected = members.slice(anchorIndex)
  } else {
    selected = [members[anchorIndex]]
  }

  const selectedIds = new Set(selected.map((item) => item.id))
  const remaining = members.filter((item) => !selectedIds.has(item.id))

  return {
    descriptor,
    members,
    selected,
    remaining,
    anchorIndex,
    scope,
    selectedTotal: sumAmounts(selected),
    seriesTotal: sumAmounts(members),
  }
}

function buildMetadataPatch(changes = {}) {
  const patch = {}

  if ('description' in changes) {
    patch.description = String(changes.description || '').trim()
  }

  if ('notes' in changes) {
    patch.notes = String(changes.notes || '').trim()
  }

  const categoryFields = ['categoryId', 'categoryName', 'categoryColor', 'categoryIcon']

  categoryFields.forEach((field) => {
    if (field in changes) patch[field] = changes[field] || ''
  })

  return patch
}

function mergeUpdate(updatesById, id, data) {
  if (!id || !data || !Object.keys(data).length) return

  updatesById.set(id, {
    ...(updatesById.get(id) || {}),
    ...data,
  })
}

export function buildSeriesEditPlan({
  transactions = [],
  anchor,
  scope = SERIES_SCOPE.SINGLE,
  changes = {},
}) {
  const selection = getSeriesSelection({
    transactions,
    anchor,
    scope,
  })
  const updatesById = new Map()
  const metadataPatch = buildMetadataPatch(changes)
  const requestedAmount = asAmount(changes.amount)

  if (requestedAmount <= 0) {
    throw new Error('Informe um valor maior que zero.')
  }

  let selectedAmounts
  if (selection.descriptor.kind === 'installment') {
    selectedAmounts = splitInstallmentAmounts(requestedAmount, selection.selected.length)
  } else {
    selectedAmounts = selection.selected.map(() => requestedAmount)
  }

  selection.selected.forEach((item, index) => {
    mergeUpdate(updatesById, item.id, {
      ...metadataPatch,
      amount: selectedAmounts[index],
    })
  })

  let seriesTotalAfter
  if (selection.descriptor.kind === 'installment') {
    const selectedAmountById = new Map(
      selection.selected.map((item, index) => [item.id, selectedAmounts[index]]),
    )

    seriesTotalAfter = sumAmounts(
      selection.members.map((item) => ({
        amount: selectedAmountById.has(item.id) ? selectedAmountById.get(item.id) : item.amount,
      })),
    )

    selection.members.forEach((item) => {
      mergeUpdate(updatesById, item.id, {
        originalAmount: seriesTotalAfter,
      })
    })
  } else {
    const selectedIds = new Set(selection.selected.map((item) => item.id))
    seriesTotalAfter = sumAmounts(
      selection.members.map((item) => ({
        amount: selectedIds.has(item.id) ? requestedAmount : item.amount,
      })),
    )
  }

  return {
    action: 'edit',
    descriptor: selection.descriptor,
    scope,
    updates: [...updatesById.entries()].map(([id, data]) => ({
      id,
      data,
    })),
    deletes: [],
    summary: {
      affectedCount: selection.selected.length,
      memberCount: selection.members.length,
      selectedTotalBefore: selection.selectedTotal,
      selectedTotalAfter: sumAmounts(selectedAmounts.map((amount) => ({ amount }))),
      seriesTotalBefore: selection.seriesTotal,
      seriesTotalAfter,
    },
  }
}

export function buildSeriesDeletePlan({ transactions = [], anchor, scope = SERIES_SCOPE.SINGLE }) {
  const selection = getSeriesSelection({
    transactions,
    anchor,
    scope,
  })
  const updatesById = new Map()
  const remainingTotal = sumAmounts(selection.remaining)

  if (selection.descriptor.kind === 'installment') {
    selection.remaining.forEach((item, index) => {
      mergeUpdate(updatesById, item.id, {
        installmentNum: index + 1,
        installmentOf: selection.remaining.length,
        originalAmount: remainingTotal,
      })
    })
  }

  if (selection.descriptor.kind === 'recurring') {
    selection.remaining.forEach((item, index) => {
      mergeUpdate(updatesById, item.id, {
        recurringNum: index + 1,
        recurringOf: selection.remaining.length,
      })
    })
  }

  return {
    action: 'delete',
    descriptor: selection.descriptor,
    scope,
    updates: [...updatesById.entries()].map(([id, data]) => ({
      id,
      data,
    })),
    deletes: selection.selected.map((item) => item.id),
    summary: {
      affectedCount: selection.selected.length,
      memberCount: selection.members.length,
      removedTotal: selection.selectedTotal,
      remainingCount: selection.remaining.length,
      remainingTotal,
      seriesTotalBefore: selection.seriesTotal,
    },
  }
}

export function getSeriesScopeLabels(descriptor = {}) {
  const installment = descriptor.kind === 'installment'

  return [
    {
      value: SERIES_SCOPE.SINGLE,
      label: installment ? 'Somente esta parcela' : 'Somente este lançamento',
      helper: 'Altera ou remove apenas o item selecionado.',
    },
    {
      value: SERIES_SCOPE.FOLLOWING,
      label: installment ? 'Esta parcela e as próximas' : 'Este lançamento e os próximos',
      helper: 'Mantém intactos os registros anteriores.',
    },
    {
      value: SERIES_SCOPE.ALL,
      label: installment ? 'Toda a compra parcelada' : 'Toda a recorrência',
      helper: 'Aplica a operação em todos os registros da série.',
    },
  ]
}
