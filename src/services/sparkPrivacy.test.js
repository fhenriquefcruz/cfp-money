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
  writes: [],
  pendingDeletion: null,
}))

vi.mock('./firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'owner', email: 'owner@example.com' } },
}))
vi.mock('firebase/firestore', () => ({
  collection: (_db, ...path) => ({ path: path.join('/') }),
  doc: (parent, ...path) =>
    path.length
      ? { path: path.join('/'), id: path.at(-1) }
      : { path: `${parent.path}/new-request`, id: 'new-request' },
  query: (reference) => reference,
  where: () => ({}),
  getDocs: async (reference) => ({
    docs: (state.collections[reference.path] || []).map((record) => ({
      id: record.id,
      data: () => ({ ...record.stored }),
    })),
  }),
  getDoc: async (reference) => {
    const pending =
      reference.path === 'users/owner/privacyRequests/accountDeletion' &&
      state.pendingDeletion
    return { exists: () => Boolean(pending), data: () => pending }
  },
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  writeBatch: () => ({
    set: (reference, data) => state.writes.push({ action: 'set', path: reference.path, data }),
    delete: (reference) => state.writes.push({ action: 'delete', path: reference.path }),
    commit: vi.fn().mockResolvedValue(undefined),
  }),
}))

import {
  cancelSparkAccountDeletion,
  exportSparkData,
  requestSparkAccountDeletion,
} from './sparkPrivacy'

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

test('pedido de exclusão chega à fila de atendimento no mesmo lote', async () => {
  state.writes.length = 0
  const result = await requestSparkAccountDeletion('owner', 'EXCLUIR MINHA CONTA')

  expect(result.protocol).toBe('new-request')
  expect(state.writes).toEqual([
    expect.objectContaining({ action: 'set', path: 'users/owner/privacyRequests/accountDeletion' }),
    expect.objectContaining({
      action: 'set',
      path: 'supportRequests/new-request',
      data: expect.objectContaining({
        uid: 'owner',
        category: 'privacy',
        status: 'open',
        protocol: 'new-request',
      }),
    }),
  ])
})

test('cancelamento da exclusão referencia o protocolo original na fila administrativa', async () => {
  state.writes.length = 0
  state.pendingDeletion = { status: 'pending-manual', supportProtocol: 'original123456' }
  const result = await cancelSparkAccountDeletion('owner')
  expect(result.ok).toBe(true)
  expect(state.writes).toEqual([
    expect.objectContaining({
      action: 'delete',
      path: 'users/owner/privacyRequests/accountDeletion',
    }),
    expect.objectContaining({
      action: 'set',
      path: 'supportRequests/new-request',
      data: expect.objectContaining({
        category: 'privacy',
        message: expect.stringContaining('MR-ORIGINAL12'),
      }),
    }),
  ])
  state.pendingDeletion = null
})

test('protege pedidos de privacidade contra UID divergente', async () => {
  state.writes.length = 0
  await expect(requestSparkAccountDeletion('someone-else', 'EXCLUIR MINHA CONTA')).rejects.toThrow(
    'diferente do titular',
  )
  await expect(cancelSparkAccountDeletion('someone-else')).rejects.toThrow(
    'diferente do titular',
  )
  expect(state.writes).toHaveLength(0)
})
