// Retoma, de forma limitada e idempotente, comprovantes de lançamentos removidos.
// A fila é salva atomicamente com a exclusão financeira e sobrevive ao logout.
import { collection, doc, getDocs, limit, query, runTransaction, where } from 'firebase/firestore'
import { db } from './firebase'

const inFlight = new Map()

async function recover(uid) {
  // Até 3 tarefas, 8 transações por tarefa, 7 blocos de 12 fragmentos.
  const jobs = await getDocs(query(collection(db, 'users', uid, 'attachmentCleanupJobs'), limit(3)))
  const chunks = collection(db, 'users', uid, 'transactionAttachmentChunks')
  for (const job of jobs.docs) {
    const pending = job.data().txIds
    if (!Array.isArray(pending)) continue
    for (const txId of pending.slice(0, 8)) {
      if (typeof txId !== 'string' || !txId) continue
      for (let round = 0; round < 7; round++) {
        const fragments = await getDocs(
          query(
            chunks,
            where('txId', '==', txId),
            limit(12),
          ),
        )
        const completed = await runTransaction(db, async (operation) => {
          const current = await operation.get(job.ref)
          const ids = current.exists() && current.data().txIds
          if (!Array.isArray(ids) || !ids.includes(txId)) return true
          const exists = (await operation.get(doc(db, 'users', uid, 'transactions', txId))).exists()
          // Nunca apagar arquivos de uma transação existente ou restaurada.
          if (!exists) fragments.docs.forEach((item) => operation.delete(item.ref))
          const finished = exists || fragments.docs.length < 12
          if (finished) {
            if (ids.length === 1) operation.delete(job.ref)
            else operation.update(job.ref, { txIds: ids.filter((id) => id !== txId) })
          }
          return finished
        })
        if (completed) break
      }
    }
  }
}

export function resumeReceiptCleanup(uid) {
  if (!uid) return
  const active = inFlight.get(uid)
  if (active) return active
  const task = recover(uid).finally(() => inFlight.delete(uid))
  inFlight.set(uid, task)
  return task
}
