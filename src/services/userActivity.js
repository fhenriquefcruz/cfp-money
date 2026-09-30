import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000
const MIN_PULSE_GAP_MS = 30 * 1000

function parseAuthDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function recordUserActivity(user) {
  if (!user?.uid) return

  const lastSignInAt = parseAuthDate(user.metadata?.lastSignInTime)
  const payload = {
    lastSeenAt: serverTimestamp(),
  }

  if (lastSignInAt) {
    payload.lastSignInAt = lastSignInAt
  }

  await setDoc(doc(db, 'users', user.uid), payload, { merge: true })
}

export function startUserActivityTracking(user) {
  if (!user?.uid || typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  let stopped = false
  let lastPulseAt = 0
  let retryTimer = null

  const pulse = async ({ force = false } = {}) => {
    if (stopped || document.visibilityState !== 'visible') return

    const now = Date.now()
    if (!force && now - lastPulseAt < MIN_PULSE_GAP_MS) return

    lastPulseAt = now

    try {
      await recordUserActivity(user)
    } catch {
      if (!stopped && !retryTimer) {
        retryTimer = window.setTimeout(() => {
          retryTimer = null
          pulse({ force: true })
        }, 3_000)
      }
    }
  }

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      pulse({ force: true })
    }
  }

  const handleFocus = () => pulse()

  pulse({ force: true })

  const intervalId = window.setInterval(() => pulse(), HEARTBEAT_INTERVAL_MS)
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('focus', handleFocus)

  return () => {
    stopped = true
    window.clearInterval(intervalId)
    if (retryTimer) window.clearTimeout(retryTimer)
    document.removeEventListener('visibilitychange', handleVisibility)
    window.removeEventListener('focus', handleFocus)
  }
}
