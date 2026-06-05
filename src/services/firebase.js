// src/services/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth'
// importação do IndexedDB continua igual à que já forneci

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Email/Password Sign In
export const signInEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password)

// Email/Password Register
export const registerEmail = async (email, password, displayName) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(credential.user, { displayName })
  await sendEmailVerification(credential.user)
  return credential
}

// Password Reset
export const resetPassword = (email) =>
  sendPasswordResetEmail(auth, email)

// Sign Out
export const logOut = () => signOut(auth)

// Auth Observer
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback)

// ── IndexedDB helpers (mantenha os que já foram fornecidos anteriormente) ──
// ...
