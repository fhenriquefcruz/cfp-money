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

function prepareReconciliation(original, card, cardId, expectedMonth) {
  if (original.cardReconciliation) throw new Error('Conciliação anterior ainda registrada.')
  const changes = previewCardReconciliation(original, card)
  if (expectedMonth && expectedMonth !== changes.invoiceMonth) {
    throw new Error('Competência alterada. Revise a prévia antes de confirmar.')
  }
  const previous = {}
  const absent = []
  for (const key of fields) {
    if (Object.hasOwn(original, key)) previous[key] = original[key]
    else absent.push(key)
  }
  return {
    ...changes,
    cardReconciliation: { version: 1, cardId, previous, absent, applied: changes },
    updatedAt: serverTimestamp(),
  }
}

export async function confirmCardReconciliation(uid, txId, cardId, expectedMonth) {
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

    const card = {
      ...cardSnapshot.data(),
      id: cardSnapshot.id,
    }
    const changes = prepareReconciliation(transactionSnapshot.data(), card, cardId, expectedMonth)
    operation.update(transactionRef, changes)

    return { txId, cardId, invoiceMonth: changes.invoiceMonth }
  })
}

export async function confirmCardReconciliationBatch(uid, selections, cardId) {
  if (
    !uid ||
    !cardId ||
    !Array.isArray(selections) ||
    !selections.length ||
    selections.length > 30
  ) {
    throw new Error('Selecione de 1 a 30 compras e um cartão.')
  }
  const ids = selections.map((item) => item.txId)
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new Error('A seleção contém compras repetidas ou sem identificação.')
  }
  if (selections.some((item) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.invoiceMonth || ''))) {
    throw new Error('Revise a fatura de cada compra antes de confirmar o lote.')
  }

  return runTransaction(db, async (operation) => {
    const cardRef = ownedDoc(uid, 'creditCards', cardId)
    const transactionRefs = ids.map((id) => ownedDoc(uid, 'transactions', id))
    const [cardSnapshot, ...transactionSnapshots] = await Promise.all([
      operation.get(cardRef),
      ...transactionRefs.map((reference) => operation.get(reference)),
    ])
    if (!cardSnapshot.exists() || transactionSnapshots.some((snapshot) => !snapshot.exists())) {
      throw new Error('Compra ou cartão não encontrado.')
    }
    const card = { ...cardSnapshot.data(), id: cardSnapshot.id }
    const updates = transactionSnapshots.map((snapshot, index) =>
      prepareReconciliation(snapshot.data(), card, cardId, selections[index].invoiceMonth),
    )
    updates.forEach((changes, index) => operation.update(transactionRefs[index], changes))
    return { count: updates.length, cardId }
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
      !metadata.applied ||
      fields.some((key) => transaction[key] !== metadata.applied[key]) ||
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
