// src/services/firebase.js
// Firebase configuration — use .env for credentials

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// ═══════════════════════════════════════
// AUTH HELPERS
// ═══════════════════════════════════════

// Google Sign In
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return signInWithPopup(auth, provider)
}

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

// Phone Auth — setup recaptcha and send code
export const setupRecaptcha = (elementId) => {
  window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
    size: 'invisible',
    callback: () => {},
  })
  return window.recaptchaVerifier
}

export const sendPhoneCode = (phoneNumber, recaptchaVerifier) =>
  signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)

// Sign Out
export const logOut = () => signOut(auth)

// Auth Observer
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback)

// ═══════════════════════════════════════
// FIRESTORE HELPERS
// ═══════════════════════════════════════

// Get user's collection reference
export const userCol = (userId, colName) =>
  collection(db, 'users', userId, colName)

export const userDoc = (userId, colName, docId) =>
  doc(db, 'users', userId, colName, docId)

// ── TRANSACTIONS ──
export const getTransactions = async (userId, filters = {}) => {
  let q = query(
    userCol(userId, 'transactions'),
    orderBy('date', 'desc')
  )
  if (filters.limit) q = query(q, limit(filters.limit))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const addTransaction = async (userId, data) => {
  return addDoc(userCol(userId, 'transactions'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export const updateTransaction = async (userId, txId, data) => {
  return updateDoc(userDoc(userId, 'transactions', txId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export const deleteTransaction = async (userId, txId) =>
  deleteDoc(userDoc(userId, 'transactions', txId))

// Real-time listener for transactions
export const onTransactionsChange = (userId, callback) => {
  const q = query(
    userCol(userId, 'transactions'),
    orderBy('date', 'desc'),
    limit(500)
  )
  return onSnapshot(q, snap => {
    const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(txs)
  })
}

// ── CATEGORIES ──
export const getCategories = async (userId) => {
  const snap = await getDocs(userCol(userId, 'categories'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const addCategory = (userId, data) =>
  addDoc(userCol(userId, 'categories'), {
    ...data,
    createdAt: serverTimestamp(),
  })

export const updateCategory = (userId, catId, data) =>
  updateDoc(userDoc(userId, 'categories', catId), data)

export const deleteCategory = (userId, catId) =>
  deleteDoc(userDoc(userId, 'categories', catId))

// ── GOALS ──
export const getGoals = async (userId) => {
  const snap = await getDocs(userCol(userId, 'goals'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const addGoal = (userId, data) =>
  addDoc(userCol(userId, 'goals'), {
    ...data,
    currentAmount: 0,
    createdAt: serverTimestamp(),
  })

export const updateGoal = (userId, goalId, data) =>
  updateDoc(userDoc(userId, 'goals', goalId), {
    ...data,
    updatedAt: serverTimestamp(),
  })

export const deleteGoal = (userId, goalId) =>
  deleteDoc(userDoc(userId, 'goals', goalId))

// ── BUDGETS ──
export const getBudgets = async (userId) => {
  const snap = await getDocs(userCol(userId, 'budgets'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const setBudget = async (userId, categoryId, amount) => {
  const ref = userDoc(userId, 'budgets', categoryId)
  return setDoc(ref, { categoryId, amount, updatedAt: serverTimestamp() }, { merge: true })
}

export const deleteBudget = (userId, categoryId) =>
  deleteDoc(userDoc(userId, 'budgets', categoryId))

// ── USER SETTINGS ──
export const getUserSettings = async (userId) => {
  const ref = doc(db, 'users', userId, 'settings', 'preferences')
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : {}
}

export const saveUserSettings = (userId, settings) =>
  setDoc(
    doc(db, 'users', userId, 'settings', 'preferences'),
    { ...settings, updatedAt: serverTimestamp() },
    { merge: true }
  )

// ── SEED DEFAULT CATEGORIES ──
export const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: '🍔', color: '#f97316', type: 'expense' },
  { name: 'Transporte', icon: '🚗', color: '#3b82f6', type: 'expense' },
  { name: 'Moradia', icon: '🏠', color: '#f59e0b', type: 'expense' },
  { name: 'Saúde', icon: '❤️', color: '#10b981', type: 'expense' },
  { name: 'Educação', icon: '📚', color: '#06b6d4', type: 'expense' },
  { name: 'Lazer', icon: '🎮', color: '#8b5cf6', type: 'expense' },
  { name: 'Roupas', icon: '👕', color: '#ec4899', type: 'expense' },
  { name: 'Tecnologia', icon: '💻', color: '#6366f1', type: 'expense' },
  { name: 'Outros', icon: '📦', color: '#6b7280', type: 'expense' },
  { name: 'Salário', icon: '💰', color: '#22c55e', type: 'income' },
  { name: 'Freelance', icon: '🖥️', color: '#0ea5e9', type: 'income' },
  { name: 'Investimentos', icon: '📈', color: '#a855f7', type: 'income' },
  { name: 'Outros (receita)', icon: '✅', color: '#14b8a6', type: 'income' },
]

export const seedDefaultCategories = async (userId) => {
  const existing = await getCategories(userId)
  if (existing.length > 0) return
  const promises = DEFAULT_CATEGORIES.map(cat =>
    addDoc(userCol(userId, 'categories'), { ...cat, isDefault: true, createdAt: serverTimestamp() })
  )
  return Promise.all(promises)
}

export { Timestamp, serverTimestamp }
