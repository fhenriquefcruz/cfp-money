import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'

export function startUserActivityTracking(user) {
  const pulse = () => {
    if (document.hidden) return
    setDoc(
      doc(db, 'users', user.uid),
      {
        lastSeenAt: serverTimestamp(),
        lastSignInAt: new Date(user.metadata.lastSignInTime || user.metadata.creationTime),
      },
      { merge: true },
    ).catch(() => {})
  }

  pulse()
  const intervalId = setInterval(pulse, 120000)
  return () => clearInterval(intervalId)
}
