import { deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import {
  DEFAULT_EMAIL_NOTIFICATION_SETTINGS,
  NOTIFICATION_SETTINGS_VERSION,
  nextTestRequestId,
  normalizeEmailNotificationSettings,
} from '../domain/emailNotifications'

const settingsRef = (uid) => doc(db, 'users', uid, 'notificationSettings', 'email')

const subscriberRef = (uid) => doc(db, 'notificationSubscribers', uid)

const queueRef = (uid, id) => doc(db, 'users', uid, 'notificationQueue', id)

function safeQueueId(value) {
  return encodeURIComponent(String(value).replace(/\//g, '-').slice(0, 400))
}

export async function getEmailNotificationSettings(uid) {
  const snapshot = await getDoc(settingsRef(uid))

  return normalizeEmailNotificationSettings(snapshot.exists() ? snapshot.data() : {})
}

export function onEmailNotificationSettingsChange(uid, callback, onError) {
  return onSnapshot(
    settingsRef(uid),
    (snapshot) =>
      callback(
        normalizeEmailNotificationSettings(
          snapshot.exists() ? snapshot.data() : DEFAULT_EMAIL_NOTIFICATION_SETTINGS,
        ),
      ),
    onError,
  )
}

export async function saveEmailNotificationSettings(uid, settings) {
  const normalized = normalizeEmailNotificationSettings(settings)

  await setDoc(
    settingsRef(uid),
    {
      ...normalized,
      settingsVersion: NOTIFICATION_SETTINGS_VERSION,
      updatedAt: serverTimestamp(),
      consentAt: normalized.enabled
        ? normalized.consentAt || serverTimestamp()
        : normalized.consentAt || null,
    },
    { merge: true },
  )

  if (normalized.enabled) {
    await setDoc(
      subscriberRef(uid),
      {
        uid,
        enabled: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  } else {
    await deleteDoc(subscriberRef(uid)).catch(() => {})
  }

  return normalized
}

export async function requestEmailNotificationTest(uid) {
  const testRequestId = nextTestRequestId()

  await setDoc(
    settingsRef(uid),
    {
      testRequestId,
      testRequestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  await setDoc(
    subscriberRef(uid),
    {
      uid,
      enabled: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  return testRequestId
}

export async function enqueueBudgetNotification(
  uid,
  { categoryId, categoryName, threshold, percentage, spent, limit, monthKey },
) {
  if (!uid || !categoryId || !threshold) return

  const id = safeQueueId(`budget:${monthKey}:${categoryId}:${threshold}`)

  await setDoc(
    queueRef(uid, id),
    {
      type: 'budget',
      categoryId,
      categoryName: categoryName || 'Categoria',
      threshold,
      percentage: Number(percentage || 0),
      spent: Number(spent || 0),
      limit: Number(limit || 0),
      monthKey,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function clearEmailNotificationSettings(uid) {
  await Promise.all([
    deleteDoc(settingsRef(uid)).catch(() => {}),
    deleteDoc(subscriberRef(uid)).catch(() => {}),
  ])
}
