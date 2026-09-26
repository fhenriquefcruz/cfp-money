export const MAX_SAVED_TRANSACTION_FILTERS = 6

export function normalizeTransactionFilterView(filters = {}) {
  return {
    typeFilter: filters.typeFilter || 'all',
    catFilter: filters.catFilter || 'all',
    payFilter: filters.payFilter || 'all',
    paymentStatusFilter: filters.paymentStatusFilter || 'all',
    dateRange: {
      from: filters.dateRange?.from || '',
      to: filters.dateRange?.to || '',
    },
    search: String(filters.search || '').trim(),
    sortAsc: Boolean(filters.sortAsc),
  }
}

export function areTransactionFilterViewsEqual(a = {}, b = {}) {
  const left = normalizeTransactionFilterView(a)
  const right = normalizeTransactionFilterView(b)

  return JSON.stringify(left) === JSON.stringify(right)
}

export function createSavedTransactionFilter({
  id,
  name,
  filters,
  createdAt = new Date().toISOString(),
} = {}) {
  const normalizedName = String(name || '').trim().replace(/\s+/g, ' ')

  if (!normalizedName) {
    throw new Error('Informe um nome para a visão.')
  }

  return {
    id: id || `view-${Date.now()}`,
    name: normalizedName.slice(0, 40),
    filters: normalizeTransactionFilterView(filters),
    createdAt,
  }
}

export function upsertSavedTransactionFilter(items = [], nextItem) {
  const normalized = Array.isArray(items) ? items.filter(Boolean) : []
  const withoutSameId = normalized.filter((item) => item.id !== nextItem.id)
  const withoutSameName = withoutSameId.filter(
    (item) =>
      String(item.name || '').toLowerCase() !== nextItem.name.toLowerCase(),
  )

  return [nextItem, ...withoutSameName].slice(0, MAX_SAVED_TRANSACTION_FILTERS)
}
