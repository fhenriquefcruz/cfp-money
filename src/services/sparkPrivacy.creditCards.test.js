import { expect, test, vi } from 'vitest'

vi.mock('./firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: (_db, ...parts) => ({ path: parts.join('/') }),
  doc: (_db, ...parts) => ({ path: parts.join('/') }),
  query: (reference) => reference,
  where: vi.fn(),
  getDoc: async () => ({ exists: () => false }),
  getDocs: async (reference) => ({
    docs:
      reference.path === 'users/test-user/creditCards'
        ? [
            {
              id: 'firestore-card-id',
              data: () => ({ id: null, name: 'Cartão de teste', last4: '1234' }),
            },
          ]
        : [],
  }),
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}))

import { exportSparkData } from './sparkPrivacy'

test('exporta o ID do documento mesmo quando um cartão antigo armazena id nulo', async () => {
  const exported = await exportSparkData('test-user')
  expect(exported.collections.creditCards).toEqual([
    { id: 'firestore-card-id', name: 'Cartão de teste', last4: '1234' },
  ])
})
