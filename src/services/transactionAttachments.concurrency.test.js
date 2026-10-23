import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  initialAttachments: [],
  concurrentAttachments: [],
  updates: [],
  deletions: [],
  writes: [],
  commits: 0,
}))

vi.mock('./firebase', () => ({ db: {} }))

vi.mock('firebase/firestore', () => ({
  arrayRemove: vi.fn(),
  collection: () => ({ kind: 'chunks' }),
  doc: (...args) => (args.length === 1 ? { id: 'attachment-new' } : { args }),
  getDoc: async () => ({
    exists: () => true,
    data: () => ({ attachments: state.initialAttachments }),
  }),
  getDocs: vi.fn(),
  query: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
  writeBatch: () => ({
    set: (...args) => state.writes.push(args),
    delete: (...args) => state.deletions.push(args),
    commit: async () => {
      state.commits += 1
    },
  }),
  runTransaction: async (_db, callback) =>
    callback({
      get: async () => ({
        exists: () => true,
        data: () => ({ attachments: state.concurrentAttachments }),
      }),
      update: (...args) => state.updates.push(args),
    }),
}))

import { uploadTransactionAttachment } from './transactionAttachments'

const fakeFile = {
  name: 'comprovante.pdf',
  size: 3,
  arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
}
const existing = (count) => Array.from({ length: count }, (_, index) => ({ id: `saved-${index}` }))

beforeEach(() => {
  state.initialAttachments = []
  state.concurrentAttachments = []
  state.updates = []
  state.deletions = []
  state.writes = []
  state.commits = 0
})

describe('Limite atômico de comprovantes entre sessões', () => {
  it('não publica o sétimo anexo se outra sessão ocupou a última vaga', async () => {
    state.initialAttachments = existing(5)
    state.concurrentAttachments = existing(6)

    await expect(uploadTransactionAttachment('uid-1', 'tx-1', fakeFile)).rejects.toThrow(
      'Limite de seis arquivos por transação.',
    )

    expect(state.updates).toHaveLength(0)
    expect(state.writes).toHaveLength(1)
    expect(state.deletions).toHaveLength(1)
    expect(state.commits).toBe(2)
  })

  it('preserva a lista atualizada e acrescenta o sexto anexo uma única vez', async () => {
    state.initialAttachments = existing(4)
    state.concurrentAttachments = existing(5)

    const uploaded = await uploadTransactionAttachment('uid-1', 'tx-1', fakeFile)

    expect(uploaded.id).toBe('attachment-new')
    expect(state.updates).toHaveLength(1)
    const [parent, updated] = state.updates[0]
    expect(parent).toBeTruthy()
    expect(updated.attachments).toHaveLength(6)
    expect(updated.attachments.slice(0, 5)).toEqual(state.concurrentAttachments)
    expect(updated.attachments[5]).toEqual(uploaded)
    expect(state.deletions).toHaveLength(0)
  })
})
