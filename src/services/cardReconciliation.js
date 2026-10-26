import { deleteField, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { previewCardReconciliation } from '../domain/cardReconciliation'

const fields = [
  'cardId',
  'cardName',
  'cardLast4',
  'cardClosingDay',
  'cardDueDay',
  'invoiceMonth',
  'isCreditPurchase',
]
const ownedDoc = (uid, collection, id) => doc(db, 'users', uid, collection, id)

export async function confirmCardReconciliation(uid, txId, cardId) {
  if (!uid || !txId || !cardId) throw new Error('Identificação incompleta.')

  return runTransaction(db, async (operation) => {
    const transactionRef = ownedDoc(uid, 'transactions', txId)
    const cardRef = ownedDoc(uid, 'creditCards', cardId)
    const [transactionSnapshot, cardSnapshot] = await Promise.all([
      operation.get(transactionRef),
      operation.get(cardRef),
    ])
    if (!transactionSnapshot.exists() || !cardSnapshot.exists()) {
      throw new Error('Compra ou cartão não encontrado.')
    }

    const original = transactionSnapshot.data()
    const changes = previewCardReconciliation(original, {
      ...cardSnapshot.data(),
      id: cardSnapshot.id,
    })
    const previous = {}
    const absent = []
    for (const key of fields) {
      if (Object.hasOwn(original, key)) previous[key] = original[key]
      else absent.push(key)
    }

    operation.update(transactionRef, {
      ...changes,
      cardReconciliation: { version: 1, cardId, previous, absent },
      updatedAt: serverTimestamp(),
    })

    return { txId, cardId, invoiceMonth: changes.invoiceMonth }
  })
}

export async function undoCardReconciliation(uid, txId) {
  if (!uid || !txId) throw new Error('Identificação incompleta.')

  return runTransaction(db, async (operation) => {
    const reference = ownedDoc(uid, 'transactions', txId)
    const snapshot = await operation.get(reference)
    if (!snapshot.exists()) throw new Error('Compra não encontrada.')
    const transaction = snapshot.data()
    const metadata = transaction.cardReconciliation

    if (
      metadata?.version !== 1 ||
      !metadata.cardId ||
      metadata.cardId !== transaction.cardId ||
      !Array.isArray(metadata.absent) ||
      !metadata.previous ||
      typeof metadata.previous !== 'object' ||
      metadata.absent.some((key) => !fields.includes(key)) ||
      Object.keys(metadata.previous).some((key) => !fields.includes(key))
    ) {
      throw new Error('Esta compra não possui uma conciliação reversível.')
    }

    operation.update(reference, {
      ...metadata.previous,
      ...Object.fromEntries(metadata.absent.map((key) => [key, deleteField()])),
      cardReconciliation: deleteField(),
      updatedAt: serverTimestamp(),
    })
    return { txId }
  })
}
