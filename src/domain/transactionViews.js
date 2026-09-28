export const MAX_SAVED_TRANSACTION_VIEWS = 6

const DEFAULT_FILTERS = Object.freeze({
  typeFilter: 'all',
  catFilter: 'all',
  payFilter: 'all',
  paymentStatusFilter: 'all',
  datePreset: '',
  dateRange: { from: '', to: '' },
})

const normalizeText = (value, fallback = '') => {
  const text = String(value ?? '').trim()
  return text || fallback
}

export function buildSavedTransactionViewsStorageKey(userId) {
  const uid = normalizeText(userId)
  return uid ? `meu-real:transaction-views:${uid}` : ''
}

export function normalizeTransactionViewFilters(filters = {}) {
  return {
    typeFilter: normalizeText(filters.typeFilter, DEFAULT_FILTERS.typeFilter),
    catFilter: normalizeText(filters.catFilter, DEFAULT_FILTERS.catFilter),
    payFilter: normalizeText(filters.payFilter, DEFAULT_FILTERS.payFilter),
    paymentStatusFilter: normalizeText(
      filters.paymentStatusFilter,
      DEFAULT_FILTERS.paymentStatusFilter,
    ),
    datePreset: normalizeText(filters.datePreset),
    dateRange: {
      from: normalizeText(filters.dateRange?.from),
      to: normalizeText(filters.dateRange?.to),
    },
  }
}

export function createSavedTransactionView(name, filters, existing = []) {
  const trimmedName = normalizeText(name)
  if (!trimmedName) throw new Error('Informe um nome para a visão.')

  const normalizedExisting = Array.isArray(existing) ? existing : []
  if (normalizedExisting.length >= MAX_SAVED_TRANSACTION_VIEWS) {
    throw new Error(`Você pode salvar até ${MAX_SAVED_TRANSACTION_VIEWS} visões.`)
  }

  const now = Date.now()
  return {
    id: `view-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmedName.slice(0, 40),
    filters: normalizeTransactionViewFilters(filters),
    createdAt: new Date(now).toISOString(),
  }
}

export function readSavedTransactionViews(userId, storage) {
  const key = buildSavedTransactionViewsStorageKey(userId)
  if (!key || !storage?.getItem) return []

  try {
    const parsed = JSON.parse(storage.getItem(key) || '[]')
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((view) => view && view.id && view.name)
      .slice(0, MAX_SAVED_TRANSACTION_VIEWS)
      .map((view) => ({
        id: String(view.id),
        name: String(view.name).trim().slice(0, 40),
        filters: normalizeTransactionViewFilters(view.filters),
        createdAt: view.createdAt || null,
      }))
  } catch {
    return []
  }
}

export function writeSavedTransactionViews(userId, views, storage) {
  const key = buildSavedTransactionViewsStorageKey(userId)
  if (!key || !storage?.setItem) return []

  const normalized = (Array.isArray(views) ? views : [])
    .slice(0, MAX_SAVED_TRANSACTION_VIEWS)
    .map((view) => ({
      id: String(view.id),
      name: String(view.name).trim().slice(0, 40),
      filters: normalizeTransactionViewFilters(view.filters),
      createdAt: view.createdAt || null,
    }))

  storage.setItem(key, JSON.stringify(normalized))
  return normalized
}

export function removeSavedTransactionView(views, viewId) {
  return (Array.isArray(views) ? views : []).filter((view) => view.id !== viewId)
}

export { DEFAULT_FILTERS as DEFAULT_TRANSACTION_VIEW_FILTERS }
