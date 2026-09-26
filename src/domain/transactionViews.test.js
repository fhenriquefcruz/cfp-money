import {
  MAX_SAVED_TRANSACTION_VIEWS,
  buildSavedTransactionViewsStorageKey,
  createSavedTransactionView,
  readSavedTransactionViews,
  removeSavedTransactionView,
  writeSavedTransactionViews,
} from './transactionViews'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

test('isola as visões salvas pelo uid do usuário', () => {
  expect(buildSavedTransactionViewsStorageKey('abc')).toBe('meu-real:transaction-views:abc')
  expect(buildSavedTransactionViewsStorageKey('')).toBe('')
})

test('normaliza, grava e restaura filtros sem persistir busca textual', () => {
  const storage = createStorage()
  const view = createSavedTransactionView('Cartão pendente', {
    typeFilter: 'expense',
    catFilter: 'food',
    payFilter: 'credit_card',
    paymentStatusFilter: 'to_pay',
    dateRange: { from: '2026-09-01', to: '2026-09-30' },
    search: 'não deve persistir',
  })

  writeSavedTransactionViews('user-1', [view], storage)
  const [restored] = readSavedTransactionViews('user-1', storage)

  expect(restored.name).toBe('Cartão pendente')
  expect(restored.filters).toEqual({
    typeFilter: 'expense',
    catFilter: 'food',
    payFilter: 'credit_card',
    paymentStatusFilter: 'to_pay',
    dateRange: { from: '2026-09-01', to: '2026-09-30' },
  })
  expect(restored.filters.search).toBeUndefined()
})

test('limita a quantidade de visões salvas para manter a interface enxuta', () => {
  const existing = Array.from({ length: MAX_SAVED_TRANSACTION_VIEWS }, (_, index) => ({
    id: `view-${index}`,
    name: `Visão ${index}`,
    filters: {},
  }))

  expect(() => createSavedTransactionView('Outra', {}, existing)).toThrow(/até 6 visões/i)
})

test('remove uma visão sem afetar as demais', () => {
  expect(
    removeSavedTransactionView(
      [
        { id: 'a', name: 'A', filters: {} },
        { id: 'b', name: 'B', filters: {} },
      ],
      'a',
    ),
  ).toEqual([{ id: 'b', name: 'B', filters: {} }])
})
