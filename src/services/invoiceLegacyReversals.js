import { collection, getDocs, query, where } from 'firebase/firestore'

/**
 * Consulta sob demanda: não carrega o código de auditoria no bundle inicial.
 * Os eventos legados são imutáveis após o deploy coordenado das Rules.
 */
export async function readHistoricalInvoiceReversals(database, uid, paymentId, canonicalId) {
  const snapshot = await getDocs(
    query(
      collection(database, 'users', uid, 'invoiceEvents'),
      where('reversesEventId', '==', paymentId),
    ),
  )

  return snapshot.docs
    .filter((item) => item.id !== canonicalId)
    .map((item) => ({ id: item.id, ...item.data() }))
}
