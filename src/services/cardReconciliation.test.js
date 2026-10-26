import { beforeEach, expect, test, vi } from 'vitest'

const state = vi.hoisted(() => ({
  transactions: new Map(),
  cards: new Map(),
  writes: [],
  failCommit: false,
}))

vi.mock('./firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db, ...parts) => ({ path: parts, id: parts.at(-1) }),
  deleteField: () => ({ deleted: true }),
  serverTimestamp: () => 'SERVER_TIME',
  runTransaction: async (_db, callback) => {
    const pending = []
    const result = await callback({
      get: async (reference) => {
        const [, , collection, id] = reference.path
        const entry = (collection === 'creditCards' ? state.cards : state.transactions).get(id)
        return { id, exists: () => !!entry, data: () => ({ ...entry }) }
      },
      update: (reference, changes) => pending.push({ reference, changes }),
    })
    if (state.failCommit) throw new Error('offline')
    for (const { reference, changes } of pending) {
      const id = reference.id
      const next = { ...state.transactions.get(id) }
      for (const [key, value] of Object.entries(changes)) {
        if (value?.deleted) delete next[key]
        else next[key] = value
      }
      state.transactions.set(id, next)
      state.writes.push({ id, changes })
    }
    return result
  },
}))

import { confirmCardReconciliation, undoCardReconciliation } from './cardReconciliation'

beforeEach(() => {
  state.cards = new Map([
    ['real-id', { id: null, name: 'Cartão legado', last4: '4321', closingDay: 8, dueDay: 15 }],
  ])
  state.transactions = new Map([
    [
      'legacy',
      {
        type: 'expense',
        paymentMethod: 'credit_card',
        date: '2026-08-15',
        amount: 289.45,
        categoryId: 'expenses',
        installmentNum: 2,
        installmentOf: 3,
        notes: 'Compra antiga',
      },
    ],
  ])
  state.writes = []
  state.failCommit = false
})

test('usa ID real do documento e preserva valor, parcela, categoria e data', async () => {
  const result = await confirmCardReconciliation('user-1', 'legacy', 'real-id')
  const data = state.transactions.get('legacy')
  expect(result).toEqual({ txId: 'legacy', cardId: 'real-id', invoiceMonth: '2026-08' })
  expect(data).toMatchObject({
    cardId: 'real-id',
    cardLast4: '4321',
    amount: 289.45,
    date: '2026-08-15',
    installmentNum: 2,
    installmentOf: 3,
    categoryId: 'expenses',
    notes: 'Compra antiga',
  })
  expect(state.writes).toHaveLength(1)
})

test('desfaz o vínculo restituindo inclusive a ausência original dos campos', async () => {
  await confirmCardReconciliation('user-1', 'legacy', 'real-id')
  await undoCardReconciliation('user-1', 'legacy')
  const data = state.transactions.get('legacy')
  expect(data.cardId).toBeUndefined()
  expect(data.invoiceMonth).toBeUndefined()
  expect(data.cardReconciliation).toBeUndefined()
  expect(data.amount).toBe(289.45)
  expect(state.writes).toHaveLength(2)
})

test('preserva atributos legados presentes antes da associação ao desfazer', async () => {
  state.transactions.get('legacy').cardName = 'Cartão informado anteriormente'
  state.transactions.get('legacy').isCreditPurchase = false
  await confirmCardReconciliation('user-1', 'legacy', 'real-id')
  await undoCardReconciliation('user-1', 'legacy')
  expect(state.transactions.get('legacy').cardName).toBe('Cartão informado anteriormente')
  expect(state.transactions.get('legacy').isCreditPurchase).toBe(false)
})

test('recusa reatribuição duplicada e não emite escrita', async () => {
  await confirmCardReconciliation('user-1', 'legacy', 'real-id')
  await expect(confirmCardReconciliation('user-1', 'legacy', 'real-id')).rejects.toThrow('anterior')
  expect(state.writes).toHaveLength(1)
})

test('rejeita cartão inexistente sem alterar a transação', async () => {
  await expect(confirmCardReconciliation('user-1', 'legacy', 'unknown')).rejects.toThrow(
    'encontrado',
  )
  expect(state.transactions.get('legacy').cardId).toBeUndefined()
  expect(state.writes).toHaveLength(0)
})

test('retém o estado original se o commit falhar', async () => {
  state.failCommit = true
  await expect(confirmCardReconciliation('user-1', 'legacy', 'real-id')).rejects.toThrow('offline')
  expect(state.transactions.get('legacy').cardId).toBeUndefined()
  expect(state.writes).toHaveLength(0)
})

test('não desfaz uma associação cujo cartão foi alterado por outra ação', async () => {
  await confirmCardReconciliation('user-1', 'legacy', 'real-id')
  state.transactions.get('legacy').cardId = 'different'
  await expect(undoCardReconciliation('user-1', 'legacy')).rejects.toThrow('reversível')
  expect(state.transactions.get('legacy').cardId).toBe('different')
})

test('recusa desfazer se a competência do vínculo foi editada posteriormente', async () => {
  await confirmCardReconciliation('user-1', 'legacy', 'real-id')
  state.transactions.get('legacy').invoiceMonth = '2026-09'
  await expect(undoCardReconciliation('user-1', 'legacy')).rejects.toThrow('reversível')
  expect(state.transactions.get('legacy').invoiceMonth).toBe('2026-09')
})

test('exige nova confirmação se os dados de vencimento mudaram após a prévia', async () => {
  await expect(confirmCardReconciliation('user-1', 'legacy', 'real-id', '2026-10')).rejects.toThrow(
    'Competência alterada',
  )
  expect(state.writes).toHaveLength(0)
})
