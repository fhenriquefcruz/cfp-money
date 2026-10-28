import { expect, test, vi } from 'vitest'

const state = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn() }))

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
  doc: (_db, ...path) => path.join('/'),
  addDoc: async (_collection, data) => {
    state.add(data)
    return { id: 'canonical-generated-id' }
  },
  updateDoc: async (_doc, data) => state.update(data),
  deleteField: () => 'DELETE_FIELD_SENTINEL',
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  getDocs: async () => ({
    docs: [{ id: 'canonical-card-id', data: () => ({ id: null, name: 'Legado' }) }],
  }),
}))

import { addCreditCard, getCreditCards, updateCreditCard } from './firebase'

test('cadastro persiste cartão sem id interno, usando apenas ID gerado pelo Firestore', async () => {
  state.add.mockClear()
  const original = Object.freeze({ id: null, name: 'Novo cartão', closingDay: 15, dueDay: 22 })
  const id = await addCreditCard('test-uid', original)
  expect(id).toBe('canonical-generated-id')
  expect(state.add).toHaveBeenCalledWith({
    name: 'Novo cartão',
    closingDay: 15,
    dueDay: 22,
    createdAt: 'SERVER_TIMESTAMP',
  })
  expect(original.id).toBeNull()
})

test('edição remove id interno antigo sem mudar referência do documento', async () => {
  state.update.mockClear()
  await updateCreditCard('test-uid', 'canonical-card-id', {
    id: 'outdated',
    name: 'Cartão editado',
  })
  expect(state.update).toHaveBeenCalledWith({
    id: 'DELETE_FIELD_SENTINEL',
    name: 'Cartão editado',
    updatedAt: 'SERVER_TIMESTAMP',
  })
})

test('leitura privilegia ID canônico do documento mesmo com id armazenado nulo', async () => {
  expect(await getCreditCards('test-uid')).toEqual([{ id: 'canonical-card-id', name: 'Legado' }])
})
