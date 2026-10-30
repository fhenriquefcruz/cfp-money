import { expect, test } from 'vitest'
import {
  filterDashboardFeed,
  getDashboardTransactionTags,
  groupDashboardFeedByDate,
  isDashboardThirdParty,
} from './dashboardBento'

test('extrai etiquetas apenas para apresentação, sem alterar o lançamento original', () => {
  const tx = Object.freeze({ description: 'Compra Cartão Mãe - Cartão 5186', amount: 30 })
  expect(getDashboardTransactionTags(tx)).toEqual(['Cartão Mãe', 'Cartão 5186'])
  expect(isDashboardThirdParty(tx)).toBe(true)
  expect(tx.description).toContain('Cartão Mãe')
})

test('filtros preservam transações sem marcador e respeitam propriedade explícita', () => {
  const rows = [
    { id: 'personal', description: 'Mercado' },
    { id: 'third', isThirdParty: true },
    { id: 'card', description: 'Compra Cartão 5186' },
    { id: 'recurring', isRecurring: true },
  ]
  expect(filterDashboardFeed(rows, 'own').map((tx) => tx.id)).toEqual([
    'personal',
    'card',
    'recurring',
  ])
  expect(filterDashboardFeed(rows, 'third-party').map((tx) => tx.id)).toEqual(['third'])
  expect(filterDashboardFeed(rows, 'card-5186').map((tx) => tx.id)).toEqual(['card'])
  expect(filterDashboardFeed(rows, 'recurring').map((tx) => tx.id)).toEqual(['recurring'])
  expect(filterDashboardFeed(rows, 'all', true)).toHaveLength(3)
})

test('feed agrupa datas da movimentação sem transformar competência de cartão', () => {
  const rows = [
    { id: 'one', date: '2026-10-21' },
    { id: 'two', date: '2026-10-21', invoiceMonth: '2026-11' },
    { id: 'three', date: '2026-10-17' },
  ]
  expect(groupDashboardFeedByDate(rows).map(({ date, items }) => [date, items.length])).toEqual([
    ['2026-10-21', 2],
    ['2026-10-17', 1],
  ])
})
