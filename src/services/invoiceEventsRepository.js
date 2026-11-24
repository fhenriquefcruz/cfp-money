import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { sameInvoiceOperation, validateInvoiceOperation } from '../domain/invoiceOperation.js'

// A mesma operationId é um único fato financeiro, mesmo sob retry e concorrência.
// A leitura e criação ocorrem na mesma transação Firestore; nunca usar addDoc aqui.
export async function persistInvoiceEventOnce(database, uid, rawEvent) {
  if (typeof uid !== 'string' || !uid.trim() || uid.includes('/')) {
    throw new Error('Identificação da conta inválida.')
  }
  const event = validateInvoiceOperation(rawEvent)
  const ref = doc(database, 'users', uid, 'invoiceEvents', event.operationId)

  await runTransaction(database, async (transaction) => {
    const existing = await transaction.get(ref)
    if (existing.exists()) {
      if (!sameInvoiceOperation(existing.data(), event)) {
        throw new Error('Chave de operação já utilizada com dados diferentes.')
      }
      return
    }
    transaction.set(ref, { ...event, createdAt: serverTimestamp() })
  })

  return ref.id
}
