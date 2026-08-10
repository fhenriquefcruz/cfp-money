import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import { LEGAL_VERSIONS } from '../content/legal'

const userRef = (uid) => doc(db, 'users', uid)
const legalRef = (uid) => doc(db, 'users', uid, 'privacyPreferences', 'legal')
const deletionRef = (uid) => doc(db, 'users', uid, 'privacyRequests', 'accountDeletion')

const knownCollections = [
  'transactions',
  'creditCards',
  'invoiceEvents',
  'goals',
  'budgets',
  'notificationSettings',
  'notificationQueue',
  'privacyPreferences',
  'privacyRequests',
]

function serialize(value) {
  if (value == null) return value
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString()
  }
  if (Array.isArray(value)) return value.map(serialize)
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]))
  }
  return value
}

async function readCollection(uid, name) {
  const snapshot = await getDocs(collection(db, 'users', uid, name))
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...serialize(item.data()),
  }))
}

export async function getSparkPrivacyStatus(uid) {
  const [legalSnapshot, deletionSnapshot] = await Promise.all([
    getDoc(legalRef(uid)),
    getDoc(deletionRef(uid)),
  ])

  const legal = legalSnapshot.exists() ? serialize(legalSnapshot.data()) : null
  const deletionRequest = deletionSnapshot.exists() ? serialize(deletionSnapshot.data()) : null

  return {
    requiresAcceptance:
      legal?.termsVersion !== LEGAL_VERSIONS.terms ||
      legal?.privacyVersion !== LEGAL_VERSIONS.privacy,
    legal,
    deletionRequest,
    mode: 'spark',
  }
}

export async function recordSparkLegalAcceptance(uid, data) {
  if (!data?.accepted) {
    throw new Error('Confirme a leitura e a aceitação dos documentos.')
  }

  await setDoc(
    legalRef(uid),
    {
      accepted: true,
      termsVersion: data.termsVersion,
      privacyVersion: data.privacyVersion,
      acceptedAt: serverTimestamp(),
      mode: 'spark',
    },
    { merge: true },
  )

  return { ok: true }
}

export async function exportSparkData(uid) {
  const [
    userSnapshot,
    subscriptionSnapshot,
    categoriesSnapshot,
    supportRequestsSnapshot,
    ...groups
  ] = await Promise.all([
    getDoc(userRef(uid)),
    getDoc(doc(db, 'notificationSubscribers', uid)),
    getDocs(query(collection(db, 'categories'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'supportRequests'), where('uid', '==', uid))),
    ...knownCollections.map((name) => readCollection(uid, name)),
  ])

  return {
    exportedAt: new Date().toISOString(),
    mode: 'spark',
    user: userSnapshot.exists() ? serialize(userSnapshot.data()) : null,
    notificationSubscription: subscriptionSnapshot.exists()
      ? serialize(subscriptionSnapshot.data())
      : null,
    categories: categoriesSnapshot.docs.map((item) => ({
      id: item.id,
      ...serialize(item.data()),
    })),
    supportRequests: supportRequestsSnapshot.docs.map((item) => ({
      id: item.id,
      ...serialize(item.data()),
    })),
    collections: Object.fromEntries(knownCollections.map((name, index) => [name, groups[index]])),
  }
}

export async function requestSparkAccountDeletion(uid, confirmation) {
  if (confirmation !== 'EXCLUIR MINHA CONTA') {
    throw new Error('Digite exatamente EXCLUIR MINHA CONTA.')
  }

  await setDoc(
    deletionRef(uid),
    {
      status: 'pending-manual',
      requestedAt: serverTimestamp(),
      mode: 'spark',
      note: 'Solicitação registrada para processamento manual.',
    },
    { merge: true },
  )

  return { ok: true }
}

export async function cancelSparkAccountDeletion(uid) {
  await deleteDoc(deletionRef(uid))
  return { ok: true }
}
