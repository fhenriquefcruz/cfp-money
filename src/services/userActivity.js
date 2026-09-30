import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const INTERVAL = 2 * 60 * 1000

export function startUserActivityTracking(user) {
  if (!user?.uid) return () => {}

  const reference = doc(db, 'users', user.uid)
  const lastSignInAt = user.metadata?.lastSignInTime
    ? new Date(user.metadata.lastSignInTime)
    : null

  const pulse = () => {
    if (document.visibilityState !== 'visible') return
    setDoc(
      reference,
      {
        lastSeenAt: serverTimestamp(),
        ...(lastSignInAt ? { lastSignInAt } : {}),
      },
      { merge: true },
    ).catch(() => {})
  }

  pulse()
  const intervalId = setInterval(pulse, INTERVAL)
  document.addEventListener('visibilitychange', pulse)

  return () => {
    clearInterval(intervalId)
    document.removeEventListener('visibilitychange', pulse)
  }
}
