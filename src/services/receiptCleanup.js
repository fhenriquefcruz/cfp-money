// Recuperação idempotente dos fragmentos após a exclusão de transações.
// A fila foi salva junto com a exclusão financeira, portanto sobrevive
// ao fechamento da aba e é retomada na próxima sessão autenticada.
import {
  arrayRemove,
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  where,
} from 'firebase/firestore'
import { db } from './firebase'

const CHUNKS_PER_PASS = 12
const PASSES_PER_TRANSACTION = 7
const running = new Map()

const chunksRef = (uid) => collection(db, 'users', uid, 'transactionAttachmentChunks')
const jobsRef = (uid) => collection(db, 'users', uid, 'attachmentCleanupJobs')
const transactionRef = (uid, id) => doc(db, 'users', uid, 'transactions', id)

function finishJobItem(operation, ref, ids, id) {
  if (ids.length === 1) operation.delete(ref)
  else operation.update(ref, { txIds: arrayRemove(id) })
}

async function cleanOne(uid, jobRef, txId) {
  if (typeof txId !== 'string' || !txId) throw new Error('Identificador inválido na fila.')
  for (let pass = 0; pass < PASSES_PER_TRANSACTION; pass++) {
    const snapshot = await getDocs(
      query(chunksRef(uid), where('txId', '==', txId), limit(CHUNKS_PER_PASS)),
    )
    const complete = await runTransaction(db, async (operation) => {
      // Todas as leituras ocorrem antes de qualquer exclusão.
      const job = await operation.get(jobRef)
      if (!job.exists()) return true
      const ids = job.data().txIds
      if (!Array.isArray(ids) || !ids.includes(txId)) return true
      const parent = await operation.get(transactionRef(uid, txId))
      const fragmentReads = await Promise.all(snapshot.docs.map((item) => operation.get(item.ref)))

      // Nunca apagar comprovantes se o lançamento ainda existir ou foi restaurado.
      if (parent.exists()) {
        finishJobItem(operation, jobRef, ids, txId)
        return true
      }
      snapshot.docs.forEach((item, index) => {
        if (fragmentReads[index].exists()) operation.delete(item.ref)
      })
      if (snapshot.docs.length < CHUNKS_PER_PASS) {
        finishJobItem(operation, jobRef, ids, txId)
        return true
      }
      return false
    })
    if (complete) return true
  }
  // Limite de leitura/gravação por sessão: o job permanece para retomada.
  return false
}

async function resume(uid) {
  const snapshot = await getDocs(query(jobsRef(uid), limit(3)))
  let completed = 0
  let pending = 0
  for (const job of snapshot.docs) {
    const ids = job.data().txIds
    if (!Array.isArray(ids)) throw new Error('Fila de limpeza inválida.')
    // Bounded work: nunca iniciar centenas de leituras em um login.
    for (const id of ids.slice(0, 8)) {
      if (await cleanOne(uid, job.ref, id)) completed++
      else pending++
    }
  }
  return { completed, pending }
}

export function resumeReceiptCleanup(uid) {
  if (!uid) return Promise.resolve({ completed: 0, pending: 0 })
  if (running.has(uid)) return running.get(uid)
  const task = resume(uid).finally(() => running.delete(uid))
  running.set(uid, task)
  return task
}
