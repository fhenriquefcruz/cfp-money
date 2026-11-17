import { collection, onSnapshot } from 'firebase/firestore'
import { sortInvoiceEvents } from '../domain/invoiceLifecycle'

// Consulta toda a coleção: orderBy('eventDate') omite legados sem esse campo.
// Preserva o ID/valor de origem e somente ordena a apresentação em memória.
export function subscribeInvoiceEvents(database, uid, callback, onError) {
  if (typeof uid !== 'string' || !uid.trim() || uid.includes('/')) {
    throw new Error('Usuário inválido para consulta de faturas.')
  }
  return onSnapshot(
    collection(database, 'users', uid, 'invoiceEvents'),
    (snapshot) =>
      callback(sortInvoiceEvents(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })))),
    onError,
  )
}
