import { expect, test, vi } from 'vitest'

const state = vi.hoisted(() => ({
  collections: {
    'users/owner/creditCards': [
      { id: 'card-canonical', stored: { id: null, name: 'Cartão antigo' } },
    ],
    'users/owner/transactions': [
      {
        id: 'transaction-canonical',
        stored: {
          id: null,
          cardId: 'card-canonical',
          paymentMethod: 'credit_card',
          amount: 125.39,
          date: '2026-10-12',
        },
      },
    ],
    'users/owner/invoiceEvents': [
      { id: 'event-canonical', stored: { id: 'stale-event', cardId: 'card-canonical' } },
    ],
    categories: [{ id: 'category-canonical', stored: { id: null, name: 'Mercado' } }],
    supportRequests: [
      { id: 'support-canonical', stored: { id: 'stale-support', subject: 'Atendimento' } },
    ],
  },
}))

vi.mock('./firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: (_db, ...path) => ({ path: path.join('/') }),
  doc: (_db, ...path) => ({ path: path.join('/') }),
  query: (reference) => reference,
  where: () => ({}),
  getDocs: async (reference) => ({
    docs: (state.collections[reference.path] || []).map((record) => ({
      id: record.id,
      data: () => ({ ...record.stored }),
    })),
  }),
  getDoc: async () => ({ exists: () => false }),
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}))

import { exportSparkData } from './sparkPrivacy'

test('exporta IDs reais dos documentos, nunca nulos nem obsoletos', async () => {
  const result = await exportSparkData('owner')

  expect(result.mode).toBe('spark')
  expect(result.collections.creditCards).toEqual([{ id: 'card-canonical', name: 'Cartão antigo' }])
  expect(result.collections.transactions).toEqual([
    {
      id: 'transaction-canonical',
      cardId: 'card-canonical',
      paymentMethod: 'credit_card',
      amount: 125.39,
      date: '2026-10-12',
    },
  ])
  expect(result.collections.invoiceEvents[0].id).toBe('event-canonical')
  expect(result.categories[0].id).toBe('category-canonical')
  expect(result.supportRequests[0].id).toBe('support-canonical')
})

test('preserva o ID do documento sem criar vínculos artificiais', async () => {
  const result = await exportSparkData('owner')
  expect(result.collections.creditCards[0].id).toBe(result.collections.transactions[0].cardId)
  expect(result.collections.transactions).toHaveLength(1)
  expect(result.collections.creditCards).toHaveLength(1)
  expect(result.collections.transactions[0].amount).toBe(125.39)
  expect(result.collections.transactions[0].date).toBe('2026-10-12')
})
