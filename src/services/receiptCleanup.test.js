import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  jobs: new Map(),
  transactions: new Set(),
  chunks: new Map(),
  failCommit: false,
  deleted: [],
}))

vi.mock('./firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  arrayRemove: (id) => ({ removeId: id }),
  collection: (_db, ...parts) => ({ path: parts }),
  doc: (_db, ...parts) => ({ path: parts }),
  where: (_field, _operator, value) => ({ txId: value }),
  limit: (count) => ({ count }),
  query: (source, ...filters) => ({ source, filters }),
  getDocs: async (request) => {
    const type = request.source.path[2]
    const count = request.filters.find((filter) => filter.count)?.count || 100
    if (type === 'attachmentCleanupJobs') {
      const docs = [...state.jobs.entries()].slice(0, count).map(([id, data]) => ({
        ref: { path: ['users', 'uid-1', type, id] },
        data: () => data,
      }))
      return { docs }
    }
    const txId = request.filters.find((filter) => filter.txId)?.txId
    const docs = [...state.chunks.entries()]
      .filter(([, data]) => data.txId === txId)
      .slice(0, count)
      .map(([id, data]) => ({
        ref: { path: ['users', 'uid-1', type, id] },
        data: () => data,
      }))
    return { docs }
  },
  runTransaction: async (_db, callback) => {
    const actions = []
    const result = await callback({
      get: async (ref) => {
        const [, , type, id] = ref.path
        if (type === 'transactions') return { exists: () => state.transactions.has(id) }
        const data = type === 'attachmentCleanupJobs' ? state.jobs.get(id) : state.chunks.get(id)
        return { exists: () => Boolean(data), data: () => data }
      },
      delete: (ref) => actions.push({ kind: 'delete', ref }),
      update: (ref, changes) => actions.push({ kind: 'update', ref, changes }),
    })
    if (state.failCommit) throw new Error('offline')
    for (const action of actions) {
      const [, , type, id] = action.ref.path
      const collection = type === 'attachmentCleanupJobs' ? state.jobs : state.chunks
      if (action.kind === 'delete') {
        collection.delete(id)
        state.deleted.push(id)
      } else {
        const data = collection.get(id)
        collection.set(id, { ...data, ...action.changes })
      }
    }
    return result
  },
}))

import { resumeReceiptCleanup } from './receiptCleanup'

beforeEach(() => {
  state.jobs = new Map([['job-1', { txIds: ['tx-1'] }]])
  state.transactions = new Set()
  state.chunks = new Map([
    ['chunk-1', { txId: 'tx-1' }],
    ['chunk-2', { txId: 'tx-1' }],
  ])
  state.failCommit = false
  state.deleted = []
})

describe('Recuperação dos comprovantes após exclusão', () => {
  it('remove os fragmentos órfãos e conclui a fila persistida', async () => {
    await resumeReceiptCleanup('uid-1')
    expect(state.chunks.size).toBe(0)
    expect(state.jobs.size).toBe(0)
  })

  it('não apaga fragmentos de uma transação existente', async () => {
    state.transactions.add('tx-1')
    await resumeReceiptCleanup('uid-1')
    expect(state.chunks.size).toBe(2)
    expect(state.jobs.size).toBe(0)
  })

  it('preserva os dados e ignora filas malformadas', async () => {
    state.jobs.set('job-1', { txIds: 'inválido' })
    await resumeReceiptCleanup('uid-1')
    expect(state.chunks.size).toBe(2)
    expect(state.jobs.size).toBe(1)
  })

  it('mantém a fila quando uma gravação é interrompida', async () => {
    state.failCommit = true
    await expect(resumeReceiptCleanup('uid-1')).rejects.toThrow('offline')
    expect(state.chunks.size).toBe(2)
    expect(state.jobs.get('job-1').txIds).toEqual(['tx-1'])
    state.failCommit = false
    await resumeReceiptCleanup('uid-1')
    expect(state.jobs.size).toBe(0)
  })

  it('remove o item concluído e preserva os demais no mesmo job', async () => {
    state.jobs.set('job-1', { txIds: ['tx-1', 'tx-2'] })
    state.chunks.set('chunk-3', { txId: 'tx-2' })
    await resumeReceiptCleanup('uid-1')
    expect(state.chunks.size).toBe(0)
    expect(state.jobs.size).toBe(0)
  })

  it('é idempotente em chamadas sucessivas', async () => {
    await resumeReceiptCleanup('uid-1')
    await resumeReceiptCleanup('uid-1')
    expect(state.jobs.size).toBe(0)
  })

  it('processa em blocos e mantém o trabalho não concluído', async () => {
    state.chunks = new Map(
      Array.from({ length: 90 }, (_, i) => [`fragment-${i}`, { txId: 'tx-1' }]),
    )
    await resumeReceiptCleanup('uid-1')
    expect(state.chunks.size).toBe(6)
    expect(state.jobs.size).toBe(1)
    await resumeReceiptCleanup('uid-1')
    expect(state.chunks.size).toBe(0)
    expect(state.jobs.size).toBe(0)
  })
})


it('diagnostica formatação pendente do recuperador', async () => {
  const [{ readFile }, prettier] = await Promise.all([
    import('node:fs/promises'),
    import('prettier'),
  ])
  const original = await readFile('src/services/receiptCleanup.js', 'utf8')
  const formatted = await prettier.format(original, {
    parser: 'babel', semi: false, singleQuote: true, trailingComma: 'all', printWidth: 100,
  })
  const a = original.split('\n')
  const b = formatted.split('\n')
  const changes = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) changes.push({ line: i + 1, current: a[i], expected: b[i] })
    if (changes.length === 12) break
  }
  console.info('PRETTIER_FULL_SOURCE', JSON.stringify(formatted))
})
