import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'

export function startUserActivityTracking(user) {
  const reference = doc(db, 'users', user.uid)
  const signIn = user.metadata.lastSignInTime

  const pulse = () => {
    if (document.hidden) return
    setDoc(
      reference,
      {
        lastSeenAt: serverTimestamp(),
        ...(signIn ? { lastSignInAt: new Date(signIn) } : {}),
      },
      { merge: true },
    ).catch(() => {})
  }

  pulse()
  const intervalId = setInterval(pulse, 120000)
  return () => clearInterval(intervalId)
}
