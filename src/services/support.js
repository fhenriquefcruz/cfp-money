import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, db } from './firebase'

export const SUPPORT_CATEGORIES = [
  { value: 'support', label: 'Dúvida sobre o Meu Real' },
  { value: 'technical', label: 'Problema técnico' },
  { value: 'billing', label: 'Pagamento ou assinatura' },
  { value: 'cancellation', label: 'Cancelamento ou arrependimento' },
  { value: 'privacy', label: 'Privacidade e dados pessoais' },
]

const supportCollection = () => collection(db, 'supportRequests')

function normalize(snapshot) {
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => {
      const left = a.createdAt?.toMillis?.() ?? 0
      const right = b.createdAt?.toMillis?.() ?? 0
      return right - left
    })
}

export async function createSupportRequest({ category, subject, message }) {
  const user = auth.currentUser
  if (!user?.uid) throw new Error('Faça login para enviar uma solicitação.')

  const requestRef = doc(supportCollection())

  await setDoc(requestRef, {
    uid: user.uid,
    email: user.email || '',
    protocol: requestRef.id,
    category,
    subject: subject.trim(),
    message: message.trim(),
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return {
    id: requestRef.id,
    protocol: requestRef.id,
  }
}

export function onMySupportRequests(callback, onError) {
  const user = auth.currentUser
  if (!user?.uid) {
    callback([])
    return () => {}
  }

  return onSnapshot(
    query(supportCollection(), where('uid', '==', user.uid)),
    (snapshot) => callback(normalize(snapshot)),
    onError,
  )
}

export function onSupportRequestsAdmin(callback, onError) {
  return onSnapshot(supportCollection(), (snapshot) => callback(normalize(snapshot)), onError)
}

export async function adminRespondSupportRequest(requestId, { status, response }) {
  const user = auth.currentUser
  if (!user?.uid) throw new Error('Sessão administrativa indisponível.')

  await updateDoc(doc(db, 'supportRequests', requestId), {
    status,
    response: response.trim(),
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    responderUid: user.uid,
  })
}
