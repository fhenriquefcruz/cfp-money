import { beforeEach, expect, test, vi } from 'vitest'

const state = vi.hoisted(() => ({ listeners: [], unsubscribed: [] }))
vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }))
vi.mock('firebase/app-check', () => ({
  initializeAppCheck: vi.fn(),
  ReCaptchaEnterpriseProvider: class {},
}))
vi.mock('firebase/auth', () => ({
  getAuth: () => ({}),
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
}))
vi.mock('../config/firebaseConfig', () => ({ resolveFirebaseConfig: () => ({}) }))
vi.mock('../config/securityRuntime', () => ({
  securityRuntime: { appCheckEnabled: false, appCheckDebug: false },
}))
vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: (_db, ...path) => path.join('/'),
  query: (path, ...filters) => ({ path, filters }),
  where: (...args) => args,
  onSnapshot: (path, next, error) => {
    const listener = { path, next, error }
    state.listeners.push(listener)
    return () => state.unsubscribed.push(listener)
  },
}))

import {
  onBudgetsChange,
  onCategoriesChange,
  onCreditCardsChange,
  onGoalsChange,
} from './firebase'

const snapshot = (...docs) => ({
  docs: docs.map(([id, fields]) => ({ id, data: () => fields })),
})

beforeEach(() => {
  state.listeners.length = 0
  state.unsubscribed.length = 0
})

test.each([
  ['cartões', onCreditCardsChange, 'creditCards'],
  ['metas', onGoalsChange, 'goals'],
  ['orçamentos', onBudgetsChange, 'budgets'],
])('%s: listener isolado por UID e removível', (_name, subscribe, collectionName) => {
  const updates = vi.fn()
  const onError = vi.fn()
  const stop = subscribe('uid-A', updates, onError)
  expect(state.listeners).toHaveLength(1)
  expect(state.listeners[0].path).toBe('users/uid-A/' + collectionName)
  state.listeners[0].next(snapshot(['doc-1', { id: 'legacy', amount: 10 }]))
  expect(updates).toHaveBeenCalledWith([{ id: 'doc-1', amount: 10 }])
  state.listeners[0].error(new Error('offline'))
  expect(onError).toHaveBeenCalledOnce()
  stop()
  expect(state.unsubscribed).toHaveLength(1)
})

test('categorias publicam apenas conjunto completo e mantêm padrão após remoção', () => {
  const updates = vi.fn()
  const stop = onCategoriesChange('uid-A', updates, vi.fn())
  expect(state.listeners).toHaveLength(2)
  expect(state.listeners[0].path).toEqual({
    path: 'categories',
    filters: [['isDefault', '==', true]],
  })
  expect(state.listeners[1].path).toEqual({
    path: 'categories',
    filters: [['ownerUid', '==', 'uid-A']],
  })
  state.listeners[1].next(snapshot(['custom', { name: 'Minha categoria' }]))
  expect(updates).not.toHaveBeenCalled()
  state.listeners[0].next(snapshot(['default', { name: 'Padrão' }]))
  expect(updates).toHaveBeenLastCalledWith([
    { id: 'default', name: 'Padrão' },
    { id: 'custom', name: 'Minha categoria' },
  ])
  state.listeners[1].next(snapshot())
  expect(updates).toHaveBeenLastCalledWith([{ id: 'default', name: 'Padrão' }])
  stop()
  expect(state.unsubscribed).toHaveLength(2)
})
