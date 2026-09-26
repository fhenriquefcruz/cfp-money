import { describe, expect, test } from 'vitest'
import {
  areTransactionFilterViewsEqual,
  createSavedTransactionFilter,
  normalizeTransactionFilterView,
  upsertSavedTransactionFilter,
} from './transactionFilterViews'

describe('transactionFilterViews', () => {
  test('normaliza somente os filtros relevantes para a lista de transações', () => {
    expect(
      normalizeTransactionFilterView({
        typeFilter: 'expense',
        catFilter: 'food',
        dateRange: { from: '2026-09-01', to: '2026-09-30' },
        sortAsc: true,
      }),
    ).toEqual({
      typeFilter: 'expense',
      catFilter: 'food',
      payFilter: 'all',
      paymentStatusFilter: 'all',
      dateRange: { from: '2026-09-01', to: '2026-09-30' },
      search: '',
      sortAsc: true,
    })
  })

  test('detecta quando a visão salva corresponde aos filtros atuais', () => {
    expect(
      areTransactionFilterViewsEqual(
        { typeFilter: 'expense', dateRange: { from: '', to: '' } },
        { typeFilter: 'expense' },
      ),
    ).toBe(true)
  })

  test('exige nome e limita o rótulo salvo', () => {
    expect(() => createSavedTransactionFilter({ name: '   ' })).toThrow(/nome/i)

    const item = createSavedTransactionFilter({
      id: 'monthly-food',
      name: '  Alimentação mensal  ',
      filters: { catFilter: 'food' },
      createdAt: '2026-09-26T00:00:00.000Z',
    })

    expect(item.name).toBe('Alimentação mensal')
    expect(item.filters.catFilter).toBe('food')
  })

  test('substitui nome repetido e mantém no máximo seis visões', () => {
    const existing = Array.from({ length: 6 }, (_, index) => ({
      id: `view-${index}`,
      name: `Visão ${index}`,
      filters: normalizeTransactionFilterView(),
    }))

    const next = createSavedTransactionFilter({
      id: 'new-view',
      name: 'Visão 2',
      filters: { typeFilter: 'income' },
    })

    const result = upsertSavedTransactionFilter(existing, next)

    expect(result).toHaveLength(6)
    expect(result[0].id).toBe('new-view')
    expect(result.filter((item) => item.name === 'Visão 2')).toHaveLength(1)
  })
})
