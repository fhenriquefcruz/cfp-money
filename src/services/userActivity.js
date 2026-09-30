import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'

export function startUserActivityTracking(user) {
  const reference = doc(db, 'users', user.uid)
  const lastSignInAt = user.metadata?.lastSignInTime
    ? new Date(user.metadata.lastSignInTime)
    : null

  const pulse = () => {
    if (document.hidden) return
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
  const intervalId = setInterval(pulse, 120_000)
  return () => clearInterval(intervalId)
}
