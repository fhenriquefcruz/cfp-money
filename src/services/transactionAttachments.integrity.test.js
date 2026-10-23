import { Blob as NodeBlob } from 'node:buffer'
import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  attachments: [],
  chunks: {},
  transactionExists: true,
}))

vi.mock('./firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: (...args) => ({ path: args }),
  doc: (...args) => ({ path: args }),
  getDoc: async (reference) => {
    const path = reference.path
    if (path[1] === 'users' && path[3] === 'transactions') {
      return {
        exists: () => state.transactionExists,
        data: () => ({ attachments: state.attachments }),
      }
    }
    const entry = state.chunks[path.at(-1)]
    return {
      exists: () => Boolean(entry),
      data: () => entry,
    }
  },
  getDocs: vi.fn(),
  query: vi.fn(),
  runTransaction: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
}))

import { downloadTransactionAttachment } from './transactionAttachments'

const bytes = new Uint8Array([1, 2, 3])
const metadata = { id: 'receipt-1', size: bytes.length, chunkCount: 1 }
const sha256 = async (value) => {
  const hash = await webcrypto.subtle.digest('SHA-256', value)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}
const putChunk = (value, extras = {}) => {
  state.chunks['receipt-1_0'] = {
    txId: 'tx-1',
    attachmentId: 'receipt-1',
    chunkIndex: 0,
    data: btoa(String.fromCharCode(...value)),
    ...extras,
  }
}

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('Blob', NodeBlob)
  state.attachments = [{ ...metadata }]
  state.chunks = {}
  state.transactionExists = true
  putChunk(bytes)
})
afterEach(() => vi.unstubAllGlobals())

describe('Integridade de downloads e comprovantes legados', () => {
  it('aceita anexo atual com SHA-256 correto', async () => {
    state.attachments[0].sha256 = await sha256(bytes)
    const blob = await downloadTransactionAttachment('user-1', 'tx-1', metadata)
    expect(blob.size).toBe(3)
  })

  it('recusa corrupção que mantém o mesmo tamanho', async () => {
    state.attachments[0].sha256 = await sha256(bytes)
    putChunk(new Uint8Array([1, 2, 4]))
    await expect(downloadTransactionAttachment('user-1', 'tx-1', metadata)).rejects.toThrow(
      'SHA-256 divergente',
    )
  })

  it('preserva downloads legados sem checksum', async () => {
    const blob = await downloadTransactionAttachment('user-1', 'tx-1', metadata)
    expect(blob.size).toBe(3)
  })

  it('ignora metadados adulterados que venham da interface', async () => {
    state.attachments[0].sha256 = await sha256(bytes)
    const blob = await downloadTransactionAttachment('user-1', 'tx-1', {
      ...metadata,
      size: 200,
      chunkCount: 12,
      sha256: 'f'.repeat(64),
    })
    expect(blob.size).toBe(3)
  })

  it('rejeita fragmentos que pertencem a outro comprovante', async () => {
    putChunk(bytes, { attachmentId: 'outro-arquivo' })
    await expect(downloadTransactionAttachment('user-1', 'tx-1', metadata)).rejects.toThrow(
      'Comprovante incompleto.',
    )
  })

  it('rejeita metadados persistidos com hash malformado', async () => {
    state.attachments[0].sha256 = 'hash-invalido'
    await expect(downloadTransactionAttachment('user-1', 'tx-1', metadata)).rejects.toThrow(
      'SHA-256 divergente',
    )
  })

  it('rejeita arquivos cujo fragmento está ausente', async () => {
    state.chunks = {}
    await expect(downloadTransactionAttachment('user-1', 'tx-1', metadata)).rejects.toThrow(
      'Comprovante incompleto.',
    )
  })
})
