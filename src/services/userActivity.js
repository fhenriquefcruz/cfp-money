import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const INTERVAL = 2 * 60 * 1000
const MIN_GAP = 30 * 1000

export function startUserActivityTracking(user) {
  if (!user?.uid || typeof window === 'undefined') return () => {}

  let lastPulse = 0
  const reference = doc(db, 'users', user.uid)
  const signIn = user.metadata?.lastSignInTime
  const signInDate = signIn ? new Date(signIn) : null

  const pulse = () => {
    if (document.visibilityState !== 'visible' || Date.now() - lastPulse < MIN_GAP) return
    lastPulse = Date.now()
    const payload = { lastSeenAt: serverTimestamp() }
    if (signInDate && !Number.isNaN(signInDate.getTime())) payload.lastSignInAt = signInDate
    setDoc(reference, payload, { merge: true }).catch(() => {})
  }

  const onVisibility = () => document.visibilityState === 'visible' && pulse()
  pulse()
  const intervalId = window.setInterval(pulse, INTERVAL)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('focus', pulse)

  return () => {
    window.clearInterval(intervalId)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('focus', pulse)
  }
}
