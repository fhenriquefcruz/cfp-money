import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  attachments: [],
  committed: [],
  failCommit: false,
  exists: true,
}))

vi.mock('./firebase', () => ({ db: {} }))

vi.mock('firebase/firestore', () => ({
  collection: () => ({ kind: 'chunks' }),
  doc: (...args) => (args.length === 1 ? { id: 'attachment-new' } : { args }),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
  runTransaction: async (_db, callback) => {
    const operations = { sets: [], updates: [], deletes: [] }
    const result = await callback({
      get: async () => ({
        exists: () => state.exists,
        data: () => ({ attachments: state.attachments }),
      }),
      set: (...args) => operations.sets.push(args),
      update: (...args) => operations.updates.push(args),
      delete: (...args) => operations.deletes.push(args),
    })
    if (state.failCommit) throw new Error('Conexão interrompida')
    state.committed.push(operations)
    return result
  },
}))

import { removeTransactionAttachment, uploadTransactionAttachment } from './transactionAttachments'

const fakeFile = {
  name: 'comprovante.pdf',
  size: 3,
  arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
}
const existing = (count) => Array.from({ length: count }, (_, index) => ({ id: `saved-${index}` }))

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  state.attachments = []
  state.committed = []
  state.failCommit = false
  state.exists = true
})

afterEach(() => vi.unstubAllGlobals())

describe('Ciclo atômico de comprovantes', () => {
  it('bloqueia o sétimo arquivo sem gravar nenhum fragmento', async () => {
    state.attachments = existing(6)
    await expect(uploadTransactionAttachment('uid-1', 'tx-1', fakeFile)).rejects.toThrow(
      'Limite de seis arquivos por transação.',
    )
    expect(state.committed).toHaveLength(0)
  })

  it('adiciona fragmentos e metadados numa única transação', async () => {
    state.attachments = existing(5)
    const uploaded = await uploadTransactionAttachment('uid-1', 'tx-1', fakeFile)
    expect(uploaded.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(state.committed).toHaveLength(1)
    const [change] = state.committed
    expect(change.sets).toHaveLength(1)
    expect(change.sets[0][1]).toMatchObject({ txId: 'tx-1', attachmentId: uploaded.id })
    expect(change.updates).toHaveLength(1)
    expect(change.updates[0][1].attachments).toEqual([...state.attachments, uploaded])
    expect(change.deletes).toHaveLength(0)
  })

  it('não persiste fragmentos se a transação falhar', async () => {
    state.failCommit = true
    await expect(uploadTransactionAttachment('uid-1', 'tx-1', fakeFile)).rejects.toThrow(
      'Conexão interrompida',
    )
    expect(state.committed).toHaveLength(0)
  })

  it('apaga os fragmentos e o registro juntos ao excluir um comprovante', async () => {
    const stored = { id: 'attachment-1', chunkCount: 2, name: 'arquivo.pdf' }
    state.attachments = [...existing(1), stored]
    await removeTransactionAttachment('uid-1', 'tx-1', stored)
    expect(state.committed).toHaveLength(1)
    const [change] = state.committed
    expect(change.deletes).toHaveLength(2)
    expect(change.updates[0][1].attachments).toEqual(existing(1))
    expect(change.sets).toHaveLength(0)
  })

  it('mantém os metadados quando a exclusão falha', async () => {
    state.attachments = [{ id: 'attachment-1', chunkCount: 1 }]
    state.failCommit = true
    await expect(
      removeTransactionAttachment('uid-1', 'tx-1', { id: 'attachment-1' }),
    ).rejects.toThrow('Conexão interrompida')
    expect(state.committed).toHaveLength(0)
  })
})
